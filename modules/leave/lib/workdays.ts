// Counting leave days. One place, used by the sheet (live preview), the calendar
// and the server actions (the stored value), so the number the person sees is the
// number that is saved.
//
// A work day is Monday–Friday that is neither a Slovenian public holiday (dela prost
// dan, Zakon o praznikih in dela prostih dnevih) nor a company day off (kolektivni
// dopust, a bridge day — stored in leave_company_days and passed in as `closed`).
// Easter Sunday and Whit Sunday always fall on a Sunday, so only Easter Monday needs
// computing. All dates are "YYYY-MM-DD" calendar days; maths runs in UTC.

const FIXED_HOLIDAYS: [string, string][] = [
  ["01-01", "Novo leto"],
  ["01-02", "Novo leto"],
  ["02-08", "Prešernov dan"],
  ["04-27", "Dan upora proti okupatorju"],
  ["05-01", "Praznik dela"],
  ["05-02", "Praznik dela"],
  ["06-25", "Dan državnosti"],
  ["08-15", "Marijino vnebovzetje"],
  ["10-31", "Dan reformacije"],
  ["11-01", "Dan spomina na mrtve"],
  ["12-25", "Božič"],
  ["12-26", "Dan samostojnosti in enotnosti"],
];

const DAY_MS = 86_400_000;

/** Company days off, as a set of "YYYY-MM-DD". */
export type ClosedDays = ReadonlySet<string>;
const NONE: ClosedDays = new Set();

function toUtc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** "2026-11-02" + 3 → "2026-11-05" */
export function addDays(iso: string, n: number): string {
  return toIso(toUtc(iso) + n * DAY_MS);
}

/** Calendar days from `from` to `to` (to − from; 0 for the same day). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
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

const holidayCache = new Map<number, Map<string, string>>();

/** Every work-free public holiday of a year: date → name. */
function holidayMap(year: number): Map<string, string> {
  let map = holidayCache.get(year);
  if (!map) {
    const entries: [string, string][] = FIXED_HOLIDAYS.map(([md, name]) => [`${year}-${md}`, name]);
    entries.push([addDays(easterSunday(year), 1), "Velikonočni ponedeljek"]);
    map = new Map(entries.sort(([a], [b]) => a.localeCompare(b)));
    holidayCache.set(year, map);
  }
  return map;
}

/** The year's public holidays in date order, for the Prazniki tab. */
export function holidayList(year: number): { date: string; name: string }[] {
  return [...holidayMap(year)].map(([date, name]) => ({ date, name }));
}

/** The holiday's name, or undefined on an ordinary day. */
export function holidayName(iso: string): string | undefined {
  return holidayMap(Number(iso.slice(0, 4))).get(iso);
}

export function isWeekend(iso: string): boolean {
  const weekday = new Date(toUtc(iso)).getUTCDay(); // 0 = Sunday
  return weekday === 0 || weekday === 6;
}

export function isWorkDay(iso: string, closed: ClosedDays = NONE): boolean {
  return !isWeekend(iso) && !holidayName(iso) && !closed.has(iso);
}

/**
 * Work days from `from` to `to`, both inclusive. `clip` counts only the part inside
 * a window (a month, a year); `closed` adds company days off. Returns 0 for an
 * invalid or reversed range.
 */
export function countWorkDays(
  from: string,
  to: string,
  opts: { clip?: [string, string]; closed?: ClosedDays } = {},
): number {
  if (!isIsoDate(from) || !isIsoDate(to)) return 0;
  let start = toUtc(from);
  let end = toUtc(to);
  if (opts.clip) {
    start = Math.max(start, toUtc(opts.clip[0]));
    end = Math.min(end, toUtc(opts.clip[1]));
  }
  let n = 0;
  for (let t = start; t <= end; t += DAY_MS) {
    if (isWorkDay(toIso(t), opts.closed)) n++;
  }
  return n;
}

/** Work days of a range that fall inside one calendar year (for the yearly balance). */
export function workDaysInYear(from: string, to: string, year: number, closed?: ClosedDays): number {
  return countWorkDays(from, to, { clip: [`${year}-01-01`, `${year}-12-31`], closed });
}

/** `iso` itself if it is a work day, otherwise the next one (a Sunday → Monday). */
export function firstWorkDayFrom(iso: string, closed?: ClosedDays): string {
  let day = iso;
  for (let i = 0; i < 366 && !isWorkDay(day, closed); i++) day = addDays(day, 1);
  return day;
}

/** Company-day ranges → the set of every date they cover. */
export function expandRanges(ranges: { start_date: string; end_date: string }[]): Set<string> {
  const out = new Set<string>();
  for (const r of ranges) {
    if (!isIsoDate(r.start_date) || !isIsoDate(r.end_date)) continue;
    for (let d = r.start_date; d <= r.end_date; d = addDays(d, 1)) out.add(d);
  }
  return out;
}

export function isIsoDate(s: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s);
}

/** Calendar length of a range in days (inclusive). Guards against absurd ranges. */
export function rangeLength(from: string, to: string): number {
  return daysBetween(from, to) + 1;
}
