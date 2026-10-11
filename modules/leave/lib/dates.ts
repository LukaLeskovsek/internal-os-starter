// Small date helpers shared by the page (server) and the calendar (client).
// Display goes through lib/format.ts; these only build ranges and month keys.
import { formatDateShort, formatDay } from "@/lib/format";

/** "4. nov." · "2.–6. nov." · "28. dec. – 8. jan." */
export function formatRange(from: string, to: string): string {
  if (from === to) return formatDateShort(from);
  if (from.slice(0, 7) === to.slice(0, 7)) return `${formatDay(from)}.–${formatDateShort(to)}`;
  return `${formatDateShort(from)} – ${formatDateShort(to)}`;
}

/** "2026-10" + 1 → "2026-11" */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "2026-02" → "2026-02-28" */
export function lastDayOfMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}
