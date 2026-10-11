// Home tile status line. Own table only, one cheap query, RLS client only.
import "server-only";
import type { ModuleSummary, SummaryContext } from "@/lib/modules";
import { formatKm, formatMoney, todayIso } from "@/lib/format";

export async function summary({ supabase }: SummaryContext): Promise<ModuleSummary> {
  const monthStart = `${todayIso().slice(0, 7)}-01`;
  const { data } = await supabase
    .from("travel_orders_trips")
    .select("km, amount")
    .gte("trip_date", monthStart);
  const km = (data ?? []).reduce((s, t) => s + Number(t.km), 0);
  const eur = (data ?? []).reduce((s, t) => s + Number(t.amount), 0);
  if (!km) return { text: "Ta mesec še ni poti", tone: "neutral" };
  return { text: `${formatKm(km)} · ${formatMoney(eur)} ta mesec`, tone: "neutral" };
}
