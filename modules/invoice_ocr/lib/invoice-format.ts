// Small invoice-specific helpers shared by the server pages, the client review form
// and the CSV route. No "server-only": the review form uses them in the browser too.
import { formatMoney, formatNumber, formatRelative, formatDateShort, parseDateOnly, todayIso } from "@/lib/format";
import type { Tone } from "@/components/app/status-badge";
import { t, type InvoiceStatus } from "../strings";

/**
 * Money with whatever currency the AI read. Intl throws on a code it doesn't know
 * ("€", "EURO", "SIT"), so fall back to "1.234,50 EURO" instead of crashing the page.
 */
export function money(value: number | null | undefined, currency: string | null | undefined): string {
  try {
    return formatMoney(value, currency || "EUR");
  } catch {
    return value === null || value === undefined ? "—" : `${formatNumber(value, 2)} ${currency}`;
  }
}

/**
 * Parse what a person types into an amount field: "1250", "1250,50", "1.250,50",
 * "1 250,50 €" or "1250.50". Empty → null; anything unreadable → NaN (the caller
 * turns that into a field error).
 */
export function parseAmount(input: string | null | undefined): number | null {
  const s = String(input ?? "").replace(/[\s €]/g, "").replace(/[A-Za-z]/g, "");
  if (s === "") return null;
  // With a comma, the comma is the decimal mark and dots group thousands (sl-SI).
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : Number.NaN;
}

/** An amount as an editable input value: 1250.5 → "1250,50" (no thousands dots). */
export function amountInput(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("sl-SI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(value);
}

/** True when net + tax equals total to the cent. null when we can't tell yet. */
export function sumMatches(net: number | null, tax: number | null, total: number | null): boolean | null {
  if (net === null || tax === null || total === null) return null;
  if ([net, tax, total].some(Number.isNaN)) return null;
  return Math.round((net + tax) * 100) === Math.round(total * 100);
}

/** Status pill: label + tone, by meaning. */
export function statusBadge(status: InvoiceStatus): { label: string; tone: Tone } {
  const tone: Record<InvoiceStatus, Tone> = { pending: "attention", approved: "good", rejected: "danger" };
  return { label: t.status[status] ?? t.status.pending, tone: tone[status] ?? "neutral" };
}

/**
 * The due date as a person thinks about it: "zapade 18. jul.", "zapade danes",
 * "zapadlo pred 3 dnevi". Overdue pending invoices get the danger tone.
 */
export function dueInfo(due: string | null, today = todayIso()): { label: string; tone: Tone } | null {
  if (!due) return null;
  const days = Math.round((parseDateOnly(due).getTime() - parseDateOnly(today).getTime()) / 86_400_000);
  if (days < 0) return { label: t.queue.overdue(formatRelative(parseDateOnly(due))), tone: "danger" };
  if (days === 0) return { label: t.queue.dueToday, tone: "attention" };
  return { label: t.queue.due(formatDateShort(due)), tone: days <= 3 ? "attention" : "neutral" };
}
