// Make ADMIN_EMAIL the owner of this workspace and open a link where they set
// their password.
//
//   npm run seed:admin              → creates/updates the owner, opens the link in the browser
//   npm run seed:admin -- --print   → prints the link instead (to send it to someone)
//
// Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL,
// ADMIN_FULL_NAME and NEXT_PUBLIC_SITE_URL from .env.local.
//
// The link goes to /auth/recovery?token_hash=… (see docs/password-recovery.md): the
// app verifies it only after the person presses "Nadaljuj", then opens
// /setup-password. It is a one-time credential: by default it is opened, not
// printed, so it never lands in a chat or a log.
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const fullName = process.env.ADMIN_FULL_NAME?.trim() || null;
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const printLink = process.argv.includes("--print");

const missing = [
  !url && "NEXT_PUBLIC_SUPABASE_URL",
  !key && "SUPABASE_SERVICE_ROLE_KEY",
  !email && "ADMIN_EMAIL",
].filter(Boolean);
if (missing.length) {
  console.error(`V .env.local manjka: ${missing.join(", ")}.`);
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 1. The account: create it (already confirmed — the owner proves the address by
//    opening the link), or keep the existing one.
const created = await admin.auth.admin.createUser({
  email,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});
if (created.error && created.error.code !== "email_exists") {
  throw new Error(`Računa ni bilo mogoče ustvariti: ${created.error.message}`);
}

// 2. A one-time password-setup link (works for a new and an existing account).
const link = await admin.auth.admin.generateLink({ type: "recovery", email });
if (link.error) throw new Error(`Povezave ni bilo mogoče ustvariti: ${link.error.message}`);
const user = link.data.user;
const hashed = link.data.properties?.hashed_token;
if (!user?.id || !hashed) throw new Error("Supabase ni vrnil uporabnika ali povezave.");

// 3. Owner role + every module that exists right now.
const { error: profileError } = await admin.from("core_profiles").upsert({
  id: user.id,
  full_name: fullName,
  email,
  role: "owner",
  disabled: false,
});
if (profileError) throw profileError;

const { data: modules, error: moduleError } = await admin.from("core_modules").select("id");
if (moduleError) throw moduleError;

const grants = (modules ?? []).map((m) => ({
  user_id: user.id,
  module_id: m.id,
  granted_by: user.id,
}));
if (grants.length > 0) {
  const { error: grantError } = await admin
    .from("core_user_modules")
    .upsert(grants, { onConflict: "user_id,module_id" });
  if (grantError) throw grantError;
}

const setupUrl = `${siteUrl}/auth/recovery?token_hash=${hashed}`;
console.log(`${email} je lastnik in ima dostop do ${grants.length} orodij.`);

if (printLink) {
  console.log("Povezava za nastavitev gesla (enkratna, ne deli je javno):");
  console.log(setupUrl);
} else {
  const opener =
    process.platform === "darwin" ? ["open", [setupUrl]]
    : process.platform === "win32" ? ["cmd", ["/c", "start", "", setupUrl]]
    : ["xdg-open", [setupUrl]];
  spawn(opener[0], opener[1], { stdio: "ignore", detached: true }).unref();
  console.log(`Povezavo za nastavitev gesla sem odprl v brskalniku (${siteUrl}).`);
  console.log("Klikni »Nadaljuj« in nastavi geslo. Povezava velja enkrat.");
}
