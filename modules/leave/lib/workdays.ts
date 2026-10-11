// Counting leave days. One place, used by the sheet (live preview) and by the
// server actions (the stored value), so the number the person sees is the number
// that is saved.
//
// A work day is Monday–Friday that is not a Slovenian public holiday (dela prost
// dan, Zakon o praznikih in dela prostih dnevih). Easter Sunday and Whit Sunday
// always fall on a Sunday, so only Easter Monday needs computing.
// All dates are "YYYY-MM-DD" calendar days; maths runs in UTC to avoid DST drift.

const FIXED_HOLIDAYS = [
  "01-01", // novo leto
  "01-02", // novo leto
  "02-08", // Prešernov dan
  "04-27", // dan upora proti okupatorju
  "05-01", // praznik dela
  "05-02", // praznik dela
  "06-25", // dan državnosti
  "08-15", // Marijino vnebovzetje
  "10-31", // dan reformacije
  "11-01", // dan spomina na mrtve
  "12-25", // božič
  "12-26", // dan samostojnosti in enotnosti
];

const DAY_MS = 86_400_000;

function toUtc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Easter Sunday (Gregorian, anonymous algorithm) as "YYYY-MM-DD". */
function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const holidayCache = new Map<number, Set<string>>();

/** Every work-free public holiday of a year, as "YYYY-MM-DD". */
export function holidays(year: number): Set<string> {
  let set = holidayCache.get(year);
  if (!set) {
    set = new Set(FIXED_HOLIDAYS.map((md) => `${year}-${md}`));
    set.add(toIso(toUtc(easterSunday(year)) + DAY_MS)); // velikonočni ponedeljek
    holidayCache.set(year, set);
  }
  return set;
}

export function isWorkDay(iso: string): boolean {
  const weekday = new Date(toUtc(iso)).getUTCDay(); // 0 = Sunday
  if (weekday === 0 || weekday === 6) return false;
  return !holidays(Number(iso.slice(0, 4))).has(iso);
}

/**
 * Work days from `from` to `to`, both inclusive. Pass `clipFrom` / `clipTo` to
 * count only the part inside a window (a month, a year). Returns 0 for an
 * invalid or reversed range.
 */
export function countWorkDays(from: string, to: string, clipFrom?: string, clipTo?: string): number {
  if (!isIsoDate(from) || !isIsoDate(to)) return 0;
  let start = toUtc(from);
  let end = toUtc(to);
  if (clipFrom) start = Math.max(start, toUtc(clipFrom));
  if (clipTo) end = Math.min(end, toUtc(clipTo));
  let n = 0;
  for (let t = start; t <= end; t += DAY_MS) {
    if (isWorkDay(toIso(t))) n++;
  }
  return n;
}

/** Work days of a range that fall inside one calendar year (for the yearly balance). */
export function workDaysInYear(from: string, to: string, year: number): number {
  return countWorkDays(from, to, `${year}-01-01`, `${year}-12-31`);
}

export function isIsoDate(s: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s);
}

/** Calendar length of a range in days (inclusive). Guards against absurd ranges. */
export function rangeLength(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS) + 1;
}
