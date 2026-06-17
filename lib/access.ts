// Module-access helpers. DONE — do not modify.
// These read the core_* tables; RLS guarantees a member only ever sees their own
// grants, and the server-side checks here enforce access on every request.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Role = "owner" | "member";

export type Profile = {
  id: string;
  full_name: string | null;
  role: Role;
};

export async function getProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data } = await supabase
    .from("core_profiles")
    .select("id, full_name, role")
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
