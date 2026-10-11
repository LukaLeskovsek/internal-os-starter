"use server";

// Write paths. Every action:
//   1. starts with moduleContext() — signed in, granted, module switched on;
//   2. validates with zod and returns field errors (fromZod), never throws;
//   3. writes only this module's own tables (RLS: anyone granted "leave");
//   4. recomputes work days on the server — never trusts the browser's number;
//   5. revalidates the page and returns a Slovenian message for the toast.
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { fail, fromZod, ok, type ActionResult } from "@/lib/action-result";
import { moduleContext } from "@/lib/module-context";
import { COMPANY_DAY_COLS, loadClosedDays } from "./lib/closed-days";
import { countWorkDays, isIsoDate, rangeLength } from "./lib/workdays";
import { t } from "./strings";
import { KINDS, type Absence, type CompanyDay, type Person } from "./types";

const MODULE = "leave";
const BASE = `/m/${MODULE}`;
const ABSENCES = "leave_absences";
const PEOPLE = "leave_people";
const COMPANY_DAYS = "leave_company_days";
const ABSENCE_COLS = "id, person_id, kind, start_date, end_date, work_days, note, created_at";
const PERSON_COLS = "id, full_name, annual_days, created_at";
const MAX_RANGE_DAYS = 366;

const UUID = z.uuid();
const IsoDate = z.string().refine(isIsoDate, t.errDate);

const AbsenceSchema = z
  .object({
    person_id: z.uuid(t.errPerson),
    kind: z.enum(KINDS, t.errKind),
    start_date: IsoDate,
    end_date: IsoDate,
    note: z.string().trim().max(2000, t.errText).optional(),
  })
  .refine((a) => a.end_date >= a.start_date, { message: t.errEndBeforeStart, path: ["end_date"] })
  .refine((a) => rangeLength(a.start_date, a.end_date) <= MAX_RANGE_DAYS, {
    message: t.errTooLong,
    path: ["end_date"],
  });

const PersonSchema = z.object({
  full_name: z.string().trim().min(1, t.errName).max(200, t.errText),
  annual_days: z.coerce.number(t.errDays).int(t.errDays).min(0, t.errDays).max(365, t.errDays),
});

function get(fd: FormData, k: string): string | undefined {
  const v = fd.get(k);
  return v === null || String(v).trim() === "" ? undefined : String(v);
}

function readAbsence(fd: FormData) {
  return {
    id: get(fd, "id"),
    fields: {
      person_id: get(fd, "person_id") ?? "",
      kind: get(fd, "kind") ?? "dopust",
      start_date: get(fd, "start_date") ?? "",
      end_date: get(fd, "end_date") ?? get(fd, "start_date") ?? "",
      note: get(fd, "note"),
    },
  };
}

const RangeSchema = z
  .object({ start_date: IsoDate, end_date: IsoDate })
  .refine((r) => r.end_date >= r.start_date, { message: t.errEndBeforeStart, path: ["end_date"] })
  .refine((r) => rangeLength(r.start_date, r.end_date) <= MAX_RANGE_DAYS, {
    message: t.errTooLong,
    path: ["end_date"],
  });

const CompanyDaySchema = z
  .object({
    name: z.string().trim().min(1, t.errCompanyName).max(200, t.errText),
    start_date: IsoDate,
    end_date: IsoDate,
  })
  .refine((r) => r.end_date >= r.start_date, { message: t.errEndBeforeStart, path: ["end_date"] });

/** Work days of a range, with public holidays AND company days off excluded. */
async function workDays(supabase: SupabaseClient, start: string, end: string): Promise<number> {
  return countWorkDays(start, end, { closed: await loadClosedDays(supabase, start, end) });
}

/** Validated fields → the row to write, with work_days computed here. */
async function absenceRow(supabase: SupabaseClient, a: z.infer<typeof AbsenceSchema>) {
  return {
    person_id: a.person_id,
    kind: a.kind,
    start_date: a.start_date,
    end_date: a.end_date,
    work_days: await workDays(supabase, a.start_date, a.end_date),
    note: a.note ?? null,
  };
}

// ------------------------------------------------------------------ absences

