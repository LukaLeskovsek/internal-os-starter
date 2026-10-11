import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { userCanAccess, moduleIsEnabled } from "@/lib/access";
import { formatDate, formatTime, todayIso } from "@/lib/format";
import { t, type InvoiceStatus } from "@/modules/invoice_ocr/strings";
import { amountInput } from "@/modules/invoice_ocr/lib/invoice-format";

// CSV export of the user's invoices. This is a SEPARATE entry point from the page, so
// it repeats the auth + access check (a member without the module can't fetch it). RLS
// scopes the query to the signed-in user. To support an accounting import, add a new
// ?format=… branch below (e.g. e-SLOG XML or JSON); the rest stays the same.
//
// Made for Excel set to Slovenian: ";" between columns, decimal comma in amounts
// (1250,00, still numbers Excel can sum), Slovenian status labels and 18. 6. 2026 dates.
const MODULE = "invoice_ocr";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!(await userCanAccess(supabase, user.id, MODULE)) || !(await moduleIsEnabled(supabase, MODULE)))
    return new NextResponse("Forbidden", { status: 403 });

  const format = new URL(request.url).searchParams.get("format") ?? "csv";
  if (format !== "csv") return new NextResponse(t.csv.unsupported(format), { status: 400 });

  const { data } = await supabase
    .from("invoice_ocr_invoices")
    .select(
      "vendor, invoice_number, issue_date, due_date, currency, net_amount, tax_amount, total_amount, status, comment, created_at",
    )
    .order("created_at", { ascending: false });
  const rows = data ?? [];

  const date = (v: string | null) => (v ? formatDate(v) : null);
  const amount = (v: number | string | null) => (v === null ? null : Number(v));
  const body = rows.map((r) => [
    r.vendor,
    r.invoice_number,
    date(r.issue_date),
    date(r.due_date),
    r.currency,
    amount(r.net_amount),
    amount(r.tax_amount),
    amount(r.total_amount),
    t.status[r.status as InvoiceStatus] ?? r.status,
    r.comment,
    r.created_at ? `${formatDate(r.created_at)} ${formatTime(r.created_at)}` : null,
  ]);

  // Prepend a UTF-8 BOM (﻿) so č/š/ž open correctly in Excel.
  const csv = "﻿" + toCsv([[...t.csv.header], ...body]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${t.csv.filename(todayIso())}"`,
    },
  });
}

// Minimal RFC-4180-style CSV with ";" as the separator (what Slovenian Excel expects).
// Numbers are DB amounts: written with a decimal comma and never touched by the guard,
// so a negative credit note stays a number. Text cells get two safeguards: (1) quote a
// field that contains ";", a quote or a newline (doubling internal quotes); (2) a
// FORMULA-INJECTION guard: text comes from OCR of untrusted documents, so a cell that
// starts with = + - @ tab or CR (which Excel/Sheets would run as a formula) gets a
// leading apostrophe. No dependency.
function toCsv(rows: (string | number | null)[][]): string {
  const esc = (v: string | number | null) => {
    if (typeof v === "number") return amountInput(v);
    let s = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(";")).join("\r\n");
}
