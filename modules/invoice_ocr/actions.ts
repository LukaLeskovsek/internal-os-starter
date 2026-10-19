"use server";

// invoice_ocr write paths: the "review queue" (Pregledna vrsta) pattern.
//
//   uploadInvoice(formData)        one file in → stored, read by AI, queued as pending
//   decideInvoice(prev, formData)  corrections + approve/reject in ONE call → { nextId }
//   reopenInvoice / undoInvoice    explicit, revision-bound commands
//
// Every action starts with moduleContext() (signed in + granted + module on) and
// returns an ActionResult the client turns into a toast. No redirects for feedback.
// Read policies scope rows to an active, granted owner; all writes are commands.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { moduleContext } from "@/lib/module-context";
import { ok, fail, fromZod, type ActionResult } from "@/lib/action-result";
import { AiDailyLimitError, recordAiUsage } from "@/lib/ai-budget";
import { aiErrorMessage } from "@/lib/ai";
import { sl } from "@/lib/i18n/sl";
import { extractInvoice, emptyInvoiceFields, type InvoiceFields, type LineItem } from "./lib/ocr";
import { parseAmount } from "./lib/invoice-format";
import { MAX_UPLOAD_BYTES, ACCEPTED_TYPES } from "./constants";
import { executeInvoiceCommand, type InvoiceCommandResult } from "./lib/commands";
import { t } from "./strings";

const MODULE = "invoice_ocr";
const BASE = `/m/${MODULE}`;

// ------------------------------------------------------------------ upload

/**
 * One file per call. The client sends several files in parallel (max 3 at a time) and
 * shows a "Berem…" row for each, so a slow AI read never blocks the others.
 */
export async function uploadInvoice(
  formData: FormData,
): Promise<ActionResult<{ id: string; mock: boolean }>> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail(t.upload.noFile);
  const ext = ACCEPTED_TYPES[file.type];
  if (!ext) return fail(t.upload.wrongType);
  if (file.size > MAX_UPLOAD_BYTES) return fail(t.upload.tooBig);

  // Count the AI call BEFORE storing anything, so a hit daily limit leaves no orphan file.
  try {
    await recordAiUsage(supabase, MODULE);
  } catch (e) {
    if (e instanceof AiDailyLimitError) return fail(sl.errors.aiLimit);
    console.error("invoice_ocr usage check failed");
    return fail(aiErrorMessage(e));
  }

  // 1) Keep the original in the private bucket. The path must start with the owner's
  //    id: the storage policies only let a user touch their own folder.
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const stored = await supabase.storage
    .from(MODULE)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (stored.error) {
    console.error("invoice_ocr storage upload failed", stored.error);
    return fail(t.upload.storeFailed);
  }

  // 2) The AI reads it, server-side. No key → a sample invoice (mock), so the flow demos.
  //    A failed read removes the uploaded file and returns an explicit error;
  //    it cannot create a successful-looking invoice with invented fields.
  let extracted: { data: InvoiceFields; lineItems: LineItem[]; raw: string; mock: boolean } = {
    data: emptyInvoiceFields(),
    lineItems: [],
    raw: "",
    mock: false,
  };
  try {
    extracted = await extractInvoice({
      base64: bytes.toString("base64"),
      mime: file.type,
      filename: file.name,
    });
  } catch (e) {
    console.error("invoice_ocr extract failed");
    await supabase.storage.from(MODULE).remove([path]);
    return fail(aiErrorMessage(e));
  }

  // Header and every supplied line commit together through the protected command.
  const result = await executeInvoiceCommand(supabase, {
    requestId: crypto.randomUUID(), invoiceId: crypto.randomUUID(), revision: 0,
    command: "import", payload: {
      ...extracted.data, file_path: path, file_mime: file.type,
      raw_json: { model_output: extracted.raw }, extracted_mock: extracted.mock,
      line_items: extracted.lineItems,
    },
  });
  if (!result.ok) {
    const cleanup = await supabase.storage.from(MODULE).remove([path]);
    if (cleanup.error) console.error("invoice_ocr original cleanup failed");
    return result;
  }

  revalidatePath(BASE);
  // No message: the client shows one summary toast for the whole batch.
  return ok(undefined, { id: result.data!.id, mock: extracted.mock });
}

// ------------------------------------------------------------------ decide

