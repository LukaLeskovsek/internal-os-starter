// The system's AI calls go through here. SERVER-ONLY.
//
// Uses OpenRouter via the OpenAI-compatible SDK — the SAME capped key your Hermes
// agent uses, so no new account. Default model is Claude; set OPENROUTER_MODEL to
// switch (e.g. an OpenAI model) — the call shape never changes.
//
// SECURITY: OPENROUTER_API_KEY is server-only — never NEXT_PUBLIC, never in the
// browser. Only call generate() from Server Actions / route handlers.
//
// Imitate this for an AI module: build a prompt (optionally from a module's own
// data), call generate(), store the result in the module's prefixed RLS table,
// render it. The ai_assist module is the worked example. Use /integrate-ai.
import "server-only";
import OpenAI from "openai";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Cheap + fast default for a workshop (the key is capped). Verify the current slug
// at openrouter.ai/models; bump to a stronger Claude model if you want.
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-haiku";

// Which engine answers generate():
//   "openrouter" (default) — pay-as-you-go API via the capped OpenRouter key.
//   "local-claude"         — offload to the local Claude Code CLI (`claude -p`):
//                            your Claude SUBSCRIPTION answers — no API key, no
//                            per-token spend. Works only where `claude` is
//                            installed + logged in (your own machine), so use it
//                            for local single-player dev; leave it unset on a
//                            deployed server (Vercel) and it uses OpenRouter.
// Set AI_BACKEND in .env.local.
const BACKEND = process.env.AI_BACKEND ?? "openrouter";

/** True when an engine can answer for real (an API key, or the local Claude CLI). */
export function aiConfigured(): boolean {
  return BACKEND === "local-claude" || Boolean(process.env.OPENROUTER_API_KEY);
}

/**
 * One LLM call: text in, text out. No key set (first local run, CI, or a founder
 * who hasn't added one yet) → mock mode, so the module still works end-to-end with
 * zero spend. Same idea as the Intrix mock fallback.
 */
export async function generate(params: {
  prompt: string;
  system?: string;
  model?: string;
}): Promise<{ text: string; mock: boolean }> {
  if (BACKEND === "local-claude") {
    return generateViaLocalClaude(params);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { text: mockOutput(), mock: true };
  }

  const client = new OpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1" });

  const res = await client.chat.completions.create({
    model: params.model ?? DEFAULT_MODEL,
    max_tokens: 500,
    messages: [
      ...(params.system
        ? [{ role: "system" as const, content: params.system }]
        : []),
      { role: "user" as const, content: params.prompt },
    ],
  });

  return { text: res.choices[0]?.message?.content?.trim() ?? "", mock: false };
}

/**
 * Offload one call to the local Claude Code CLI (`claude -p`). Your Claude
 * SUBSCRIPTION answers — no API key, no per-token billing (while Anthropic keeps
 * headless `claude -p` on subscription billing). If `claude` isn't installed /
 * logged in, or it errors, we fall back to mock so the module still works.
 *
 * SECURITY: the (untrusted) prompt is written to the child's STDIN, never passed
 * as an argv element — so a prompt that starts with "-" can't be smuggled in as a
 * claude flag (argv injection). Only fixed flags are passed as args, plus the
 * module's system line as a single `--system-prompt=…` argument. We also scrub
 * ANTHROPIC_API_KEY from the child env — if set, Claude Code bills pay-as-you-go
 * API instead of the subscription (a documented surprise-bill footgun). Needs the
 * Node.js runtime, not Edge — Server Actions run on Node by default.
 */
async function generateViaLocalClaude(params: {
  prompt: string;
  system?: string;
}): Promise<{ text: string; mock: boolean }> {
  const text = await runLocalClaude({ system: params.system, stdin: params.prompt });
  return text ? { text, mock: false } : { text: mockOutput(), mock: true };
}

/**
 * One call with a FILE attached (an image or a PDF) — e.g. reading an invoice.
 * Only the local-claude backend is handled here: it returns the model's text, or
 * null when `claude -p` failed. For any other backend it returns undefined and the
 * module uses its own client (invoice_ocr has an OpenRouter vision client).
 */
