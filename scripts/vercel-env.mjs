// Copy the keys the live app needs from .env.local to your Vercel project
// (Production + Preview), without ever printing a value.
//
//   npm run vercel:env -- --dry-run                         → which keys would go, nothing sent
//   npm run vercel:env -- --site-url https://moja-app.vercel.app
//
// Before the first run: `npx vercel login` (opens the browser) and
// `npx vercel link` (pick the project) in this folder.
//
// What it does NOT send: SUPABASE_ACCESS_TOKEN (only for Claude on your machine),
// ADMIN_* (only for seed:admin), AI_BRAIN_DIR, ANTHROPIC_API_KEY. AI_BACKEND is
// always sent as "openrouter" — "local-claude" only works on your own computer.
// NEXT_PUBLIC_SITE_URL comes from --site-url (the live address), not from
// .env.local (which says localhost).
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const siteIdx = args.indexOf("--site-url");
const siteUrl = siteIdx >= 0 ? args[siteIdx + 1] : undefined;
const targets = "production,preview";

/** Public values are fine to show in the Vercel dashboard; the rest are stored as secrets. */
const KEYS = {
  NEXT_PUBLIC_SUPABASE_URL: "public",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public",
  SUPABASE_SERVICE_ROLE_KEY: "secret",
  OPENROUTER_API_KEY: "secret",
  OPENROUTER_MODEL: "public",
  OPENROUTER_VISION_MODEL: "public",
  AI_DAILY_LIMIT_PER_USER: "public",
  NEXT_PUBLIC_SENTRY_DSN: "public",
  SENTRY_ORG: "public",
  SENTRY_PROJECT: "public",
  RESEND_API_KEY: "secret",
  EMAIL_FROM: "public",
  INTRIX_BASE_URL: "public",
  INTRIX_API_KEY: "secret",
  ZOHO_API_DOMAIN: "public",
  ZOHO_ACCESS_TOKEN: "secret",
};

if (!existsSync(".env.local")) {
  console.error("V tej mapi ni datoteke .env.local.");
  process.exit(1);
}
if (!existsSync(".vercel/project.json") && !dryRun) {
  console.error("Mapa še ni povezana z Vercel projektom. Najprej: npx vercel login, nato npx vercel link.");
  process.exit(1);
}
if (!dryRun && !/^https:\/\/[^\s/]+$/.test(siteUrl ?? "")) {
  console.error("Dodaj živi naslov: npm run vercel:env -- --site-url https://moja-app.vercel.app");
  process.exit(1);
}

// .env.local, read directly (not process.env), so only what the file says is sent.
const local = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (!m) continue;
  let value = m[2].replace(/\s+#.*$/, "").trim();
  if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
  if (value) local[m[1]] = value;
}

const plan = Object.entries(KEYS)
  .filter(([name]) => local[name])
  .map(([name, kind]) => ({ name, kind, value: local[name] }));
plan.push({ name: "AI_BACKEND", kind: "public", value: "openrouter" });
if (siteUrl) plan.push({ name: "NEXT_PUBLIC_SITE_URL", kind: "public", value: siteUrl.replace(/\/$/, "") });

const skipped = Object.keys(KEYS).filter((name) => !local[name]);
if (!local.NEXT_PUBLIC_SUPABASE_URL || !local.NEXT_PUBLIC_SUPABASE_ANON_KEY || !local.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("V .env.local manjkajo ključi Supabase (URL, javni ključ, skrivni ključ). Najprej dokončaj ta korak.");
  process.exit(1);
}

console.log(`${dryRun ? "Poslal bi" : "Pošiljam"} na Vercel (${targets}):`);
for (const p of plan) console.log(`  ${p.name}${p.kind === "secret" ? "  (skrito)" : ""}`);
if (skipped.length) console.log(`Prazni v .env.local, preskočeni: ${skipped.join(", ")}`);
if (dryRun) process.exit(0);

let failed = 0;
for (const p of plan) {
  // The value goes in on stdin: never on the command line, never on screen.
  const res = spawnSync(
    "npx",
    ["-y", "vercel@latest", "env", "add", p.name, targets, "--force", "--yes",
      p.kind === "secret" ? "--sensitive" : "--no-sensitive"],
    { input: p.value, encoding: "utf8", stdio: ["pipe", "ignore", "pipe"] },
  );
  if (res.status === 0) {
    console.log(`  ✓ ${p.name}`);
  } else {
    failed++;
    // Vercel's own message, with the value scrubbed in case it was echoed.
    const msg = (res.stderr || "").split(p.value).join("•••").trim().split("\n").slice(-2).join(" ");
    console.log(`  ✗ ${p.name}: ${msg || "neznana napaka"}`);
  }
}

if (failed) {
  console.error(`\n${failed} ključev ni uspelo. Preveri npx vercel whoami in npx vercel link.`);
  process.exit(1);
}
console.log("\nKončano. Nova objava jih uporabi: potisni na main ali v Vercelu klikni Redeploy.");
