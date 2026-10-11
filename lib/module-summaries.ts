// Runs one module's tile summary for Home. A slow or broken summary never breaks
// Home: it times out after 1.5 s and shows nothing.
import "server-only";
import type { ModuleDef, ModuleSummary, SummaryContext } from "@/lib/modules";

export async function getModuleSummary(
  def: ModuleDef,
  ctx: SummaryContext,
): Promise<ModuleSummary> {
  if (!def.summary) return null;
  try {
    const mod = await def.summary();
    return await Promise.race([
      mod.summary(ctx),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);
  } catch (e) {
    console.error(`summary for ${def.id} failed`, e);
    return null;
  }
}
