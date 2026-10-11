// The first line of every module Server Action:
//
//   const ctx = await moduleContext("travel_orders");
//   if (!ctx.ok) return ctx;
//   const { supabase, user } = ctx;
//
// It re-checks, server-side, that the caller is signed in, granted this module
// and that the module is switched on — a member can't drive a module by posting
// to its action directly. Never skip it.
import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { moduleIsEnabled, userCanAccess } from "@/lib/access";
import { sl } from "@/lib/i18n/sl";

export type ModuleContext =
  | { ok: true; supabase: SupabaseClient; user: User }
  | { ok: false; error: string };

export async function moduleContext(moduleId: string): Promise<ModuleContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: sl.errors.signedOut };
  if (!(await userCanAccess(supabase, user.id, moduleId))) {
    return { ok: false, error: sl.errors.noAccess };
  }
  if (!(await moduleIsEnabled(supabase, moduleId))) {
    return { ok: false, error: sl.errors.moduleOff };
  }
  return { ok: true, supabase, user };
}
