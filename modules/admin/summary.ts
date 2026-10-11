// Home tile status line (owners only see this module). RLS client only.
import "server-only";
import type { ModuleSummary, SummaryContext } from "@/lib/modules";
import { count } from "@/lib/format";

export async function summary({ supabase }: SummaryContext): Promise<ModuleSummary> {
  const [{ data: people }, { data: grants }] = await Promise.all([
    supabase.from("core_profiles").select("id, disabled"),
    supabase.from("core_user_modules").select("user_id"),
  ]);
  const active = (people ?? []).filter((p) => !p.disabled);
  const withAccess = new Set((grants ?? []).map((g) => g.user_id));
  const without = active.filter((p) => !withAccess.has(p.id)).length;
  if (without) {
    return {
      text: `${count(without, { one: "oseba", two: "osebi", few: "osebe", other: "oseb" })} brez dostopa`,
      tone: "attention",
    };
  }
  return { text: count(active.length, { one: "oseba", two: "osebi", few: "osebe", other: "oseb" }), tone: "neutral" };
}
