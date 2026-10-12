"use server";

// The AI module's write path — imitate this for an AI feature in any module:
// moduleContext → validate → record usage → call the LLM (server-side, via
// lib/ai.ts) → store in the module's PREFIXED, RLS-scoped table → revalidate.
// See /integrate-ai.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generate, aiErrorMessage } from "@/lib/ai";
import { AiDailyLimitError, recordAiUsage } from "@/lib/ai-budget";
import { fail, fromZod, ok, type ActionResult } from "@/lib/action-result";
import { moduleContext } from "@/lib/module-context";
import { sl } from "@/lib/i18n/sl";
import { s } from "./strings";

const AskSchema = z.object({
  question: z.string().trim().min(1, s.errors.empty).max(4000, s.errors.tooLong),
});

// How many earlier exchanges the model sees, so "and in English?" works.
const HISTORY_PAIRS = 3;
const HISTORY_ANSWER_CHARS = 1500;

export type Thread = {
  id: string;
  question: string;
  answer: string;
  created_at: string;
};

export async function askAssistant(question: string): Promise<ActionResult<Thread>> {
  const ctx = await moduleContext("ai_assist");
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx;

  const parsed = AskSchema.safeParse({ question });
  if (!parsed.success) return fromZod(parsed.error);

  // RLS scopes ai_assist_threads to the signed-in user.
  const { data: recent } = await supabase
    .from("ai_assist_threads")
    .select("question, answer")
    .order("created_at", { ascending: false })
    .limit(HISTORY_PAIRS);

  let answer: string;
  try {
    await recordAiUsage(supabase, "ai_assist");
    const result = await generate({
      system: s.systemPrompt,
      prompt: buildPrompt(parsed.data.question, (recent ?? []).reverse()),
    });
    answer = result.text;
  } catch (e) {
    if (e instanceof AiDailyLimitError) return fail(sl.errors.aiLimit);
    console.error("ai_assist generate failed");
    return fail(aiErrorMessage(e));
  }

  const { data, error } = await supabase
    .from("ai_assist_threads")
    .insert({ user_id: user.id, question: parsed.data.question, answer })
    .select("id, question, answer, created_at")
    .single();
  if (error || !data) {
    console.error("ai_assist insert failed", error);
    return fail(s.errors.saveFailed);
  }

  revalidatePath("/m/ai_assist");
  return ok(undefined, data as Thread);
}

function buildPrompt(question: string, history: { question: string; answer: string }[]): string {
  if (history.length === 0) return question;
  const past = history
    .map(
      (h) =>
        `${s.historyQuestion}: ${h.question}\n${s.historyAnswer}: ${h.answer.slice(0, HISTORY_ANSWER_CHARS)}`,
    )
    .join("\n\n");
  return `${s.historyIntro}\n\n${past}\n\n---\n\n${s.newQuestion}: ${question}`;
}
