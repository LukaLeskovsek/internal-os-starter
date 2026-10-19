import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { sl } from "@/lib/i18n/sl";
import { t } from "../strings";

const Result = z.object({
  id: z.uuid(), revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  status: z.enum(["pending", "approved", "rejected"]), requestId: z.uuid(),
});
export type InvoiceCommandResult = z.infer<typeof Result>;
const Command = z.object({
  invoiceId: z.uuid(), requestId: z.uuid(),
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  command: z.enum(["import", "approve", "reject", "reopen", "undo"]),
  payload: z.record(z.string(), z.unknown()),
}).strict();

// This is a transport adapter, not the authority. PostgreSQL enforces the same
// rules for direct data-API callers that do not import this TypeScript module.
export async function executeInvoiceCommand(
  supabase: SupabaseClient, input: z.infer<typeof Command>,
): Promise<ActionResult<InvoiceCommandResult>> {
  const parsed = Command.safeParse(input);
  if (!parsed.success) return fail(t.errors.invalidCommand);
  const c = parsed.data;
  try {
    const { data, error } = await supabase.rpc("invoice_ocr_execute", {
      p_request_id: c.requestId, p_invoice_id: c.invoiceId,
      p_expected_revision: c.revision, p_command: c.command, p_payload: c.payload,
    });
    if (error) {
      switch (error.message) {
        case "invoice_no_access": return fail(sl.errors.noAccess);
        case "invoice_not_found": return fail(t.errors.notFound);
        case "invoice_stale": return fail(t.errors.stale);
        case "invoice_request_conflict": return fail(t.errors.requestConflict);
        case "invoice_transition": return fail(t.errors.transition);
        case "invoice_approval_fields": return fail(t.errors.approvalFields);
        case "invoice_rejection_reason": return fail(t.errors.needReason, { comment: t.errors.needReason });
        case "invoice_invalid_command":
        case "invoice_invalid_fields": return fail(t.errors.invalidCommand);
        default:
          console.error("invoice_ocr command failed", error.code);
          return fail(sl.errors.generic);
      }
    }
    const result = Result.safeParse(data);
    if (!result.success || result.data.id !== c.invoiceId || result.data.requestId !== c.requestId) {
      console.error("invoice_ocr invalid command response");
      return fail(sl.errors.generic);
    }
    return ok(undefined, result.data);
  } catch {
    console.error("invoice_ocr command unavailable");
    return fail(sl.errors.generic);
  }
}