export async function createAbsence(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  const parsed = AbsenceSchema.safeParse(readAbsence(fd).fields);
  if (!parsed.success) return fromZod(parsed.error);

  const row = await absenceRow(ctx.supabase, parsed.data);
  if (row.work_days === 0) return fail(t.errNoWorkDays, { end_date: t.errNoWorkDays });

  const { error } = await ctx.supabase.from(ABSENCES).insert({ ...row, user_id: ctx.user.id });
  if (error) return fail(t.saveFailed);

  revalidatePath(BASE);
  return ok(t.created);
}

export async function updateAbsence(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  const { id, fields } = readAbsence(fd);
  if (!UUID.safeParse(id).success) return fail(t.notFound);
  const parsed = AbsenceSchema.safeParse(fields);
  if (!parsed.success) return fromZod(parsed.error);

  const row = await absenceRow(ctx.supabase, parsed.data);
  if (row.work_days === 0) return fail(t.errNoWorkDays, { end_date: t.errNoWorkDays });

  const { data, error } = await ctx.supabase
    .from(ABSENCES)
    .update({ ...row, updated_at: new Date().toISOString() })
    .eq("id", id!)
    .select("id")
    .maybeSingle();
  if (error) return fail(t.saveFailed);
  if (!data) return fail(t.notFound);

  revalidatePath(BASE);
  return ok(t.updated);
}

/** Delete, returning the row so "Razveljavi" can put it back (no confirm dialog needed). */
export async function deleteAbsence(id: string): Promise<ActionResult<Absence>> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  if (!UUID.safeParse(id).success) return fail(t.notFound);

  const { data, error } = await ctx.supabase
    .from(ABSENCES)
    .delete()
    .eq("id", id)
    .select(ABSENCE_COLS)
    .maybeSingle();
  if (error) return fail(t.saveFailed);
  if (!data) return fail(t.notFound);

  revalidatePath(BASE);
  return ok(t.deleted, data as Absence);
}

export async function restoreAbsence(a: Absence): Promise<ActionResult> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  // The row comes back from the browser: re-validate it and recompute work_days.
  const id = UUID.safeParse(a.id);
  const parsed = AbsenceSchema.safeParse({ ...a, note: a.note ?? undefined });
  if (!id.success) return fail(t.notFound);
  if (!parsed.success) return fromZod(parsed.error);

  const { error } = await ctx.supabase
    .from(ABSENCES)
    .insert({ id: id.data, ...(await absenceRow(ctx.supabase, parsed.data)), user_id: ctx.user.id });
  if (error) return fail(t.saveFailed);

  revalidatePath(BASE);
  return ok(t.restored);
}

/**
 * The calendar's drag: new dates for an absence (moved, or stretched by an edge).
 * Returns the previous dates so "Razveljavi" can move it straight back.
 */
export async function moveAbsence(
  id: string,
  start_date: string,
  end_date: string,
): Promise<ActionResult<{ id: string; start_date: string; end_date: string }>> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  if (!UUID.safeParse(id).success) return fail(t.notFound);
  const parsed = RangeSchema.safeParse({ start_date, end_date });
  if (!parsed.success) return fromZod(parsed.error);

  const { data: prev } = await ctx.supabase
    .from(ABSENCES)
    .select("start_date, end_date")
    .eq("id", id)
    .maybeSingle();
  if (!prev) return fail(t.notFound);

  const days = await workDays(ctx.supabase, parsed.data.start_date, parsed.data.end_date);
  if (days === 0) return fail(t.errNoWorkDays);

  const { error } = await ctx.supabase
    .from(ABSENCES)
    .update({ ...parsed.data, work_days: days, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return fail(t.saveFailed);

  revalidatePath(BASE);
  return ok(t.moved(days), { id, start_date: prev.start_date as string, end_date: prev.end_date as string });
}

// ------------------------------------------------------------------ company days off

/** A company day off changed: recount every absence it overlaps, so stored days stay true. */
async function recountOverlapping(supabase: SupabaseClient, start: string, end: string) {
  const { data } = await supabase
    .from(ABSENCES)
    .select("id, start_date, end_date, work_days")
    .lte("start_date", end)
    .gte("end_date", start);
  for (const a of (data ?? []) as Pick<Absence, "id" | "start_date" | "end_date" | "work_days">[]) {
    const days = await workDays(supabase, a.start_date, a.end_date);
    if (days !== a.work_days) {
      await supabase.from(ABSENCES).update({ work_days: days }).eq("id", a.id);
    }
  }
}

export async function createCompanyDay(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  const parsed = CompanyDaySchema.safeParse({
    name: get(fd, "name") ?? "",
    start_date: get(fd, "start_date") ?? "",
    end_date: get(fd, "end_date") ?? get(fd, "start_date") ?? "",
  });
  if (!parsed.success) return fromZod(parsed.error);

  const { error } = await ctx.supabase.from(COMPANY_DAYS).insert({ ...parsed.data, user_id: ctx.user.id });
  if (error) return fail(t.saveFailed);
  await recountOverlapping(ctx.supabase, parsed.data.start_date, parsed.data.end_date);

  revalidatePath(BASE);
  return ok(t.companyDayCreated);
}

export async function deleteCompanyDay(id: string): Promise<ActionResult<CompanyDay>> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  if (!UUID.safeParse(id).success) return fail(t.notFound);

  const { data, error } = await ctx.supabase
    .from(COMPANY_DAYS)
    .delete()
    .eq("id", id)
    .select(COMPANY_DAY_COLS)
    .maybeSingle();
  if (error) return fail(t.saveFailed);
  if (!data) return fail(t.notFound);
  const day = data as CompanyDay;
  await recountOverlapping(ctx.supabase, day.start_date, day.end_date);

  revalidatePath(BASE);
  return ok(t.companyDayDeleted, day);
}

