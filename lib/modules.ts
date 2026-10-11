// The module contract: what every module tells the app shell about itself.
// Types only — safe to import anywhere.
import type { LucideIcon } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

/** A link-shaped action: shown on the Home tile and in the ⌘K palette. */
export type ModuleAction = { label: string; href: string };

/** The one-line status on the Home tile ("3 za pregled"). null = show nothing. */
export type ModuleTone = "neutral" | "attention" | "good";
export type ModuleSummary = { text: string; tone?: ModuleTone } | null;
export type SummaryContext = { supabase: SupabaseClient; userId: string };
export type SummaryModule = {
  summary: (ctx: SummaryContext) => Promise<ModuleSummary>;
};

export type ModuleDef = {
  id: string; // lowercase snake_case — also the database table prefix
  name: string; // default label (owners can rename in Administracija)
  description: string; // one short sentence: the job this tool does
  icon: LucideIcon; // pick one at lucide.dev/icons
  /** The ONE thing people come here to do. Tile button + ⌘K. Opens with ?nov=1. */
  primaryAction?: ModuleAction;
  /** Extra ⌘K entries (e.g. "Izvozi CSV"). */
  actions?: ModuleAction[];
  /** Extra words people might type in ⌘K ("faktura", "kilometrina"). */
  keywords?: string[];
  /** Lazy import of ./<id>/summary — the Home tile status line. Optional. */
  summary?: () => Promise<SummaryModule>;
};

/** Query params every module page receives from the router. */
export type ModuleSearchParams = Record<string, string | undefined>;
export type ModuleProps = { searchParams: ModuleSearchParams };
