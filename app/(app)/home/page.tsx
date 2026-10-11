import Link from "next/link";
import { Suspense } from "react";
import { LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getLauncherModules, getProfile, type LauncherModule } from "@/lib/access";
import { getModuleSummary } from "@/lib/module-summaries";
import type { SummaryContext } from "@/lib/modules";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { ModuleIcon } from "@/components/app/module-icon";
import { ToneDot } from "@/components/app/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateLong } from "@/lib/format";
import { sl } from "@/lib/i18n/sl";

export const metadata = { title: sl.shell.home };

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("sl-SI", { hour: "numeric", hour12: false, timeZone: "Europe/Ljubljana" }).format(new Date()),
  );
  if (hour < 10) return sl.home.greetingMorning;
  if (hour < 18) return sl.home.greetingDay;
  return sl.home.greetingEvening;
}

// Home: every tool this user may open, each with a live status line and its
// main action — so most days you never need to open the tool to know what's up.
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [modules, profile] = await Promise.all([
    getLauncherModules(supabase, user!.id),
    getProfile(supabase, user!.id),
  ]);
  const firstName = (profile?.full_name || "").split(" ")[0];
  const ctx: SummaryContext = { supabase, userId: user!.id };

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-muted-foreground first-letter:uppercase">{formatDateLong(new Date())}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </h1>
      </div>

      {modules.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => (
              <Tile key={m.id} module={m} ctx={ctx} />
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground pointer-coarse:hidden">{sl.home.hint}</p>
        </>
      ) : (
        <EmptyState icon={LayoutGrid} title={sl.home.empty}>
          {sl.home.emptyText}
        </EmptyState>
      )}
    </div>
  );
}

function Tile({ module: m, ctx }: { module: LauncherModule; ctx: SummaryContext }) {
  const action = m.def.primaryAction;
  return (
    <div className="group relative flex flex-col rounded-3xl bg-card p-5 shadow-xs ring-1 ring-foreground/8 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/30">
      <div className="flex items-start gap-3">
        <ModuleIcon icon={m.def.icon} size="lg" />
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-lg font-semibold leading-tight">
            <Link href={`/m/${m.id}`} className="outline-none after:absolute after:inset-0 after:rounded-3xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50">
              {m.label}
            </Link>
          </h2>
          <Suspense fallback={<Skeleton className="mt-2 h-4 w-28" />}>
            <TileSummary module={m} ctx={ctx} />
          </Suspense>
        </div>
      </div>
      <p className="mt-4 flex-1 text-sm text-muted-foreground">{m.def.description}</p>
      {action ? (
        <div className="relative z-10 mt-4">
          <Button variant="secondary" className="w-full sm:w-auto" render={<Link href={action.href} />}>
            {action.label}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

async function TileSummary({ module: m, ctx }: { module: LauncherModule; ctx: SummaryContext }) {
  const s = await getModuleSummary(m.def, ctx);
  if (!s) return null;
  return (
    <p className="mt-1.5 flex items-center gap-2 text-sm font-medium">
      <ToneDot tone={s.tone ?? "neutral"} />
      <span className={s.tone === "attention" ? "text-foreground" : "text-muted-foreground"}>{s.text}</span>
    </p>
  );
}
