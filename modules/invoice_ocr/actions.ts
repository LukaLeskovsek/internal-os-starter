"use server";

// invoice_ocr write paths: the "review queue" (Pregledna vrsta) pattern.
//
//   uploadInvoice(formData)        one file in → stored, read by AI, queued as pending
//   decideInvoice(prev, formData)  corrections + approve/reject in ONE call → { nextId }
//   setInvoiceStatus(id, status)   typed button action: "Vrni v pregled" and every undo
//
// Every action starts with moduleContext() (signed in + granted + module on) and
// returns an ActionResult the client turns into a toast. No redirects for feedback.
// RLS ("owner all") scopes every query to the signed-in user's own rows.
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
import { t, type InvoiceStatus } from "./strings";

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

  // 3) The invoice header row, queued for review.
  const d = extracted.data;
  const { data: inserted, error } = await supabase
    .from("invoice_ocr_invoices")
    .insert({
      user_id: user.id,
      file_path: path,
      file_mime: file.type,
      vendor: d.vendor,
      invoice_number: d.invoice_number,
      issue_date: d.issue_date,
      due_date: d.due_date,
      currency: d.currency,
      net_amount: d.net_amount,
      tax_amount: d.tax_amount,
      total_amount: d.total_amount,
      raw_json: { model_output: extracted.raw },
      extracted_mock: extracted.mock,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !inserted) {
    console.error("invoice_ocr insert failed", error);
    await supabase.storage.from(MODULE).remove([path]); // don't leave the file behind
    return fail(t.upload.saveFailed);
  }

  // 4) Line items: one child row per postavka. The header is saved already, so a
  //    hiccup here is logged, not shown: the invoice is still reviewable.
  if (extracted.lineItems.length) {
    const rows = extracted.lineItems.map((li, i) => ({
      invoice_id: inserted.id,
      user_id: user.id,
      line_no: i + 1,
      ...li,
    }));
    const { error: lineErr } = await supabase.from("invoice_ocr_line_items").insert(rows);
    if (lineErr) console.error("invoice_ocr line items insert failed", lineErr);
  }

  revalidatePath(BASE);
  // No message: the client shows one summary toast for the whole batch.
  return ok(undefined, { id: inserted.id as string, mock: extracted.mock });
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
  _prev: ActionResult<{ nextId: string | null }>,
  formData: FormData,
): Promise<ActionResult<{ nextId: string | null }>> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  const { supabase } = ctx;

  const field = (k: string) => {
    const v = formData.get(k);
    return v === null ? undefined : String(v);
  };
  const parsed = DecideSchema.safeParse({
    id: field("id"),
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
  const { id, decision, ...fields } = parsed.data;
  const status: InvoiceStatus = decision === "approve" ? "approved" : "rejected";

  const { data: saved, error } = await supabase
    .from("invoice_ocr_invoices")
    .update({ ...fields, status, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .select("created_at, vendor")
    .maybeSingle();
  if (error) {
    console.error("invoice_ocr decide failed", error);
    return fail(sl.errors.generic);
  }
  if (!saved) return fail(t.errors.notFound);

  // Next in line: the queue runs oldest first, so take the next pending invoice after
  // this one, or wrap to the oldest if this was the last.
  const { data: queue } = await supabase
    .from("invoice_ocr_invoices")
    .select("id, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(500);
  const pending = queue ?? [];
  const next = pending.find((r) => r.created_at > saved.created_at) ?? pending[0] ?? null;

  revalidatePath(BASE);
  const vendor = (saved.vendor as string | null) ?? t.queue.unknownVendor;
  return ok(
    decision === "approve" ? t.review.approved(vendor) : t.review.rejected(vendor),
    { nextId: (next?.id as string | undefined) ?? null },
  );
}

// ------------------------------------------------------------------ status

const StatusSchema = z.object({
  id: z.uuid(t.errors.badId),
  status: z.enum(["pending", "approved", "rejected"]),
});

/**
 * Typed button action. "Vrni v pregled" calls it with "pending"; the undo on that
 * toast (and on the review screen's decision toast) calls it with the old status.
 * The comment and corrected fields stay as they are.
 */
export async function setInvoiceStatus(id: string, status: InvoiceStatus): Promise<ActionResult> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  const parsed = StatusSchema.safeParse({ id, status });
  if (!parsed.success) return fromZod(parsed.error);

  const { data, error } = await ctx.supabase
    .from("invoice_ocr_invoices")
    .update({
      status: parsed.data.status,
      reviewed_at: parsed.data.status === "pending" ? null : new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("invoice_ocr set status failed", error);
    return fail(sl.errors.generic);
  }
  if (!data) return fail(t.errors.notFound);

  revalidatePath(BASE);
  return ok(parsed.data.status === "pending" ? t.done.reopened : sl.common.saved);
}