export async function generateFromFile(params: {
  system: string;
  prompt: string;
  file: { base64: string; mime: string };
}): Promise<string | null | undefined> {
  if (BACKEND !== "local-claude") return undefined;
  const isPdf = params.file.mime === "application/pdf";
  const media = {
    type: isPdf ? "document" : "image",
    source: { type: "base64", media_type: params.file.mime, data: params.file.base64 },
  };
  // One user message in Claude Code's stream-json input format: the file + the ask.
  const message = JSON.stringify({
    type: "user",
    message: { role: "user", content: [media, { type: "text", text: params.prompt }] },
  });
  return runLocalClaude({ system: params.system, stdin: message + "\n", streamJson: true });
}

/** Runs `claude -p` isolated; resolves the answer text, or null on any failure. */
function runLocalClaude({
  system,
  stdin,
  streamJson = false,
}: {
  system?: string;
  stdin: string;
  streamJson?: boolean;
}): Promise<string | null> {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY; // force subscription auth, never pay-as-you-go

  // The module's system line REPLACES Claude Code's own system prompt, so the
  // answer comes from the app's instructions, not a coding agent's.
  const systemLine = system ?? "Si jedrnat in prijazen pomočnik. Odgovarjaj v slovenščini.";

  // Optional: point AI_BRAIN_DIR at a company-brain folder and Claude auto-loads
  // that folder's CLAUDE.md / PERSON / COMPANY / BRAND as grounding. Omit to run
  // without it. Never default to this app's root (the server's cwd) — that loads
  // the dev rules in CLAUDE.md into every answer — so blank means a private empty dir.
  const cwd = process.env.AI_BRAIN_DIR || neutralDir();

  return new Promise((resolve) => {
    // Only FIXED flags are argv; the prompt goes on stdin (see SECURITY above).
    // Isolation: without these flags the child inherits the operator's own Claude
    // Code setup — global settings, plugins, MCP servers (mail, Slack, Jira…),
    // memory — and app users' answers would be grounded in (and able to act
    // through) the operator's personal tools. So: no user settings, no MCP, no
    // tools at all — text in, text out. (The subscription login still identifies
    // the operator's account; that's inherent to local-claude, which is why it is
    // for your own machine only.)
    const args = [
      "-p",
      ...(streamJson
        ? ["--input-format", "stream-json", "--output-format", "stream-json", "--verbose"]
        : ["--output-format", "text"]),
      "--setting-sources", "project",
      "--strict-mcp-config",
      "--tools", "",
      // `=` form: the value can never be parsed as another flag, even if it
      // starts with "-" (a module may put earlier chat turns in its system line).
      `--system-prompt=${systemLine}`,
    ];
    const child = spawn("claude", args, { env, cwd });
    let out = "";
    let settled = false;
    const done = (v: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(v);
    };
    const timer = setTimeout(() => { child.kill("SIGKILL"); done(null); }, 120_000);
    child.stdout.on("data", (d) => {
      out += d.toString();
      if (out.length > 8 * 1024 * 1024) child.kill("SIGKILL"); // cap runaway output
    });
    child.on("error", () => done(null)); // claude not installed
    child.on("close", (code) => {
      if (code !== 0 || !out.trim()) return done(null); // not logged in / failed
      if (!streamJson) return done(out.trim());
      // stream-json: the last line is {"type":"result","result":"…","is_error":false}
      const last = out.trim().split("\n").pop() ?? "";
      try {
        const r = JSON.parse(last) as { type?: string; result?: string; is_error?: boolean };
        done(r.type === "result" && !r.is_error && r.result ? r.result.trim() : null);
      } catch {
        done(null);
      }
    });
    child.stdin.on("error", () => {}); // ignore EPIPE if the child exits early
    child.stdin.end(stdin);
  });
}

// A private (0700), empty working dir for `claude -p`. Never the shared /tmp
// itself: Claude Code loads CLAUDE.md and .claude/settings.json (hooks!) from its
// cwd, so a world-writable dir would let another local user inject config.
let privateDir: string | undefined;
function neutralDir(): string {
  privateDir ??= mkdtempSync(join(tmpdir(), "internal-os-ai-"));
  return privateDir;
}

function mockOutput(): string {
  // Shown to people, so Slovenian and free of developer words. The "why" goes
  // to the server log for whoever runs the app.
  console.warn(
    BACKEND === "local-claude"
      ? "[ai] AI_BACKEND=local-claude but `claude -p` failed — is Claude Code installed and logged in?"
      : "[ai] No OPENROUTER_API_KEY — returning a demo answer.",
  );
  return "Demo odgovor: AI še ni povezan, zato je to vzorčno besedilo. Ko ga skrbnik poveže, boš tu dobil pravi odgovor.";
}
