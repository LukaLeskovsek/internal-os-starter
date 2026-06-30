"use server";

// travel_orders write path. Mirrors work_orders/actions.ts: validate →
// re-check userCanAccess (a member without the module can't drive it by posting
// directly) → write the module's PREFIXED, RLS-scoped table → revalidate.
// The reimbursement is computed here (km × RATE), never trusted from the client.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { userCanAccess } from "@/lib/access";
import { RATE_EUR_PER_KM } from "./constants";

const MODULE = "travel_orders";
const BASE = `/m/${MODULE}`;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:MM

function fail(message: string): never {
  redirect(`${BASE}?error=${encodeURIComponent(message)}`);
}

const CreateSchema = z.object({
  customer: z.string().trim().max(200, "Stranka je predolga.").optional(),
  trip_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Izberi datum."),
  route_from: z.string().trim().min(1, "Vpiši izhodišče.").max(200, "Izhodišče je predolgo."),
  route_to: z.string().trim().min(1, "Vpiši cilj.").max(200, "Cilj je predolg."),
  km: z.coerce.number().min(0, "Kilometri ne morejo biti negativni.").max(100000, "Preveč kilometrov."),
  departed_at: z.string().regex(TIME, "Ura odhoda mora biti HH:MM.").optional(),
  arrived_at: z.string().regex(TIME, "Ura prihoda mora biti HH:MM.").optional(),
});

export async function createTrip(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return v === null || v === "" ? undefined : String(v);
  };
  const parsed = CreateSchema.safeParse({
    customer: get("customer"),
    trip_date: get("trip_date") ?? "",
    route_from: get("route_from") ?? "",
    route_to: get("route_to") ?? "",
    km: get("km") ?? "",
    departed_at: get("departed_at"),
    arrived_at: get("arrived_at"),
  });
  if (!parsed.success) fail(parsed.error.issues[0]!.message);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await userCanAccess(supabase, user.id, MODULE))) fail("Nimaš dostopa do tega modula.");

  const km = Math.round(parsed.data.km * 10) / 10;
  const amount = Math.round(km * RATE_EUR_PER_KM * 100) / 100;

  const { error } = await supabase.from("travel_orders_trips").insert({
    user_id: user.id,
    customer: parsed.data.customer ?? null,
    trip_date: parsed.data.trip_date,
    route_from: parsed.data.route_from,
    route_to: parsed.data.route_to,
    km,
    departed_at: parsed.data.departed_at ?? null,
    arrived_at: parsed.data.arrived_at ?? null,
    rate: RATE_EUR_PER_KM,
    amount,
  });
  if (error) fail(error.message);

  revalidatePath(BASE);
  redirect(`${BASE}?ok=1`);
}
