// Module-access + identity helpers. Core — change with care.
// RLS guarantees a member only ever reads their own grants/profile; owners read
// all. These helpers also enforce access (enabled modules, not-disabled users).
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getModule } from "@/modules/_registry";
import type { ModuleDef } from "@/lib/modules";

export type Role = "owner" | "member";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
  disabled: boolean;
};

export async function getProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data } = await supabase
    .from("core_profiles")
    .select("id, full_name, email, role, disabled")
    .eq("id", userId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function isOwner(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const profile = await getProfile(supabase, userId);
  return profile?.role === "owner";
}

export async function getGrantedModuleIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("core_user_modules")
    .select("module_id")
    .eq("user_id", userId);
  return (data ?? []).map((r) => r.module_id as string);
}

export async function userCanAccess(
  supabase: SupabaseClient,
  userId: string,
  moduleId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("core_user_modules")
    .select("module_id")
    .eq("user_id", userId)
    .eq("module_id", moduleId)
    .maybeSingle();
  return !!data;
}

// Is a module switched on at the catalogue level? Disabled modules are blocked
// even for users who were granted them.
export async function moduleIsEnabled(
  supabase: SupabaseClient,
  moduleId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("core_modules")
    .select("enabled")
    .eq("id", moduleId)
    .maybeSingle();
  return data?.enabled === true;
}

// Owner view: every user (RLS lets owners read all profiles).
export async function listUsers(supabase: SupabaseClient): Promise<Profile[]> {
  const { data } = await supabase
    .from("core_profiles")
    .select("id, full_name, email, role, disabled, created_at")
    .order("created_at", { ascending: true });
  return (data as Profile[] | null) ?? [];
}

export type LauncherModule = {
  id: string;
  label: string; // owner-editable name from core_modules
  def: ModuleDef; // icon, description, primaryAction, summary… from the registry
};

// What a user may open: modules they are granted AND that are enabled, ordered
// by sort_order. Cached per request — the layout (⌘K, switcher) and Home share it.
export const getLauncherModules = cache(async function getLauncherModules(
  supabase: SupabaseClient,
  userId: string,
): Promise<LauncherModule[]> {
  const { data: grants } = await supabase
    .from("core_user_modules")
    .select("module_id")
    .eq("user_id", userId);
  const ids = (grants ?? []).map((g) => g.module_id as string);
  if (ids.length === 0) return [];

  const { data: mods } = await supabase
    .from("core_modules")
    .select("id, name, sort_order")
    .eq("enabled", true)
    .in("id", ids)
    .order("sort_order", { ascending: true });

  return (mods ?? []).flatMap((m) => {
    const def = getModule(m.id as string);
    return def ? [{ id: def.id, label: moduleLabel(m.name as string | null, def), def }] : [];
  });
});

// Catalogue names the template shipped before the Slovenian redesign. If the DB
// still holds one of these, the owner never renamed it → use the registry name.
const LEGACY_DEFAULT_NAMES = new Set([
  "Admin",
  "CRM (demo)",
  "AI Assistant",
  "Likvidacija računov",
]);

export function moduleLabel(dbName: string | null, def: ModuleDef): string {
  if (!dbName || LEGACY_DEFAULT_NAMES.has(dbName)) return def.name;
  return dbName;
}

export type ModuleMember = { id: string; full_name: string | null; email: string | null };

// Colleagues who can use a module (e.g. to assign them work). Goes through a
// security-definer RPC so a MEMBER sees colleagues too — but only people granted
// that same module, and only if the caller is granted it (or is an owner).
export async function listModuleMembers(
  supabase: SupabaseClient,
  moduleId: string,
): Promise<ModuleMember[]> {
  const { data, error } = await supabase.rpc("core_module_members", { p_module: moduleId });
  if (error) {
    // Migration 0006 not applied yet → fall back to what RLS lets us read.
    console.error("core_module_members failed — run 0006_core_module_members.sql", error.message);
    return (await listUsers(supabase)).filter((u) => !u.disabled);
  }
  return (data as ModuleMember[] | null) ?? [];
}
