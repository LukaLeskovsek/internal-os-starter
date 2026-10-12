// Every database migration this app needs, in the order to apply them:
// the core (supabase/migrations/) first, then each module (modules/<id>/db/),
// modules alphabetically, files by number. modules/_template is skipped.
//
//   npm run db:list            → a readable list
//   npm run db:list -- --json  → the same as JSON, for Claude (/nastavitev, /ship)
//
// For each file it reports how to tell whether it already ran, without a
// migration history:
//   probe     — the first table the file creates ("public.leave_people"). If that
//               table exists, the file has run.
//   rerunSafe — the file only uses guarded statements (if not exists, or replace,
//               drop … if exists, on conflict), so running it again changes nothing.
// A file with no probe must be rerunSafe; the script warns if one isn't.
// It reads only files — no database, no keys.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const asJson = process.argv.includes("--json");

function sqlFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => join(dir, f));
}

const modulesDir = join(root, "modules");
const moduleIds = readdirSync(modulesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
  .map((d) => d.name)
  .sort();

const files = [
  ...sqlFiles(join(root, "supabase/migrations")).map((path) => ({ path, module: "core" })),
  ...moduleIds.flatMap((id) => sqlFiles(join(modulesDir, id, "db")).map((path) => ({ path, module: id }))),
];

/** Strip comments so a commented-out statement never counts. */
function code(sql) {
  return sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function analyse(sql) {
  const body = code(sql);
  const table = body.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?([\w.]+)/i)?.[1] ?? null;
  const probe = table ? (table.includes(".") ? table : `public.${table}`) : null;

  // Unguarded statements that fail (or duplicate) on a second run.
  const lines = body.split("\n");
  const unguarded = [];
  lines.forEach((line, i) => {
    if (/^\s*create\s+(policy|trigger)\b/i.test(line)) {
      const name = line.match(/create\s+(?:policy|trigger)\s+("[^"]+"|\w+)/i)?.[1];
      const dropped = name && new RegExp(`drop\\s+(policy|trigger)\\s+if\\s+exists\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(body);
      if (!dropped) unguarded.push(`vrstica ${i + 1}: ${line.trim().slice(0, 60)}`);
    }
    if (/^\s*create\s+(table|index|unique\s+index|type|schema)\b(?!.*if\s+not\s+exists)/i.test(line)) {
      unguarded.push(`vrstica ${i + 1}: ${line.trim().slice(0, 60)}`);
    }
    if (/^\s*create\s+function\b/i.test(line)) unguarded.push(`vrstica ${i + 1}: ${line.trim().slice(0, 60)}`);
  });
  return { probe, rerunSafe: unguarded.length === 0, unguarded };
}

const list = files.map(({ path, module }) => {
  const rel = path.slice(root.length);
  return { file: rel, module, ...analyse(readFileSync(path, "utf8")) };
});

const risky = list.filter((m) => !m.probe && !m.rerunSafe);

if (asJson) {
  console.log(JSON.stringify(list.map(({ unguarded, ...m }) => m), null, 2));
} else {
  console.log(`${list.length} migracij, v tem vrstnem redu:\n`);
  for (const m of list) {
    const how = m.probe ? `pognana, če obstaja ${m.probe}` : "varna za ponoven zagon";
    console.log(`  ${m.file.padEnd(58)} ${how}${m.rerunSafe ? "" : "  (NI varna za ponoven zagon)"}`);
  }
}

if (risky.length) {
  console.error("\nOPOZORILO: te datoteke nimajo tabele za preverjanje in niso varne za ponoven zagon:");
  for (const m of risky) console.error(`  ${m.file}\n    ${m.unguarded.join("\n    ")}`);
  process.exitCode = 1;
}
