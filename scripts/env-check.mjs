// Which keys in .env.local are filled in, and do they look right? Never prints a
// value — only ✓ / ✗ / ⚠ per key — so Claude can check your setup without seeing
// a secret.
//
//   npm run env:check
//
// Exit code 1 when a required key is missing or malformed.
import { readFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { aiBackend, localClaudeEnv, isSubscriptionAuth } from "../lib/ai-backend.mjs";

const CHECKS = [
  // [name, required?, test, what it should look like]
  ["NEXT_PUBLIC_SUPABASE_URL", true, (v) => /^https:\/\/[a-z0-9]{20}\.supabase\.co\/?$/.test(v), "https://<ref>.supabase.co"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", true, (v) => /^(eyJ[\w-]+\.[\w-]+\.[\w-]+|sb_publishable_[\w-]+)$/.test(v), "eyJ… ali sb_publishable_…"],
  ["SUPABASE_SERVICE_ROLE_KEY", true, (v) => /^(sb_secret_[\w-]+|eyJ[\w-]+\.[\w-]+\.[\w-]+)$/.test(v), "sb_secret_…"],
  ["ADMIN_EMAIL", false, (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "e-poštni naslov (le za seed:admin)"],
  ["ADMIN_FULL_NAME", false, (v) => v.length > 1, "ime in priimek"],
  ["SUPABASE_ACCESS_TOKEN", false, (v) => /^sbp_[a-f0-9]{40}$/.test(v), "sbp_… (le, če ne uporabljaš Supabase MCP)"],
  ["OPENROUTER_API_KEY", false, (v) => /^sk-or-[\w-]+$/.test(v), "sk-or-…"],
  ["NEXT_PUBLIC_SENTRY_DSN", false, (v) => /^https:\/\/[^@]+@[^/]+\/\d+$/.test(v), "https://…@….ingest.sentry.io/123"],
  ["RESEND_API_KEY", false, (v) => /^re_[\w-]+$/.test(v), "re_…"],
  ["INTRIX_API_KEY", false, (v) => v.length > 8, "ključ iz Intrixa"],
  ["NEXT_PUBLIC_SITE_URL", false, (v) => /^https?:\/\/[^\s/]+$/.test(v), "http://localhost:3000"],
];

if (!existsSync(".env.local")) {
  console.log("✗ .env.local še ne obstaja (kopija .env.example).");
  process.exit(1);
}

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (!m) continue;
  let value = m[2].replace(/\s+#.*$/, "").trim();
  if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
  env[m[1]] = value;
}

let bad = 0;
for (const [name, required, test, shape] of CHECKS) {
  const v = env[name] ?? "";
  if (!v) {
    if (required) bad++;
    console.log(`${required ? "✗" : "·"} ${name}${required ? " — manjka" : " — prazno (neobvezno)"}`);
  } else if (!test(v)) {
    if (required) bad++;
    console.log(`⚠ ${name} — izpolnjeno, a ne izgleda kot ${shape}`);
  } else {
    console.log(`✓ ${name}`);
  }
}

try {
  const merged = { ...process.env, ...env };
  const backend = aiBackend(merged);
  console.log(`✓ AI_BACKEND — ${backend}`);
  if (backend === "local-claude") {
    const cwd = mkdtempSync(join(tmpdir(), "internal-os-auth-check-"));
    try {
      const result = spawnSync("claude", ["auth", "status", "--json"], {
        env: localClaudeEnv(merged), cwd, encoding: "utf8", timeout: 10_000,
        maxBuffer: 64 * 1024, stdio: ["ignore", "pipe", "ignore"],
      });
      let status;
      try { status = JSON.parse(result.stdout || "null"); } catch { status = null; }
      if (result.status !== 0 || !isSubscriptionAuth(status)) {
        bad++;
        console.log("✗ Lokalni AI — naročniška prijava ni potrjena. Prijavi se v Claude Code s svojim računom Claude.");
      } else console.log("✓ Lokalni AI — naročniška prijava potrjena; preveri še omejitve paketa in dodatne dobropise v računu.");
      if (merged.OPENROUTER_API_KEY || Object.keys(merged).some(k => k.startsWith("ANTHROPIC_"))) {
        console.log("· Lokalni klic odstrani okoljske ključe in nastavitve drugih ponudnikov; API se ne uporabi.");
      }
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  } else if (!env.OPENROUTER_API_KEY) console.log("· AI prek API ni povezan. Aplikacija lahko deluje brez njega.");
} catch {
  bad++;
  console.log("✗ Izbira AI ni veljavna. Lokalni Claude ni dovoljen na Vercelu.");
}
if (env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_SERVICE_ROLE_KEY === env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  bad++;
  console.log("⚠ Skrivni in javni ključ Supabase sta enaka — v SUPABASE_SERVICE_ROLE_KEY prilepi skrivni ključ (sb_secret_…).");
}
// A secret pasted outside its line (e.g. inside a comment) is easy to miss and easy to leak.
const strays = readFileSync(".env.local", "utf8")
  .split("\n")
  .filter((l) => l.trim().startsWith("#") && /(sbp_[a-f0-9]{20,}|sb_secret_\w{8,}|sk-or-\w{8,}|re_\w{12,})/.test(l)).length;
if (strays) {
  console.log(`⚠ V ${strays} vrstici s komentarjem (#) je prilepljen ključ — izbriši ga iz komentarja.`);
}

process.exit(bad ? 1 : 0);
