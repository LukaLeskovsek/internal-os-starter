import { NextResponse } from "next/server";
import { uploadInvoice } from "@/modules/invoice_ocr/actions";
import { fail } from "@/lib/action-result";
import { sl } from "@/lib/i18n/sl";
import { t } from "@/modules/invoice_ocr/strings";

// POST one invoice file → ActionResult as JSON. A thin wrapper around the
// uploadInvoice Server Action, which still does all the work and all the checks
// (sign-in, module access, type, size, storage path).
//
// Why a route and not the action directly? Next.js runs Server Actions called from
// the browser one at a time, so "3 files in parallel" would really be one after the
// other. Plain fetch() calls to this route run side by side.
export async function POST(request: Request) {
  // Server Actions check the Origin for us; a route must do it itself.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    return NextResponse.json(fail(sl.errors.generic), { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(fail(t.upload.noFile), { status: 400 });
  }

  const result = await uploadInvoice(formData);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
