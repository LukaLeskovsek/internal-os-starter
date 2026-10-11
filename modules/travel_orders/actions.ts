"use server";

// travel_orders write paths. The reference for the "quick entry" pattern:
//
//   1. moduleContext() first: signed in, granted, module switched on.
//   2. Validate with zod and return field errors (fromZod), never throw or redirect.
//   3. Write the module's own RLS-scoped table (a trip belongs to its user only).
//   4. revalidatePath() and return a Slovenian message for the toast.
//
// Two shapes: form actions (prev, formData) for the sheets, and typed button
// actions (repeatTrip, deleteTrip, restoreTrip) for the row buttons and undo.
// The reimbursement is always computed here, never trusted from the browser.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, fromZod, ok, type ActionResult } from "@/lib/action-result";
import { moduleContext } from "@/lib/module-context";
import { todayIso } from "@/lib/format";
import { RATE_EUR_PER_KM, reimbursement, roundKm } from "./constants";
import { t } from "./strings";

const MODULE = "travel_orders";
const BASE = `/m/${MODULE}`;
const TABLE = "travel_orders_trips";
const COLS =
  "id, customer, trip_date, route_from, route_to, km, departed_at, arrived_at, rate, amount, created_at";

const UUID = z.uuid();
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t.errDate);
const TIME = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, t.errTime)
  .optional();
const text = (msg: string) => z.string().trim().min(1, msg).max(200, t.errTooLong);

const TripSchema = z.object({
  customer: z.string().trim().max(200, t.errTooLong).optional(),
  trip_date: DATE,
  route_from: text(t.errFrom),
  route_to: text(t.errTo),
  km: z.coerce
    .number({ error: t.errKm })
    .min(0, t.errKmNegative)
    .max(100000, t.errKmTooMany),
  departed_at: TIME,
  arrived_at: TIME,
});

/** Empty inputs become undefined, so optional fields stay optional. */
function readForm(fd: FormData) {
  const get = (k: string) => {
    const v = fd.get(k);
    return v === null || String(v).trim() === "" ? undefined : String(v);
  };
  return {
    id: get("id"),
    roundTrip: get("round_trip") === "1",
    fields: {
      customer: get("customer"),
      trip_date: get("trip_date") ?? "",
      route_from: get("route_from") ?? "",
      route_to: get("route_to") ?? "",
      // Missing km stays undefined (zod reports it); "12,5" is read as 12.5.
      km: get("km")?.replace(",", "."),
      departed_at: get("departed_at"),
      arrived_at: get("arrived_at"),
    },
  };
}

// ------------------------------------------------------------------ create
export async function createTrip(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;

  const { roundTrip, fields } = readForm(fd);
  const parsed = TripSchema.safeParse(fields);
  if (!parsed.success) return fromZod(parsed.error);
  const d = parsed.data;

  // "Povratna pot" doubles the one-way km; we store the total.
  const km = roundKm(roundTrip ? d.km * 2 : d.km);

  const { error } = await ctx.supabase.from(TABLE).insert({
    user_id: ctx.user.id,
    customer: d.customer ?? null,
    trip_date: d.trip_date,
    route_from: d.route_from,
    route_to: d.route_to,
    km,
    departed_at: d.departed_at ?? null,
    arrived_at: d.arrived_at ?? null,
    rate: RATE_EUR_PER_KM,
    amount: reimbursement(km),
  });
  if (error) return fail(error.message);

  revalidatePath(BASE);
  return ok(t.created);
}

// ------------------------------------------------------------------ update
export async function updateTrip(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;

  const { id, fields } = readForm(fd);
  const idOk = UUID.safeParse(id);
  if (!idOk.success) return fail(t.notFound);
  const parsed = TripSchema.safeParse(fields);
  if (!parsed.success) return fromZod(parsed.error);
  const d = parsed.data;

  // Keep the rate the trip was saved with, so an edit never rewrites history
  // with today's rate. RLS returns nothing if the trip isn't ours.
  const { data: existing } = await ctx.supabase
    .from(TABLE)
    .select("rate")
    .eq("id", idOk.data)
    .maybeSingle();
  if (!existing) return fail(t.notFound);

  const km = roundKm(d.km);
  const { error } = await ctx.supabase
    .from(TABLE)
    .update({
      customer: d.customer ?? null,
      trip_date: d.trip_date,
      route_from: d.route_from,
      route_to: d.route_to,
      km,
      departed_at: d.departed_at ?? null,
      arrived_at: d.arrived_at ?? null,
      amount: reimbursement(km, Number(existing.rate)),
    })
    .eq("id", idOk.data);
  if (error) return fail(error.message);

  revalidatePath(BASE);
  return ok(t.updated);
}

// ------------------------------------------------------------------ repeat
/** Copy a trip to today. Returns the new id so the toast can undo it. */
export async function repeatTrip(id: string): Promise<ActionResult<{ id: string }>> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  if (!UUID.safeParse(id).success) return fail(t.notFound);

  const { data: src } = await ctx.supabase.from(TABLE).select(COLS).eq("id", id).maybeSingle();
  if (!src) return fail(t.notFound);

  const km = roundKm(Number(src.km));
  const { data, error } = await ctx.supabase
    .from(TABLE)
    .insert({
      user_id: ctx.user.id,
      customer: src.customer,
      trip_date: todayIso(),
      route_from: src.route_from,
      route_to: src.route_to,
      km,
      // Times belong to the original day; a repeat starts without them.
      rate: RATE_EUR_PER_KM,
      amount: reimbursement(km),
    })
    .select("id")
    .single();
  if (error) return fail(error.message);

  revalidatePath(BASE);
  return ok(t.repeated, { id: data.id as string });
}

// ------------------------------------------------------------------ delete + undo
export type DeletedTrip = {
  id: string;
  customer: string | null;
  trip_date: string;
  route_from: string;
  route_to: string;
  km: number;
  departed_at: string | null;
  arrived_at: string | null;
  rate: number;
  amount: number;
  created_at: string;
};

/** Delete a trip. Returns the deleted row so "Razveljavi" can put it back. */
export async function deleteTrip(id: string): Promise<ActionResult<DeletedTrip>> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  if (!UUID.safeParse(id).success) return fail(t.notFound);

  const { data, error } = await ctx.supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .select(COLS)
    .maybeSingle();
  if (error) return fail(error.message);
  if (!data) return fail(t.notFound);

  revalidatePath(BASE);
  return ok(t.deleted, data as DeletedTrip);
}

const RestoreSchema = TripSchema.extend({
  id: UUID,
  customer: z.string().max(200).nullable(),
  departed_at: TIME.nullable(),
  arrived_at: TIME.nullable(),
  rate: z.coerce.number().min(0).max(10),
  created_at: z.string().min(1),
});

/** Undo for deleteTrip: insert the same row again (same id, rate and date). */
export async function restoreTrip(trip: DeletedTrip): Promise<ActionResult> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;

  const parsed = RestoreSchema.safeParse(trip);
  if (!parsed.success) return fromZod(parsed.error);
  const d = parsed.data;
  const km = roundKm(d.km);

  const { error } = await ctx.supabase.from(TABLE).insert({
    id: d.id,
    user_id: ctx.user.id,
    customer: d.customer,
    trip_date: d.trip_date,
    route_from: d.route_from,
    route_to: d.route_to,
    km,
    departed_at: d.departed_at,
    arrived_at: d.arrived_at,
    rate: d.rate,
    amount: reimbursement(km, d.rate),
    created_at: d.created_at,
  });
  if (error) return fail(error.message);

  revalidatePath(BASE);
  return ok(t.restored);
}
