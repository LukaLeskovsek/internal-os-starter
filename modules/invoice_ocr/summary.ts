// Home tile status line. Own table only, one cheap query, RLS client only.
import "server-only";
import type { ModuleSummary, SummaryContext } from "@/lib/modules";
import { count } from "@/lib/format";

export async function summary({ supabase }: SummaryContext): Promise<ModuleSummary> {
  const { count: pending } = await supabase
    .from("invoice_ocr_invoices")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (!pending) return { text: "Vse pregledano", tone: "good" };
  return {
    text: `${count(pending, { one: "račun čaka", two: "računa čakata", few: "računi čakajo", other: "računov čaka" })} na pregled`,
    tone: "attention",
  };
}
