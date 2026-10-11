import type { ModuleProps } from "@/lib/modules";
import { createClient } from "@/lib/supabase/server";
import { aiConfigured } from "@/lib/ai";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Chat } from "./chat";
import type { Thread } from "./actions";
import { s } from "./strings";

// How much history the thread shows. Older exchanges stay stored.
const VISIBLE_THREADS = 50;

// The "Vprašaj" reference: ask → LLM (lib/ai.ts) → store in a prefixed,
// RLS-scoped table → show as a thread. Imitate it for an AI feature.
export async function AiAssistModule(_props: ModuleProps) {
  void _props;
  const supabase = await createClient();
  // RLS scopes ai_assist_threads to the signed-in user.
  const { data } = await supabase
    .from("ai_assist_threads")
    .select("id, question, answer, created_at")
    .order("created_at", { ascending: false })
    .limit(VISIBLE_THREADS);
  const threads = ((data ?? []) as Thread[]).reverse(); // oldest → newest

  return (
    <div>
      <PageHeader
        className="mx-auto max-w-3xl"
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            {s.title}
            {aiConfigured() ? null : (
              <StatusBadge tone="attention" className="align-middle">
                <span title={s.demoBadgeHint}>{s.demoBadge}</span>
              </StatusBadge>
            )}
          </span>
        }
        description={s.description}
      />
      <Chat threads={threads} />
    </div>
  );
}
