// The one-line status on the Home tile. Rules: only this module's own table,
// only the client you are given, one cheap query, no external APIs.
import "server-only";
import type { ModuleSummary, SummaryContext } from "@/lib/modules";
import { todayIso } from "@/lib/format";

export async function summary({ supabase }: SummaryContext): Promise<ModuleSummary> {
  const today = todayIso();
  const { data } = await supabase
    .from("leave_absences")
    .select("person_id")
    .lte("start_date", today)
    .gte("end_date", today);
  const n = new Set((data ?? []).map((r) => r.person_id)).size;
  return n
    ? { text: `Danes odsotni: ${n}`, tone: "attention" }
    : { text: "Danes so vsi na delu", tone: "good" };
}