// Empty input → null; otherwise it must parse. Amounts accept "1.250,50" and "1250.50".
const amount = z
  .string()
  .optional()
  .transform((v, c) => {
    const n = parseAmount(v);
    if (Number.isNaN(n)) {
      c.addIssue({ code: "custom", message: t.errors.badAmount });
      return z.NEVER;
    }
    return n;
  });
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, t.errors.tooLong)
    .optional()
    .transform((v) => (v ? v : null));
const date = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), t.errors.badDate);

const DecideSchema = z
  .object({
    id: z.uuid(t.errors.badId),
    revision: z.coerce.number().int().nonnegative(),
    request_id: z.uuid(t.errors.badId),
    decision: z.enum(["approve", "reject"]),
    vendor: text(200),
    invoice_number: text(100),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .optional()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || /^[A-Z]{3}$/.test(v), t.errors.badCurrency),
    issue_date: date,
    due_date: date,
    net_amount: amount,
    tax_amount: amount,
    total_amount: amount,
    comment: text(2000),
  })
  // Approving means "this is ready to pay": it needs at least who and how much.
  // Rejecting needs a reason, so the vendor (or a colleague) knows what to fix.
  .superRefine((v, c) => {
    if (v.decision === "approve") {
      if (!v.vendor) c.addIssue({ code: "custom", path: ["vendor"], message: t.errors.needVendor });
      if (v.total_amount === null)
        c.addIssue({ code: "custom", path: ["total_amount"], message: t.errors.needTotal });
    } else if (!v.comment) {
      c.addIssue({ code: "custom", path: ["comment"], message: t.errors.needReason });
    }
  });

/**
 * The review screen's one form. Saves the person's corrections, the decision and the
 * comment in a single update, then answers with the next invoice still waiting so the
 * client can router.replace() straight to it. nextId null = the queue is empty.
 */
export async function decideInvoice(
  _prev: ActionResult<InvoiceCommandResult & { nextId: string | null }>,
  formData: FormData,
): Promise<ActionResult<InvoiceCommandResult & { nextId: string | null }>> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  const { supabase } = ctx;

  const field = (k: string) => {
    const v = formData.get(k);
    return v === null ? undefined : String(v);
  };
  const parsed = DecideSchema.safeParse({
    id: field("id"),
    revision: field("revision"),
    request_id: field("request_id"),
    decision: field("decision"),
    vendor: field("vendor"),
    invoice_number: field("invoice_number"),
    currency: field("currency"),
    issue_date: field("issue_date"),
    due_date: field("due_date"),
    net_amount: field("net_amount"),
    tax_amount: field("tax_amount"),
    total_amount: field("total_amount"),
    comment: field("comment"),
  });
  if (!parsed.success) return fromZod(parsed.error);
  const { id, decision, revision, request_id, ...fields } = parsed.data;
  const result = await executeInvoiceCommand(supabase, {
    invoiceId: id, revision, requestId: request_id, command: decision, payload: fields,
  });
  if (!result.ok) return result;

  // Continue with the oldest invoice still pending after the decision.
  const { data: queue } = await supabase
    .from("invoice_ocr_invoices")
    .select("id, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(500);
  const pending = queue ?? [];
  const next = pending[0] ?? null;

  revalidatePath(BASE);
  const vendor = fields.vendor ?? t.queue.unknownVendor;
  return ok(
    decision === "approve" ? t.review.approved(vendor) : t.review.rejected(vendor),
    { ...result.data!, nextId: (next?.id as string | undefined) ?? null },
  );
}

// ------------------------------------------------------------------ explicit transitions

export async function reopenInvoice(
  id: string, revision: number, requestId: string,
): Promise<ActionResult<InvoiceCommandResult>> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  const result = await executeInvoiceCommand(ctx.supabase, {
    invoiceId: id, revision, requestId, command: "reopen", payload: {},
  });
  if (result.ok) revalidatePath(BASE);
  return result.ok ? ok(t.done.reopened, result.data) : result;
}

export async function undoInvoice(
  id: string, revision: number, previousRequestId: string, requestId: string,
): Promise<ActionResult<InvoiceCommandResult>> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  const result = await executeInvoiceCommand(ctx.supabase, {
    invoiceId: id, revision, requestId, command: "undo", payload: { request_id: previousRequestId },
  });
  if (result.ok) revalidatePath(BASE);
  return result.ok ? ok(sl.common.saved, result.data) : result;
}