export async function restoreCompanyDay(day: CompanyDay): Promise<ActionResult> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  const id = UUID.safeParse(day.id);
  const parsed = CompanyDaySchema.safeParse(day);
  if (!id.success) return fail(t.notFound);
  if (!parsed.success) return fromZod(parsed.error);

  const { error } = await ctx.supabase
    .from(COMPANY_DAYS)
    .insert({ id: id.data, ...parsed.data, user_id: ctx.user.id });
  if (error) return fail(t.saveFailed);
  await recountOverlapping(ctx.supabase, parsed.data.start_date, parsed.data.end_date);

  revalidatePath(BASE);
  return ok(t.companyDayRestored);
}

// ------------------------------------------------------------------ people

export async function createPerson(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  const parsed = PersonSchema.safeParse({
    full_name: get(fd, "full_name") ?? "",
    annual_days: get(fd, "annual_days"),
  });
  if (!parsed.success) return fromZod(parsed.error);

  const { error } = await ctx.supabase.from(PEOPLE).insert({ ...parsed.data, user_id: ctx.user.id });
  if (error) return fail(t.saveFailed);

  revalidatePath(BASE);
  return ok(t.personCreated);
}

export async function updatePerson(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  const id = get(fd, "id");
  if (!UUID.safeParse(id).success) return fail(t.notFound);
  const parsed = PersonSchema.safeParse({
    full_name: get(fd, "full_name") ?? "",
    annual_days: get(fd, "annual_days"),
  });
  if (!parsed.success) return fromZod(parsed.error);

  const { data, error } = await ctx.supabase
    .from(PEOPLE)
    .update(parsed.data)
    .eq("id", id!)
    .select("id")
    .maybeSingle();
  if (error) return fail(t.saveFailed);
  if (!data) return fail(t.notFound);

  revalidatePath(BASE);
  return ok(t.personUpdated);
}

/** Only a person without absences can be deleted (the foreign key refuses otherwise). */
export async function deletePerson(id: string): Promise<ActionResult<Person>> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  if (!UUID.safeParse(id).success) return fail(t.notFound);

  const { data, error } = await ctx.supabase
    .from(PEOPLE)
    .delete()
    .eq("id", id)
    .select(PERSON_COLS)
    .maybeSingle();
  if (error) return fail(error.code === "23503" ? t.personHasAbsences : t.saveFailed);
  if (!data) return fail(t.notFound);

  revalidatePath(BASE);
  return ok(t.personDeleted, data as Person);
}

export async function restorePerson(p: Person): Promise<ActionResult> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  const id = UUID.safeParse(p.id);
  const parsed = PersonSchema.safeParse(p);
  if (!id.success) return fail(t.notFound);
  if (!parsed.success) return fromZod(parsed.error);

  const { error } = await ctx.supabase.from(PEOPLE).insert({ id: id.data, ...parsed.data, user_id: ctx.user.id });
  if (error) return fail(t.saveFailed);

  revalidatePath(BASE);
  return ok(t.personRestored);
}
