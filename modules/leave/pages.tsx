// leave: who is away, when, and how many leave days everyone has left.
//
// Job: "A manager or HR, at their desk, enters an absence in seconds the moment
// someone tells them about it — and at any time sees who is away this month and
// how many leave days each person has left."
//
//   /m/leave                  Odsotnosti: one month (?mesec=YYYY-MM), N = Nova odsotnost
//   /m/leave?tab=ekipa        Ekipa: the team with this year's leave balance, N = Dodaj osebo
//   ?nov=1                    opens the tab's create sheet (Home tile, ⌘K, empty states)
//
// The data is shared: everyone granted this module sees the same team and the same
// absences (RLS in db/0001_leave.sql). Data loads here; sheets and row menus are
// small client components that receive plain props.
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
  formatDateShort,
  formatDay,
  formatMonth,
  formatNumber,
  formatWeekday,
  todayIso,
} from "@/lib/format";
import { NewAbsenceSheet } from "./absence-sheet";
import { countWorkDays, workDaysInYear } from "./lib/workdays";
import { NewPersonSheet } from "./person-sheet";
import { AbsenceActions, PersonActions } from "./row-actions";
import { absencesWord, days, kindLabel, peopleWord, t, workDaysWord } from "./strings";
import type { Absence, AbsenceDefaults, Person } from "./types";

const BASE = "/m/leave";
const ABSENCE_COLS = "id, person_id, kind, start_date, end_date, work_days, note, created_at";
const DEFAULT_ANNUAL_DAYS = 20;

export async function LeaveModule({ searchParams }: ModuleProps) {
  const tab = searchParams.tab === "ekipa" ? "ekipa" : "odsotnosti";
  const today = todayIso();
  const year = Number(today.slice(0, 4));
  const thisMonth = today.slice(0, 7);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.mesec ?? "")
    ? searchParams.mesec!
    : thisMonth;
  const next = shiftMonth(month, 1);

  // RLS: everyone granted "leave" reads the same rows.
  const supabase = await createClient();
  const [peopleRes, monthRes, yearRes, recentRes] = await Promise.all([
    supabase.from("leave_people").select("id, full_name, annual_days, created_at"),
    // Every absence that touches this month, including ones that started earlier.
    supabase
      .from("leave_absences")
      .select(ABSENCE_COLS)
      .lt("start_date", `${next}-01`)
      .gte("end_date", `${month}-01`)
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
  ]);

  const people = ((peopleRes.data ?? []) as Person[]).sort((a, b) =>
    a.full_name.localeCompare(b.full_name, "sl"),
  );
  const names = new Map(people.map((p) => [p.id, p.full_name]));
  const absences = (monthRes.data ?? []) as Absence[];

  const used = new Map<string, number>();
  for (const a of (yearRes.data ?? []) as Pick<Absence, "person_id" | "start_date" | "end_date">[]) {
    used.set(a.person_id, (used.get(a.person_id) ?? 0) + workDaysInYear(a.start_date, a.end_date, year));
  }
  const remaining = Object.fromEntries(
    people.map((p) => [p.id, p.annual_days - (used.get(p.id) ?? 0)]),
  );

  const defaults: AbsenceDefaults = {
    today,
    year,
    people: people.map((p) => ({ id: p.id, name: p.full_name })),
    recentPeople: [...new Set((recentRes.data ?? []).map((r) => r.person_id as string))],
    remaining,
  };
  const newestPerson = [...people].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const defaultDays = newestPerson?.annual_days ?? DEFAULT_ANNUAL_DAYS;
  const nov = searchParams.nov === "1";

  const tabs = (
    <FilterChips
      base={BASE}
      param="tab"
      value={tab}
      keep={{ mesec: searchParams.mesec }}
      options={[
        { value: "odsotnosti", label: t.tabAbsences },
        { value: "ekipa", label: t.tabTeam, count: people.length },
      ]}
    />
  );

  // Without a team there is nothing to enter absences for: both tabs lead there.
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

  // Odsotnosti: one month.
  const monthEnd = lastDayOfMonth(month);
  const monthDays = absences.reduce(
    (s, a) => s + countWorkDays(a.start_date, a.end_date, `${month}-01`, monthEnd),
    0,
  );
  const isThisMonth = month === thisMonth;
  const prev = shiftMonth(month, -1);

  return (
    <div className="max-sm:pb-24">
      {tabs}
      <nav aria-label={t.monthNav} className="-ml-3 mb-2 flex items-center gap-1 text-muted-foreground">
        <Button variant="ghost" size="sm" render={<Link href={`${BASE}?mesec=${prev}`} scroll={false} />}>
          <ChevronLeft />
          {formatMonth(`${prev}-01`)}
        </Button>
        <Button variant="ghost" size="sm" render={<Link href={`${BASE}?mesec=${next}`} scroll={false} />}>
          {formatMonth(`${next}-01`)}
          <ChevronRight />
        </Button>
        {!isThisMonth ? (
          <Button variant="ghost" size="sm" render={<Link href={BASE} scroll={false} />}>
            {t.thisMonth}
          </Button>
        ) : null}
      </nav>

      <PageHeader
        title={capitalize(formatMonth(`${month}-01`))}
        description={
          absences.length
            ? `${count(absences.length, absencesWord)} · ${count(monthDays, workDaysWord)}`
            : undefined
        }
        actions={<NewAbsenceSheet defaults={defaults} defaultOpen={nov} />}
      />

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
          title={isThisMonth ? t.monthEmpty : t.otherMonthEmpty}
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

// ------------------------------------------------------------------ helpers

/** Weekday + day of the month in a soft tile, so a month scans by start date. */
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

/** "4. nov." · "2.–6. nov." · "28. dec. – 8. jan." */
function formatRange(from: string, to: string): string {
  if (from === to) return formatDateShort(from);
  if (from.slice(0, 7) === to.slice(0, 7)) return `${formatDay(from)}.–${formatDateShort(to)}`;
  return `${formatDateShort(from)} – ${formatDateShort(to)}`;
}

/** "2026-10" + 1 → "2026-11" */
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "2026-02" → "2026-02-28" */
function lastDayOfMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
