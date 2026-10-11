// What every Server Action returns. The client turns it into a toast (and field
// errors under inputs) — no redirects with ?ok= / ?error= in the URL.
//
//   return ok("Pot shranjena.");
//   return fail("Vpiši kilometre.");
//   if (!parsed.success) return fromZod(parsed.error);
import type { ZodError } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const initialResult = { ok: true } as ActionResult<never>;

export function ok<T = undefined>(message?: string, data?: T): ActionResult<T> {
  return { ok: true, message, data };
}

export function fail(error: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/** First zod issue as the toast, every issue under its field. */
export function fromZod(err: ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, error: err.issues[0]?.message ?? "Preveri vnos.", fieldErrors };
}
