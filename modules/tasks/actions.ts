"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addTask(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("tasks_items").insert({ user_id: user.id, title });
  revalidatePath("/m/tasks");
}

export async function toggleTask(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const done = String(formData.get("done") ?? "") === "1";
  const supabase = await createClient();
  await supabase.from("tasks_items").update({ done }).eq("id", id);
  revalidatePath("/m/tasks");
}
