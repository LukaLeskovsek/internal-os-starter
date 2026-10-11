// The one-line status on the Home tile. Rules: only this module's own table,
// only the client you are given, one cheap query, no external APIs.
import "server-only";
import type { ModuleSummary, SummaryContext } from "@/lib/modules";
import { count, todayIso } from "@/lib/format";
import { itemsWord } from "./strings";

export async function summary({ supabase }: SummaryContext): Promise<ModuleSummary> {
  const monthStart = `${todayIso().slice(0, 7)}-01`;
  const { count: n } = await supabase
    .from("template_items")
    .select("id", { count: "exact", head: true })
    .gte("item_date", monthStart);
  return n ? { text: `${count(n, itemsWord)} ta mesec`, tone: "neutral" } : { text: "Ta mesec še ni zapisov", tone: "neutral" };
}
