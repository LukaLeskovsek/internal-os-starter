"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function acceptRecovery(formData: FormData) {
  const token_hash = String(formData.get("token_hash") ?? "");
  if (!/^(?:[a-f0-9]{56}|[a-f0-9]{64})$/i.test(token_hash)) {
    redirect("/auth/recovery?error=invalid");
  }
  const supabase = await createClient();
  // Consume the one-time recovery link only after a human submits the form.
  // Supabase verifies its purpose, expiry and signature and writes the session cookies.
  const { data, error } = await supabase.auth.verifyOtp({ token_hash, type: "recovery" });
  if (error || !data.session) redirect("/auth/recovery?error=invalid");
  redirect("/setup-password");
}
