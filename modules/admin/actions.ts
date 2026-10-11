"use server";

// Admin actions. Every action is OWNER-ONLY (checked right after moduleContext).
// User-lifecycle and module-config writes use the service-role admin client
// (bypasses RLS) — so the owner check here IS the security boundary. Module
// grants (setAccess, and the grants in addUser) stay on the authenticated
// client + RLS. Keep every guard: no self-demote/-disable/-delete, never touch
// the last owner, never lock yourself out of Administracija.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwner } from "@/lib/access";
import { getModule } from "@/modules/_registry";
import { moduleContext, type ModuleContext } from "@/lib/module-context";
import { fail, fromZod, ok, type ActionResult } from "@/lib/action-result";
import { s } from "./strings";

type OkContext = Extract<ModuleContext, { ok: true }>;

// Returns the calling user iff they are an owner; otherwise null.
async function callerIfOwner(ctx: OkContext) {
  if (!(await isOwner(ctx.supabase, ctx.user.id))) return null;
  return ctx.user;
}

// The service-role client, or null when the key isn't configured (so the
// action can say so instead of crashing).
function adminClient(): SupabaseClient | null {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  return createAdminClient();
}

async function ownerCount(admin: SupabaseClient): Promise<number> {
  const { count } = await admin
    .from("core_profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner");
  return count ?? 0;
}

async function roleOf(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await admin
    .from("core_profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return (data?.role as string | null) ?? null;
}

const done = () => revalidatePath("/m/admin");
const doneWithLauncher = () => {
  revalidatePath("/m/admin");
  revalidatePath("/home");
};

// ===== Module access grid (authenticated client + RLS) =====
export async function setAccess(
  userId: string,
  moduleId: string,
  grant: boolean,
): Promise<ActionResult> {
  const ctx = await moduleContext("admin");
  if (!ctx.ok) return ctx;
  const caller = await callerIfOwner(ctx);
  if (!caller) return fail(s.errors.ownersOnly);
  if (!userId || !moduleId) return fail(s.errors.failed);
  // Revoking your own Administracija would lock you out of this page.
  if (!grant && moduleId === "admin" && userId === caller.id) return fail(s.errors.selfAdminRevoke);

  const { error } = grant
    ? await ctx.supabase
        .from("core_user_modules")
        .upsert(
          { user_id: userId, module_id: moduleId, granted_by: caller.id },
          { onConflict: "user_id,module_id", ignoreDuplicates: true },
        )
    : await ctx.supabase
        .from("core_user_modules")
        .delete()
        .eq("user_id", userId)
        .eq("module_id", moduleId);
  if (error) {
    console.error("admin setAccess failed", error.message);
    return fail(s.errors.failed);
  }
  done();
  return ok(grant ? s.ok.granted : s.ok.revoked);
}

// ===== User management (service role; owner-guarded) =====
const AddUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(s.errors.emailInvalid),
  full_name: z.string().trim().max(120, s.errors.nameLong),
  password: z.string().min(8, s.errors.passwordShort).max(72, s.errors.passwordShort),
  modules: z.array(z.string().min(1)).max(50),
});

export async function addUser(
  _prev: ActionResult<{ email: string; name: string }>,
  formData: FormData,
): Promise<ActionResult<{ email: string; name: string }>> {
  const ctx = await moduleContext("admin");
  if (!ctx.ok) return ctx;
  const caller = await callerIfOwner(ctx);
  if (!caller) return fail(s.errors.ownersOnly);

  const parsed = AddUserSchema.safeParse({
    email: formData.get("email") ?? "",
    full_name: formData.get("full_name") ?? "",
    password: formData.get("password") ?? "",
    modules: formData.getAll("modules").map(String),
  });
  if (!parsed.success) return fromZod(parsed.error);
  const { email, full_name, password, modules } = parsed.data;

  const admin = adminClient();
  if (!admin) return fail(s.errors.missingKey);

  // Creates the account directly (no email sent); the trigger makes the profile
  // and copies full_name from user_metadata.
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: full_name ? { full_name } : undefined,
  });
  if (error || !created.user) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "email_exists" || /already|registered|exists/i.test(error?.message ?? "")) {
      return fail(s.errors.emailTaken, { email: s.errors.emailTaken });
    }
    if (code === "weak_password") return fail(s.errors.passwordShort, { password: s.errors.passwordShort });
    console.error("admin addUser failed", error?.message);
    return fail(s.errors.createFailed);
  }

  // Grant the chosen modules in the same step — same path as setAccess.
  const name = full_name || email;
  const ids = [...new Set(modules)];
  if (ids.length > 0) {
    const { error: grantError } = await ctx.supabase.from("core_user_modules").upsert(
      ids.map((module_id) => ({ user_id: created.user.id, module_id, granted_by: caller.id })),
      { onConflict: "user_id,module_id", ignoreDuplicates: true },
    );
    if (grantError) {
      console.error("admin addUser grants failed", grantError.message);
      done();
      return ok(s.ok.addedNoGrants, { email, name });
    }
  }
  done();
  return ok(s.personAdded(name), { email, name });
}

