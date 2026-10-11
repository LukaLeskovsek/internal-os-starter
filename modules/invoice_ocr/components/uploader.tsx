"use client";

// Multi-file upload for the review queue. Founders copy this for any "drop files,
// AI reads them, a person reviews" tool.
//
//   <UploadProvider highlight={sp.nov === "1"}>   window-wide drag & drop + the file picker
//     <UploadButton />                            opens the picker (also the N key)
//     <DropZone />                                the visible target; pulses on ?nov=1
//     <ReadingRows />                             one "Berem…" row per file being read
//     <HideWhileReading>…</HideWhileReading>      e.g. an empty state that would lie
//   </UploadProvider>
//
// Each file is POSTed on its own (max UPLOAD_CONCURRENCY at once), so one slow read
// never holds up the rest, and a failure names the file it belongs to.
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FileUp, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataList, ListRow } from "@/components/app/data-list";
import { KbdHint } from "@/components/app/kbd-hint";
import { useHotkey } from "@/hooks/use-hotkey";
import type { ActionResult } from "@/lib/action-result";
import { sl } from "@/lib/i18n/sl";
import { cn } from "@/lib/utils";
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES, UPLOAD_CONCURRENCY } from "../constants";
import { t } from "../strings";

const BASE = "/m/invoice_ocr";
const ENDPOINT = "/api/invoice_ocr/upload";

type Reading = { key: string; name: string };
type Ctx = { pick: () => void; addFiles: (files: File[]) => void; reading: Reading[] };
const UploadCtx = createContext<Ctx | null>(null);

function useUpload(): Ctx {
  const ctx = useContext(UploadCtx);
  if (!ctx) throw new Error("Wrap the invoice upload UI in <UploadProvider>.");
  return ctx;
}

/** A tiny semaphore: at most `max` uploads in flight, across every drop and pick. */
function createLimiter(max: number) {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= max) await new Promise<void>((resolve) => waiting.push(resolve));
    active++;
    try {
      return await fn();
    } finally {
      active--;
      waiting.shift()?.();
    }
  };
}

async function postFile(file: File): Promise<ActionResult<{ id: string; mock: boolean }>> {
  const body = new FormData();
  body.set("file", file);
  try {
    const res = await fetch(ENDPOINT, { method: "POST", body });
    return (await res.json()) as ActionResult<{ id: string; mock: boolean }>;
  } catch {
    return { ok: false, error: sl.errors.generic };
  }
}

export function UploadProvider({ highlight = false, children }: { highlight?: boolean; children: ReactNode }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [limit] = useState(() => createLimiter(UPLOAD_CONCURRENCY));
  const [reading, setReading] = useState<Reading[]>([]);
  const [dragging, setDragging] = useState(false);

  const pick = useCallback(() => inputRef.current?.click(), []);

  const addFiles = useCallback(
    async (files: File[]) => {
      // Refuse wrong files right away, by name, before anything is sent.
      const valid: File[] = [];
      for (const f of files) {
        if (!ACCEPTED_TYPES[f.type]) toast.error(t.upload.fileError(f.name, t.upload.wrongType));
        else if (f.size > MAX_UPLOAD_BYTES) toast.error(t.upload.fileError(f.name, t.upload.tooBig));
        else valid.push(f);
      }
      if (!valid.length) return;

      const items = valid.map((file) => ({ key: crypto.randomUUID(), name: file.name, file }));
      setReading((r) => [...r, ...items.map(({ key, name }) => ({ key, name }))]);

      const ids: (string | undefined)[] = [];
      let limitHit = false;
      let skipped = 0;

      await Promise.all(
        items.map((item, i) =>
          limit(async () => {
            // Once the daily AI limit is hit, the rest of this batch would fail the same way.
            const res = limitHit ? null : await postFile(item.file);
            if (!res || (!res.ok && res.error === sl.errors.aiLimit)) {
              if (!limitHit) toast.error(sl.errors.aiLimit);
              limitHit = true;
              skipped++;
            } else if (!res.ok) {
              toast.error(t.upload.fileError(item.name, res.error));
            } else {
              ids[i] = res.data?.id;
            }
            // Drop the "Berem…" row in the same transition as the refresh, so the real
            // row replaces it without a blink. The timeout is a safety net: if the
            // refresh fails, the placeholder must not spin forever.
            const done = () => setReading((r) => r.filter((x) => x.key !== item.key));
            startTransition(() => {
              done();
              router.refresh();
            });
            setTimeout(done, 5000);
          }),
        ),
      );

      if (skipped) toast.error(t.upload.skipped(skipped));
      const done = ids.filter(Boolean) as string[];
      if (done.length) {
        toast.success(t.upload.doneMany(done.length), {
          action: { label: t.queue.startReview, onClick: () => router.push(`${BASE}?id=${done[0]}`) },
        });
      }
    },
    [limit, router],
  );

  // Drop files anywhere on the page, not only on the drop zone. `depth` counts
  // dragenter/dragleave pairs, which fire for every child element the drag crosses.
  const addRef = useRef(addFiles);
  addRef.current = addFiles;
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const over = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); // without this the browser opens the file instead
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      void addRef.current(Array.from(e.dataTransfer?.files ?? []));
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, []);

  // N = the module's primary action. A keypress counts as a user gesture, so the
  // browser lets us open the file picker from it.
  useHotkey("n", pick);

  return (
    <UploadCtx.Provider value={{ pick, addFiles, reading }}>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept={Object.keys(ACCEPTED_TYPES).join(",")}
        onChange={(e) => {
          const files = Array.from(e.currentTarget.files ?? []);
          e.currentTarget.value = ""; // picking the same file again still fires
          void addFiles(files);
        }}
      />
      {children}
      {dragging ? <DropOverlay /> : null}
      <Highlight on={highlight} />
    </UploadCtx.Provider>
  );
}

function DropOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-background/80 p-6 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col items-center rounded-3xl border-2 border-dashed border-primary bg-card px-8 py-14 text-center shadow-lg">
        <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <FileUp className="size-7" />
        </div>
        <p className="text-lg font-semibold">{t.upload.overlay}</p>
        <p className="mt-1 text-muted-foreground">{t.upload.overlayHint}</p>
      </div>
    </div>
  );
}

/**
 * ?nov=1 (Home tile, ⌘K) can't open the file picker: browsers only allow that from a
 * click or key press. So bring the drop zone into view and pulse it, then drop the
 * param so a refresh doesn't do it again.
 */
function Highlight({ on }: { on: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  useEffect(() => {
    if (!on) return;
    const zone = document.getElementById(DROP_ZONE_ID);
    zone?.scrollIntoView({ block: "center", behavior: "smooth" });
    zone?.focus({ preventScroll: true });
    zone?.setAttribute("data-pulse", "");
    const timer = setTimeout(() => zone?.removeAttribute("data-pulse"), 2400);
    const qs = new URLSearchParams(params.toString());
    qs.delete("nov");
    router.replace(qs.size ? `${pathname}?${qs}` : pathname, { scroll: false });
    return () => clearTimeout(timer);
    // Run once per arrival with ?nov=1, not on every params change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);
  return null;
}

const DROP_ZONE_ID = "invoice-drop-zone";

export function UploadButton({ variant = "default" }: { variant?: "default" | "outline" }) {
  const { pick } = useUpload();
  return (
    <Button variant={variant} onClick={pick}>
      <Upload />
      {t.upload.button}
      <KbdHint>N</KbdHint>
    </Button>
  );
}

/** The visible drop target. `hero` = the big first-run version that doubles as the empty state. */
export function DropZone({ hero = false, title, text }: { hero?: boolean; title?: string; text?: string }) {
  const { pick } = useUpload();
  return (
    <button
      id={DROP_ZONE_ID}
      type="button"
      onClick={pick}
      className={cn(
        "group flex w-full items-center gap-4 rounded-3xl border-2 border-dashed border-border bg-card/50 text-left transition-colors outline-none",
        "hover:border-primary/60 hover:bg-accent/40 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/50",
        "data-pulse:animate-pulse data-pulse:border-primary data-pulse:ring-3 data-pulse:ring-ring/50",
        hero ? "flex-col justify-center px-6 py-16 text-center" : "px-5 py-4",
      )}
    >
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground",
          hero ? "size-14" : "size-11",
        )}
      >
        <FileUp className={hero ? "size-7" : "size-5"} />
      </span>
      <span className="min-w-0">
        <span className={cn("block font-semibold", hero && "text-lg")}>{title ?? t.upload.dropTitle}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{text ?? t.upload.dropHint}</span>
      </span>
    </button>
  );
}

/** A placeholder row per file the AI is reading right now. */
export function ReadingRows() {
  const { reading } = useUpload();
  if (!reading.length) return null;
  return (
    <DataList className="mb-3" aria-live="polite">
      {reading.map((r) => (
        <ListRow
          key={r.key}
          className="animate-pulse"
          leading={
            <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Loader2 className="size-5 animate-spin" />
            </span>
          }
          title={r.name}
          meta={t.upload.reading}
        />
      ))}
    </DataList>
  );
}

/** Hides its children while files are being read (an "all done" message would be wrong). */
export function HideWhileReading({ children }: { children: ReactNode }) {
  const { reading } = useUpload();
  return reading.length ? null : <>{children}</>;
}
