"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestRecovery(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/forgot-password?error=request");
  }
  // Next.js validates Server Action Origin against Host. Do not trust forwarded hosts
  // or accept a return URL from the request body.
  const origin = (await headers()).get("origin");
  if (!origin || !/^https?:\/\//.test(origin)) redirect("/forgot-password?error=request");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${new URL(origin).origin}/auth/callback?next=/setup-password`,
  });
  if (error) redirect("/forgot-password?error=request");
  redirect("/forgot-password?sent=1");
}
