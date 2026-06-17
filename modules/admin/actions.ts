"use server";

// Grant / revoke a module for a user. Owner-only — enforced here AND by RLS on
// core_user_modules. DONE — do not modify.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isOwner } from "@/lib/access";

export async function setAccess(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  const moduleId = String(formData.get("module_id") ?? "");
  const grant = String(formData.get("grant") ?? "") === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isOwner(supabase, user.id))) {
    return; // RLS would also reject this
  }

  if (grant) {
    await supabase
      .from("core_user_modules")
      .insert({ user_id: userId, module_id: moduleId, granted_by: user.id });
  } else {
    await supabase
      .from("core_user_modules")
      .delete()
      .eq("user_id", userId)
      .eq("module_id", moduleId);
  }

  revalidatePath("/m/admin");
}
