// Slovenian formatting for everything a person reads. Use these instead of
// toISOString(), toFixed() or hand-built strings: never show a raw ISO date.
// The fixed time zone keeps server and browser output identical (no hydration drift).
const LOCALE = "sl-SI";
const TZ = "Europe/Ljubljana";

type DateInput = string | number | Date | null | undefined;

/** Date-only DB values ("2026-06-18") are local calendar days, not UTC instants. */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12));
}

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseDateOnly(value);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, ...opts });

/** 12. 10. 2026 */
export function formatDate(value: DateInput): string {
  const d = toDate(value);
  return d ? fmt({ day: "numeric", month: "numeric", year: "numeric" }).format(d) : "—";
}

/** 12. okt. */
export function formatDateShort(value: DateInput): string {
  const d = toDate(value);
  return d ? fmt({ day: "numeric", month: "short" }).format(d) : "—";
}

/** pon. (short) or ponedeljek (long) */
export function formatWeekday(value: DateInput, style: "short" | "long" = "short"): string {
  const d = toDate(value);
  return d ? fmt({ weekday: style }).format(d) : "—";
}

/** 12 — the day of the month alone */
export function formatDay(value: DateInput): string {
  const d = toDate(value);
  return d ? fmt({ day: "numeric" }).format(d).replace(".", "") : "—";
}

/** sobota, 11. oktober 2026 */
export function formatDateLong(value: DateInput): string {
  const d = toDate(value);
  return d
    ? fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d)
    : "—";
}

/** oktober 2026 */
export function formatMonth(value: DateInput): string {
  const d = toDate(value);
  return d ? fmt({ month: "long", year: "numeric" }).format(d) : "—";
}

/** 14:05 */
export function formatTime(value: DateInput): string {
  const d = toDate(value);
  return d ? fmt({ hour: "2-digit", minute: "2-digit" }).format(d) : "—";
}

/** danes, včeraj, pred 3 dnevi, 12. okt. (older than a week) */
export function formatRelative(value: DateInput, now: Date = new Date()): string {
  const d = toDate(value);
  if (!d) return "—";
  const day = (x: Date) => fmt({ year: "numeric", month: "2-digit", day: "2-digit" }).format(x);
  const toUtcDay = (x: Date) => {
    const [dd, mm, yy] = day(x).split(".").map((p) => Number(p.trim()));
    return Date.UTC(yy, mm - 1, dd);
  };
  const diffDays = Math.round((toUtcDay(now) - toUtcDay(d)) / 86_400_000);
  if (diffDays === 0) return "danes";
  if (diffDays === 1) return "včeraj";
  if (diffDays > 1 && diffDays < 7) {
    return new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" }).format(-diffDays, "day");
  }
  return formatDateShort(d);
}

/** Today as YYYY-MM-DD in Ljubljana: for date inputs and DB date columns. */
export function todayIso(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  const parts = fmt({ year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** 1234,50 € (12.345,50 € from five digits) */
export function formatMoney(value: number | null | undefined, currency = "EUR"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency }).format(value);
}

/** 1234,5 */
export function formatNumber(value: number | null | undefined, maxDecimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: maxDecimals }).format(value);
}

/** 128 km */
export function formatKm(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${formatNumber(value)} km`;
}

/**
 * Slovenian has four plural forms (1 račun, 2 računa, 3 računi, 5 računov).
 * plural(n, { one: "račun", two: "računa", few: "računi", other: "računov" })
 */
export type PluralForms = { one: string; two: string; few: string; other: string };
const rules = new Intl.PluralRules(LOCALE);
export function plural(n: number, forms: PluralForms): string {
  const r = rules.select(n);
  return r === "one" || r === "two" || r === "few" ? forms[r] : forms.other;
}

/** "3 računi" */
export function count(n: number, forms: PluralForms): string {
  return `${n} ${plural(n, forms)}`;
}
