"use client";

// The "Vprašaj" pattern: a thread (oldest → newest) with the composer pinned at
// the bottom. The question shows instantly (useOptimistic) with a "Razmišljam…"
// bubble; the server action answers, stores the pair and revalidates the page.
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { ArrowUp, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sl } from "@/lib/i18n/sl";
import { formatRelative, formatTime } from "@/lib/format";
import { askAssistant, type Thread } from "./actions";
import { s } from "./strings";

type Item = Thread & { pending?: boolean };

export function Chat({ threads }: { threads: Thread[] }) {
  const [items, addPending] = useOptimistic<Item[], string>(threads, (state, question) => [
    ...state,
    { id: "pending", question, answer: "", created_at: new Date().toISOString(), pending: true },
  ]);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the newest exchange in view (on load and after every send).
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [items.length]);

  function send(text: string) {
    const question = text.trim();
    if (!question || isPending) return;
    setDraft("");
    startTransition(async () => {
      addPending(question);
      const res = await askAssistant(question);
      if (!res.ok) {
        toast.error(res.error);
        setDraft(question); // don't lose what they typed
      }
      inputRef.current?.focus();
    });
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      {items.length === 0 ? (
        <div className="flex flex-col items-center px-2 py-10 text-center">
          <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <Sparkles className="size-7" />
          </div>
          <h2 className="text-lg font-semibold">{s.emptyTitle}</h2>
          <p className="mt-1 max-w-sm text-muted-foreground">{s.emptyText}</p>
          <div className="mt-6 grid w-full gap-2 sm:grid-cols-3">
            {s.suggestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="rounded-2xl border bg-card p-4 text-left text-sm leading-snug transition-colors hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ol className="space-y-6 pb-4">
          {items.map((t) => (
            <li key={t.id} className="space-y-3">
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 whitespace-pre-wrap text-primary-foreground">
                  {t.question}
                </div>
              </div>
              <Answer item={t} />
            </li>
          ))}
        </ol>
      )}
      <div ref={endRef} />

      <form
        className="sticky bottom-0 z-10 bg-gradient-to-t from-background from-70% to-transparent pt-4 pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <label htmlFor="question" className="sr-only">
          {s.composerLabel}
        </label>
        <div className="flex items-end gap-2 rounded-3xl border bg-card p-2 shadow-sm focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <Textarea
            ref={inputRef}
            id="question"
            name="question"
            autoFocus
            rows={1}
            maxLength={4000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(draft);
              }
            }}
            placeholder={s.composerPlaceholder}
            className="max-h-48 min-h-10 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <Button
            type="submit"
            size="icon"
            className="rounded-full"
            disabled={!draft.trim() || isPending}
            aria-label={s.send}
          >
            <ArrowUp />
          </Button>
        </div>
        <p className="mt-2 px-3 text-xs text-muted-foreground pointer-coarse:hidden">{s.composerHint}</p>
      </form>
    </div>
  );
}

function Answer({ item }: { item: Item }) {
  if (item.pending) {
    return (
      <div className="flex">
        <div className="flex items-center gap-2 rounded-3xl rounded-bl-lg bg-muted px-4 py-2.5 text-muted-foreground">
          <Sparkles className="size-4 animate-pulse" />
          {s.thinking}
        </div>
      </div>
    );
  }
  // Rows saved before the redesign may still hold the engine's English placeholder.
  const answer = item.answer.startsWith("[mock AI") ? s.demoAnswer : item.answer;
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="max-w-[85%] rounded-3xl rounded-bl-lg bg-card px-4 py-2.5 whitespace-pre-wrap shadow-xs ring-1 ring-foreground/8">
        {answer}
      </div>
      <div className="flex items-center gap-1 pl-2 text-xs text-muted-foreground">
        <span>
          {formatRelative(item.created_at)}, {formatTime(item.created_at)}
        </span>
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(answer);
              toast.success(sl.common.copied);
            } catch {
              toast.error(sl.errors.generic);
            }
          }}
        >
          <Copy />
          {s.copy}
        </Button>
      </div>
    </div>
  );
}
