// Home tile status line. Own table only, one cheap query, RLS client only.
import "server-only";
import type { ModuleSummary, SummaryContext } from "@/lib/modules";
import { count } from "@/lib/format";

export async function summary({ supabase, userId }: SummaryContext): Promise<ModuleSummary> {
  const { count: mine } = await supabase
    .from("work_orders_orders")
    .select("id", { count: "exact", head: true })
    .eq("assignee_id", userId)
    .neq("status", "zakljucen");
  if (mine) {
    return {
      text: `${count(mine, { one: "odprt nalog", two: "odprta naloga", few: "odprti nalogi", other: "odprtih nalogov" })} zate`,
      tone: "attention",
    };
  }
  const { count: open } = await supabase
    .from("work_orders_orders")
    .select("id", { count: "exact", head: true })
    .neq("status", "zakljucen");
  return open
    ? { text: count(open, { one: "odprt nalog", two: "odprta naloga", few: "odprti nalogi", other: "odprtih nalogov" }), tone: "neutral" }
    : { text: "Ni odprtih nalogov", tone: "good" };
}
