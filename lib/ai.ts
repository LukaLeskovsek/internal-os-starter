// The system's AI calls go through here. SERVER-ONLY.
//
// Uses OpenRouter via the OpenAI-compatible SDK, with your own key and a spending
// limit (openrouter.ai → Keys). Default model is Claude; set OPENROUTER_MODEL to
// switch (e.g. an OpenAI model) — the call shape never changes.
//
// SECURITY: OPENROUTER_API_KEY is server-only — never NEXT_PUBLIC, never in the
// browser. Only call generate() from Server Actions / route handlers.
//
// Imitate this for an AI module: build a prompt (optionally from a module's own
// data), call generate(), store the result in the module's prefixed RLS table,
// render it. The ai_assist module is the worked example. Use /integrate-ai.
import "server-only";
import { sl } from "./i18n/sl";
import OpenAI from "openai";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { aiBackend, localClaudeEnv, isSubscriptionAuth, AiSetupError } from "./ai-backend.mjs";
export { AiSetupError } from "./ai-backend.mjs";

// Cheap + fast default for a workshop (the key is capped). Verify the current slug
// at openrouter.ai/models; bump to a stronger Claude model if you want.
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-haiku";

// Local defaults to the verified subscription path; Vercel uses OpenRouter.
// A local OpenRouter call requires an explicit AI_BACKEND=openrouter choice.
/** Configuration indicator only; local subscription authentication is checked at call time. */
export function aiConfigured(): boolean {
  return aiBackend() === "local-claude" || Boolean(process.env.OPENROUTER_API_KEY);
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
  if (aiBackend() === "local-claude") {
    return generateViaLocalClaude(params);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { text: mockOutput(), mock: true };
  }

  const client = new OpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1", maxRetries: 0 });

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
 * Offload one call to the local Claude Code CLI (`claude -p`). A verified subscription
 * login answers within its plan limits. Paid usage credits are separate account
 * settings. Authentication is checked before inference. Missing login or failure
 * throws an explicit setup error; there is no API or sample-output fallback.
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
  if (!text) throw new AiSetupError("local-unavailable");
  return { text, mock: false };
}

/**
 * One call with a FILE attached (an image or a PDF) — e.g. reading an invoice.
 * Only the local-claude backend is handled here: it returns the model's text or
 * throws when authentication or inference failed. For any other backend it returns undefined and the
 * module uses its own client (invoice_ocr has an OpenRouter vision client).
 */
export async function generateFromFile(params: {
  system: string;
  prompt: string;
  file: { base64: string; mime: string };
}): Promise<string | undefined> {
  if (aiBackend() !== "local-claude") return undefined;
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
  const result = await runLocalClaude({ system: params.system, stdin: message + "\n", streamJson: true });
  if (!result) throw new AiSetupError("local-unavailable");
  return result;
}

/** Runs `claude -p` isolated; resolves the answer text, or null on any failure. */
async function runLocalClaude({
  system,
  stdin,
  streamJson = false,
}: {
  system?: string;
  stdin: string;
  streamJson?: boolean;
}): Promise<string | null> {
  const env = localClaudeEnv();
  const cwd = neutralDir();
  await verifySubscription(env, cwd);

  // The module's system line REPLACES Claude Code's own system prompt, so the
  // answer comes from the app's instructions, not a coding agent's.
  const systemLine = system ?? "Si jedrnat in prijazen pomočnik. Odgovarjaj v slovenščini.";

  // Always use a private neutral directory. Company rules belong in the module's
  // reviewed system prompt, not in the operator's project settings or tools.
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
      "--no-session-persistence",
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
    child.stderr.resume();
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

async function verifySubscription(env: NodeJS.ProcessEnv, cwd: string): Promise<void> {
  const status = await new Promise<unknown>((resolve) => {
    const child = spawn("claude", ["auth", "status", "--json"], { env, cwd });
    let output = "";
    let settled = false;
    const finish = (value: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => { child.kill("SIGKILL"); finish(null); }, 10_000);
    child.stdout.on("data", (d) => {
      output += d.toString();
      if (output.length > 64 * 1024) { child.kill("SIGKILL"); finish(null); }
    });
    child.stderr.resume(); // never expose login/account details
    child.stdin.end();
    child.on("error", () => finish(null));
    child.on("close", (code) => {
      if (code !== 0) return finish(null);
      try { finish(JSON.parse(output)); } catch { finish(null); }
    });
  });
  if (!isSubscriptionAuth(status)) throw new AiSetupError("subscription-login");
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
    "[ai] OpenRouter key is not configured; returning explicitly labelled demo output.",
  );
  return "Demo odgovor: AI še ni povezan, zato je to vzorčno besedilo. Ko ga skrbnik poveže, boš tu dobil pravi odgovor.";
}

/** Safe UI explanations; never return provider error bodies or credential metadata. */
export function aiErrorMessage(error: unknown): string {
  if (error instanceof AiSetupError) {
    if (error.code === "subscription-login") return sl.errors.aiSubscription;
    if (error.code === "local-unavailable") return sl.errors.aiLocalUnavailable;
    if (error.code === "hosted-local") return sl.errors.aiHostedLocal;
    return sl.errors.aiConfiguration;
  }
  const status = (error as { status?: number } | null)?.status;
  const metadata = (error as { error?: { metadata?: { limit_source?: string } }; limitSource?: string } | null);
  const source = metadata?.limitSource ?? metadata?.error?.metadata?.limit_source;
  if (status === 402 || (status === 403 && source?.startsWith("openrouter_"))) return sl.errors.aiBudget;
  return sl.errors.aiFailed;
}
