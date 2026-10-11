// Company days off, loaded for a date window. Server only: the page passes the
// dates to the client as plain props; actions use them to count work days.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanyDay } from "../types";
import { expandRanges } from "./workdays";

export const COMPANY_DAY_COLS = "id, name, start_date, end_date, created_at";

/** Every company day-off range that touches [from, to]. RLS scopes it to the module. */
export async function loadCompanyDays(
  supabase: SupabaseClient,
  from: string,
  to: string,
): Promise<CompanyDay[]> {
  const { data } = await supabase
    .from("leave_company_days")
    .select(COMPANY_DAY_COLS)
    .lte("start_date", to)
    .gte("end_date", from)
    .order("start_date", { ascending: true });
  return (data ?? []) as CompanyDay[];
}

/** The same, as a set of closed dates for countWorkDays(). */
export async function loadClosedDays(supabase: SupabaseClient, from: string, to: string) {
  return expandRanges(await loadCompanyDays(supabase, from, to));
}
