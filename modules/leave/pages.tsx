// leave: who is away, when, and how many leave days everyone has left.
//
// Job: "A manager or HR, at their desk, enters an absence in seconds the moment
// someone tells them about it — and at any time sees who is away at the same time
// and how many leave days each person has left."
//
//   /m/leave                  Odsotnosti: one month (?mesec=YYYY-MM), N = Nova odsotnost
//   /m/leave?tab=koledar      Koledar: the team timeline for the month, drag to move
//   /m/leave?tab=ekipa        Ekipa: the team with this year's leave balance, N = Dodaj osebo
//   /m/leave?tab=prazniki     Prazniki: public holidays + company days off (?leto=YYYY)
//   ?nov=1                    opens the tab's create sheet (Home tile, ⌘K, empty states)
//
// The data is shared: everyone granted this module sees the same team, absences and
// company days off (RLS in db/). Data loads here; sheets, the calendar and row menus
// are client components that receive plain props.
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, TreePalm, Users } from "lucide-react";
import type { ModuleProps } from "@/lib/modules";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { DataList, ListRow } from "@/components/app/data-list";
import { EmptyState } from "@/components/app/empty-state";
import { FilterChips } from "@/components/app/filter-chips";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import {
  count,
  formatDateLong,
  formatDay,
  formatMonth,
  formatNumber,
  formatWeekday,
  todayIso,
} from "@/lib/format";
import { NewAbsenceSheet } from "./absence-sheet";
import { TeamCalendar, type CalendarDay } from "./calendar";
import { NewCompanyDaySheet } from "./company-day-sheet";
import { loadCompanyDays } from "./lib/closed-days";
import { formatRange, lastDayOfMonth, shiftMonth } from "./lib/dates";
import {
  addDays,
  countWorkDays,
  expandRanges,
  firstWorkDayFrom,
  holidayList,
  holidayName,
  isWeekend,
  workDaysInYear,
} from "./lib/workdays";
import { NewPersonSheet } from "./person-sheet";
import { AbsenceActions, CompanyDayActions, PersonActions } from "./row-actions";
import { absencesWord, days, kindLabel, peopleWord, t, workDaysWord } from "./strings";
import type { Absence, AbsenceDefaults, CompanyDay, Person } from "./types";

const BASE = "/m/leave";
const ABSENCE_COLS = "id, person_id, kind, start_date, end_date, work_days, note, created_at";
const DEFAULT_ANNUAL_DAYS = 20;
const TABS = ["odsotnosti", "koledar", "ekipa", "prazniki"] as const;
type Tab = (typeof TABS)[number];