export async function setRole(userId: string, role: "owner" | "member"): Promise<ActionResult> {
  const ctx = await moduleContext("admin");
  if (!ctx.ok) return ctx;
  const caller = await callerIfOwner(ctx);
  if (!caller) return fail(s.errors.ownersOnly);
  if (role !== "owner" && role !== "member") return fail(s.errors.failed);
  if (role === "member" && userId === caller.id) return fail(s.errors.selfDemote); // no self-demote

  const admin = adminClient();
  if (!admin) return fail(s.errors.missingKey);
  // never demote the last owner
  if (role === "member" && (await roleOf(admin, userId)) === "owner" && (await ownerCount(admin)) <= 1) {
    return fail(s.errors.lastOwner);
  }
  const { error } = await admin.from("core_profiles").update({ role }).eq("id", userId);
  if (error) return fail(s.errors.failed);
  // A new owner needs Administracija to act as one. Best effort, via RLS.
  if (role === "owner") {
    await ctx.supabase
      .from("core_user_modules")
      .upsert(
        { user_id: userId, module_id: "admin", granted_by: caller.id },
        { onConflict: "user_id,module_id", ignoreDuplicates: true },
      );
  }
  done();
  return ok(role === "owner" ? s.ok.roleOwner : s.ok.roleMember);
}

export async function setUserDisabled(userId: string, disabled: boolean): Promise<ActionResult> {
  const ctx = await moduleContext("admin");
  if (!ctx.ok) return ctx;
  const caller = await callerIfOwner(ctx);
  if (!caller) return fail(s.errors.ownersOnly);
  if (disabled && userId === caller.id) return fail(s.errors.selfDisable); // no self-lockout

  const admin = adminClient();
  if (!admin) return fail(s.errors.missingKey);
  if (disabled && (await roleOf(admin, userId)) === "owner" && (await ownerCount(admin)) <= 1) {
    return fail(s.errors.lastOwner); // never disable the last owner
  }
  const { error } = await admin.from("core_profiles").update({ disabled }).eq("id", userId);
  if (error) return fail(s.errors.failed);
  done();
  return ok(disabled ? s.ok.disabled : s.ok.enabled);
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  const ctx = await moduleContext("admin");
  if (!ctx.ok) return ctx;
  const caller = await callerIfOwner(ctx);
  if (!caller) return fail(s.errors.ownersOnly);
  if (!userId) return fail(s.errors.unknownUser);
  if (userId === caller.id) return fail(s.errors.selfDelete); // no self-delete

  const admin = adminClient();
  if (!admin) return fail(s.errors.missingKey);
  if ((await roleOf(admin, userId)) === "owner" && (await ownerCount(admin)) <= 1) {
    return fail(s.errors.lastOwner); // never delete the last owner
  }
  // cascades to core_profiles + core_user_modules (FK on delete cascade)
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("admin deleteUser failed", error.message);
    return fail(s.errors.failed);
  }
  done();
  return ok(s.ok.deleted);
}

// ===== Module management (service role; owner-guarded) =====
export async function setModuleEnabled(moduleId: string, enabled: boolean): Promise<ActionResult> {
  const ctx = await moduleContext("admin");
  if (!ctx.ok) return ctx;
  if (!(await callerIfOwner(ctx))) return fail(s.errors.ownersOnly);
  // Switching Administracija off would lock every owner out of this page.
  if (!enabled && moduleId === "admin") return fail(s.errors.adminOff);

  const admin = adminClient();
  if (!admin) return fail(s.errors.missingKey);
  const { error } = await admin.from("core_modules").update({ enabled }).eq("id", moduleId);
  if (error) return fail(s.errors.failed);
  doneWithLauncher();
  return ok(enabled ? s.ok.moduleOn : s.ok.moduleOff);
}

export async function renameModule(moduleId: string, rawName: string): Promise<ActionResult> {
  const ctx = await moduleContext("admin");
  if (!ctx.ok) return ctx;
  if (!(await callerIfOwner(ctx))) return fail(s.errors.ownersOnly);
  const name = rawName.trim().slice(0, 60);
  if (!name) return fail(s.errors.nameEmpty);

  const admin = adminClient();
  if (!admin) return fail(s.errors.missingKey);
  const { error } = await admin.from("core_modules").update({ name }).eq("id", moduleId);
  if (error) return fail(s.errors.failed);
  doneWithLauncher();
  return ok(s.ok.renamed);
}

export async function moveModule(moduleId: string, dir: "up" | "down"): Promise<ActionResult> {
  const ctx = await moduleContext("admin");
  if (!ctx.ok) return ctx;
  if (!(await callerIfOwner(ctx))) return fail(s.errors.ownersOnly);

  const admin = adminClient();
  if (!admin) return fail(s.errors.missingKey);
  const { data: mods } = await admin
    .from("core_modules")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });
  // Only installed modules take part, so a stale row can't swallow a move.
  const list = (mods ?? []).filter((m) => getModule(m.id as string));
  const i = list.findIndex((m) => m.id === moduleId);
  if (i === -1) return fail(s.errors.unknownModule);
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return ok(); // already at the edge

  // swap sort_order with the neighbour
  const a = await admin.from("core_modules").update({ sort_order: list[j].sort_order }).eq("id", list[i].id);
  const b = await admin.from("core_modules").update({ sort_order: list[i].sort_order }).eq("id", list[j].id);
  if (a.error || b.error) return fail(s.errors.failed);
  doneWithLauncher();
  return ok();
}
