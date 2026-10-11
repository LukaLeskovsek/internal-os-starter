"use client";

// The review screen's shared client state and its top bar.
//
//   <ReviewSession>   what the nav and the form both need to know: is the form edited
//                     (dirty), is the reject panel open. Also stops a file dropped on
//                     this page from replacing it.
//     <ReviewNav />   back, "3 / 7", J/K to move, Esc to leave
//     <ReviewForm />  the fields and the decision (review-form.tsx)
//
// Moving replaces the history entry, so the browser's Back button leaves the queue
// instead of stepping through it.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { KbdHint } from "@/components/app/kbd-hint";
import { useHotkey } from "@/hooks/use-hotkey";
import { t } from "../strings";

const BASE = "/m/invoice_ocr";

type Session = {
  dirty: boolean;
  setDirty: Dispatch<SetStateAction<boolean>>;
  rejecting: boolean;
  setRejecting: Dispatch<SetStateAction<boolean>>;
};
const SessionCtx = createContext<Session | null>(null);

export function useReviewSession(): Session {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("Wrap the review screen in <ReviewSession>.");
  return ctx;
}

export function ReviewSession({ children }: { children: ReactNode }) {
  const [dirty, setDirty] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // Uploading happens on the list. Here a dropped file would make the browser open it
  // and leave the page (and any unsaved corrections), so swallow drops entirely.
  useEffect(() => {
    const block = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  return (
    <SessionCtx.Provider value={{ dirty, setDirty, rejecting, setRejecting }}>{children}</SessionCtx.Provider>
  );
}

export function ReviewNav({
  backHref,
  position,
  prevId,
  nextId,
}: {
  backHref: string;
  position: { index: number; total: number } | null;
  prevId: string | null;
  nextId: string | null;
}) {
  const router = useRouter();
  const { dirty, rejecting, setRejecting } = useReviewSession();

  /** Leave this invoice. With unsaved corrections, ask first (one click to confirm). */
  const leave = (href: string, how: "push" | "replace") => {
    const go = () => (how === "push" ? router.push(href) : router.replace(href));
    if (!dirty) return go();
    toast.warning(t.review.unsaved, {
      id: "invoice-unsaved", // pressing J again doesn't stack toasts
      description: t.review.unsavedText,
      action: { label: t.review.discard, onClick: go },
    });
  };
  const goTo = (id: string | null) => id && leave(`${BASE}?id=${id}`, "replace");

  useHotkey("j", () => goTo(nextId), { enabled: !!nextId });
  useHotkey("k", () => goTo(prevId), { enabled: !!prevId });
  // Esc steps back one level: first out of the reject panel, then out of the page.
  useHotkey("Escape", () => (rejecting ? setRejecting(false) : leave(backHref, "push")));

  return (
    <div className="flex items-center justify-between gap-3">
      <Button variant="ghost" className="-ml-3" render={<Link href={backHref} />}>
        <ArrowLeft />
        {t.review.back}
      </Button>
      {position ? (
        <div className="flex items-center gap-1">
          <span className="mr-2 text-sm font-medium tabular-nums text-muted-foreground">
            {t.review.position(position.index, position.total)}
          </span>
          <Button variant="outline" size="icon" disabled={!prevId} onClick={() => goTo(prevId)} aria-label={t.review.prev}>
            <ChevronUp />
          </Button>
          <Button variant="outline" size="icon" disabled={!nextId} onClick={() => goTo(nextId)} aria-label={t.review.next}>
            <ChevronDown />
          </Button>
          <span className="ml-1 hidden text-xs text-muted-foreground lg:inline">
            <KbdHint>K</KbdHint>
            <KbdHint>J</KbdHint>
          </span>
        </div>
      ) : null}
    </div>
  );
}