export async function LeaveModule({ searchParams }: ModuleProps) {
  const tab: Tab = (TABS as readonly string[]).includes(searchParams.tab ?? "")
    ? (searchParams.tab as Tab)
    : "odsotnosti";
  const today = todayIso();
  const year = Number(today.slice(0, 4));
  const thisMonth = today.slice(0, 7);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.mesec ?? "")
    ? searchParams.mesec!
    : thisMonth;
  const monthStart = `${month}-01`;
  const monthEnd = lastDayOfMonth(month);
  const nov = searchParams.nov === "1";
  // Company days off from last year to next year: enough for every count on this page.
  const windowStart = `${year - 1}-01-01`;
  const windowEnd = `${year + 1}-12-31`;

  // RLS: everyone granted "leave" reads the same rows.
  const supabase = await createClient();
  const [peopleRes, monthRes, yearRes, recentRes, companyDays] = await Promise.all([
    supabase.from("leave_people").select("id, full_name, annual_days, created_at"),
    // Every absence that touches this month, including ones that started earlier.
    supabase
      .from("leave_absences")
      .select(ABSENCE_COLS)
      .lte("start_date", monthEnd)
      .gte("end_date", monthStart)
      .order("start_date", { ascending: true })
      .order("created_at", { ascending: true }),
    // This year's leave, for the balance.
    supabase
      .from("leave_absences")
      .select("person_id, start_date, end_date")
      .eq("kind", "dopust")
      .lte("start_date", `${year}-12-31`)
      .gte("end_date", `${year}-01-01`),
    // Who was entered lately: their chips come first in the sheet.
    supabase
      .from("leave_absences")
      .select("person_id")
      .order("created_at", { ascending: false })
      .limit(30),
    loadCompanyDays(supabase, windowStart, windowEnd),
  ]);

  const closed = expandRanges(companyDays, windowStart, windowEnd);
  const people = ((peopleRes.data ?? []) as Person[]).sort((a, b) =>
    a.full_name.localeCompare(b.full_name, "sl"),
  );
  const absences = (monthRes.data ?? []) as Absence[];

  const used = new Map<string, number>();
  for (const a of (yearRes.data ?? []) as Pick<Absence, "person_id" | "start_date" | "end_date">[]) {
    used.set(a.person_id, (used.get(a.person_id) ?? 0) + workDaysInYear(a.start_date, a.end_date, year, closed));
  }
  const remaining = Object.fromEntries(
    people.map((p) => [p.id, p.annual_days - (used.get(p.id) ?? 0)]),
  );

  const defaults: AbsenceDefaults = {
    today,
    start: firstWorkDayFrom(today, closed),
    year,
    people: people.map((p) => ({ id: p.id, name: p.full_name })),
    recentPeople: [...new Set((recentRes.data ?? []).map((r) => r.person_id as string))],
    remaining,
    closed: [...closed],
  };
  const newestPerson = [...people].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const defaultDays = newestPerson?.annual_days ?? DEFAULT_ANNUAL_DAYS;

  const tabs = (
    <FilterChips
      base={BASE}
      param="tab"
      value={tab}
      keep={{ mesec: searchParams.mesec }}
      options={[
        { value: "odsotnosti", label: t.tabAbsences },
        { value: "koledar", label: t.tabCalendar },
        { value: "ekipa", label: t.tabTeam, count: people.length },
        { value: "prazniki", label: t.tabHolidays },
      ]}
    />
  );

  // Holidays don't need a team: this tab works from the first day.
  if (tab === "prazniki") {
    const shown = /^\d{4}$/.test(searchParams.leto ?? "") ? Number(searchParams.leto) : year;
    const own = await loadCompanyDays(supabase, `${shown}-01-01`, `${shown}-12-31`);
    return (
      <div className="max-sm:pb-24">
        {tabs}
        <HolidaysView
          year={shown}
          companyDays={own}
          start={defaults.start}
          defaultOpen={nov}
        />
      </div>
    );
  }

  // Without a team there is nothing to enter absences for: the other tabs lead there.
  if (!people.length) {
    return (
      <div className="max-sm:pb-24">
        {tabs}
        <PageHeader
          title={t.title}
          actions={<NewPersonSheet defaultDays={defaultDays} defaultOpen={nov} hotkey="n" />}
        />
        <EmptyState
          icon={Users}
          title={t.teamEmpty}
          action={
            <Button size="lg" render={<Link href={`${BASE}?tab=ekipa&nov=1`} scroll={false} />}>
              <Plus />
              {t.addPerson}
            </Button>
          }
        >
          {t.teamEmptyText}
        </EmptyState>
      </div>
    );
  }

  if (tab === "ekipa") {
    return (
      <div className="max-sm:pb-24">
        {tabs}
        <PageHeader
          title={t.tabTeam}
          description={`${count(people.length, peopleWord)} · ${t.balanceFor(year)}`}
          actions={<NewPersonSheet defaultDays={defaultDays} defaultOpen={nov} hotkey="n" />}
        />
        <DataList>
          {people.map((p) => {
            const left = remaining[p.id];
            return (
              <ListRow
                key={p.id}
                title={p.full_name}
                meta={t.usedOf(used.get(p.id) ?? 0, p.annual_days)}
                trailing={
                  left < 0 ? (
                    <StatusBadge tone="danger">
                      {t.overdrawn} {formatNumber(-left, 0)}
                    </StatusBadge>
                  ) : (
                    <div className="text-right tabular-nums">
                      <div className="text-lg font-semibold">{formatNumber(left, 0)}</div>
                      <div className="text-xs text-muted-foreground">{t.left}</div>
                    </div>
                  )
                }
                actions={<PersonActions person={p} />}
              />
            );
          })}
        </DataList>
      </div>
    );
  }

  // Odsotnosti and Koledar: one month, the same header and month navigation.
  const monthDays = absences.reduce(
    (s, a) => s + countWorkDays(a.start_date, a.end_date, { clip: [monthStart, monthEnd], closed }),
    0,
  );
  const header = (
    <>
      <MonthNav tab={tab} month={month} isThisMonth={month === thisMonth} />
      <PageHeader
        title={capitalize(formatMonth(monthStart))}
        description={
          absences.length
            ? `${count(absences.length, absencesWord)} · ${count(monthDays, workDaysWord)}`
            : undefined
        }
        actions={<NewAbsenceSheet defaults={defaults} defaultOpen={nov} />}
      />
    </>
  );

  if (tab === "koledar") {
    const companyName = new Map<string, string>();
    for (const c of companyDays) {
      for (let d = c.start_date; d <= c.end_date; d = addDays(d, 1)) companyName.set(d, c.name);
    }
    const calendarDays: CalendarDay[] = [];
    for (let d = monthStart; d <= monthEnd; d = addDays(d, 1)) {
      const holiday = holidayName(d);
      const company = companyName.get(d);
      calendarDays.push({
        date: d,
        weekday: formatWeekday(d).replace(".", ""),
        day: formatDay(d),
        off: holiday ? "holiday" : company ? "company" : isWeekend(d) ? "weekend" : null,
        name: holiday ?? company,
      });
    }
    return (
      <div className="max-sm:pb-24">
        {tabs}
        {header}
        <TeamCalendar
          days={calendarDays}
          people={defaults.people}
          absences={absences}
          defaults={defaults}
          today={today}
        />
      </div>
    );
  }

  const names = new Map(people.map((p) => [p.id, p.full_name]));
  return (
    <div className="max-sm:pb-24">
      {tabs}
      {header}
      {absences.length ? (
        <DataList>
          {absences.map((a) => {
            const isToday = a.start_date <= today && today <= a.end_date;
            return (
              <ListRow
                key={a.id}
                leading={<DayTile date={a.start_date} />}
                hideLeadingOnMobile
                title={names.get(a.person_id) ?? "—"}
                meta={[kindLabel[a.kind], formatRange(a.start_date, a.end_date), a.note]
                  .filter(Boolean)
                  .join(" · ")}
                trailing={
                  <div className="flex items-center gap-3">
                    {isToday ? <StatusBadge tone="attention">{t.todayBadge}</StatusBadge> : null}
                    <span className="font-semibold tabular-nums">{count(a.work_days, days)}</span>
                  </div>
                }
                actions={<AbsenceActions absence={a} defaults={defaults} />}
              />
            );
          })}
        </DataList>
      ) : (
        <EmptyState
          icon={TreePalm}
          title={month === thisMonth ? t.monthEmpty : t.otherMonthEmpty}
          action={
            <Button size="lg" render={<Link href={`${BASE}?mesec=${month}&nov=1`} scroll={false} />}>
              <Plus />
              {t.newAbsence}
            </Button>
          }
        >
          {t.monthEmptyText}
        </EmptyState>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ holidays

/** Public holidays of a year (read-only) and the company's own days off, by date. */
function HolidaysView({
  year,
  companyDays,
  start,
  defaultOpen,
}: {
  year: number;
  companyDays: CompanyDay[];
  start: string;
  defaultOpen: boolean;
}) {
  const rows = [
    ...holidayList(year).map((h) => ({ kind: "public" as const, date: h.date, h })),
    ...companyDays.map((c) => ({ kind: "company" as const, date: c.start_date, c })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const link = (y: number) => `${BASE}?tab=prazniki&leto=${y}`;

  return (
    <>
      <nav aria-label={t.yearNav} className="-ml-3 mb-2 flex items-center gap-1 text-muted-foreground">
        <Button variant="ghost" size="sm" render={<Link href={link(year - 1)} scroll={false} />}>
          <ChevronLeft />
          {year - 1}
        </Button>
        <Button variant="ghost" size="sm" render={<Link href={link(year + 1)} scroll={false} />}>
          {year + 1}
          <ChevronRight />
        </Button>
      </nav>
      <PageHeader
        title={t.holidaysTitle(year)}
        description={t.sheetCompanyDayDescription}
        actions={<NewCompanyDaySheet start={start} defaultOpen={defaultOpen} />}
      />
      <DataList>
          {rows.map((r) =>
            r.kind === "public" ? (
              <ListRow
                key={r.date}
                leading={<DayTile date={r.date} />}
                hideLeadingOnMobile
                title={r.h.name}
                meta={[formatDateLong(r.date), isWeekend(r.date) ? t.onWeekend : null]
                  .filter(Boolean)
                  .join(" · ")}
                trailing={<StatusBadge>{t.publicHoliday}</StatusBadge>}
              />
            ) : (
              <ListRow
                key={r.c.id}
                leading={<DayTile date={r.date} />}
                hideLeadingOnMobile
                title={r.c.name}
                meta={formatRange(r.c.start_date, r.c.end_date)}
                trailing={<StatusBadge tone="info">{t.companyDay}</StatusBadge>}
                actions={<CompanyDayActions day={r.c} />}
              />
            ),
          )}
      </DataList>
    </>
  );
}

// ------------------------------------------------------------------ helpers

/** ‹ previous month · next month › · back to this month, keeping the tab. */
function MonthNav({ tab, month, isThisMonth }: { tab: Tab; month: string; isThisMonth: boolean }) {
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const tabQs = tab === "odsotnosti" ? "" : `tab=${tab}&`;
  return (
    <nav aria-label={t.monthNav} className="-ml-3 mb-2 flex items-center gap-1 text-muted-foreground">
      <Button variant="ghost" size="sm" render={<Link href={`${BASE}?${tabQs}mesec=${prev}`} scroll={false} />}>
        <ChevronLeft />
        {formatMonth(`${prev}-01`)}
      </Button>
      <Button variant="ghost" size="sm" render={<Link href={`${BASE}?${tabQs}mesec=${next}`} scroll={false} />}>
        {formatMonth(`${next}-01`)}
        <ChevronRight />
      </Button>
      {!isThisMonth ? (
        <Button variant="ghost" size="sm" render={<Link href={`${BASE}?${tabQs.slice(0, -1)}`} scroll={false} />}>
          {t.thisMonth}
        </Button>
      ) : null}
    </nav>
  );
}

/** Weekday + day of the month in a soft tile, so a list scans by date. */
function DayTile({ date }: { date: string }) {
  return (
    <div className="flex size-12 flex-col items-center justify-center rounded-2xl bg-accent text-accent-foreground">
      <span className="text-[0.7rem] leading-none font-medium uppercase opacity-75">
        {formatWeekday(date)}
      </span>
      <span className="text-lg leading-tight font-semibold tabular-nums">{formatDay(date)}</span>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
