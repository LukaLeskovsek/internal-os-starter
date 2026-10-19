// invoice_ocr: the REFERENCE module for the "review queue" pattern (Pregledna vrsta).
//
// The job: "I have a pile of invoices. Get them into the books with as little typing
// as possible, but nothing gets paid that a person hasn't looked at."
//
//   /m/invoice_ocr                 tabs Za pregled (n) / Obdelano, drop files anywhere
//   /m/invoice_ocr?nov=1           same, with the drop zone pulsing (Home tile, ⌘K)
//   /m/invoice_ocr?tab=obdelano&q= processed invoices, vendor search, CSV, "Vrni v pregled"
//   /m/invoice_ocr?id=…            the focused review page: original next to editable
//                                  fields, A approves and jumps to the next, R rejects,
//                                  J/K move through the queue
//
// Clicks per invoice: drop the files once, then ONE key press (A) per invoice.
// Copy the shape for any "AI drafts, a person decides" tool: expenses, contracts, CVs.
import Link from "next/link";
import { CheckCheck, Download, FileQuestion, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { ModuleProps } from "@/lib/modules";
import { formatDate, formatRelative } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { StatusBadge } from "@/components/app/status-badge";
import { DataList, ListRow } from "@/components/app/data-list";
import { DONE_LIMIT } from "./constants";
import { dueInfo, money, statusBadge } from "./lib/invoice-format";
import { t, type InvoiceStatus } from "./strings";
import {
  UploadProvider,
  UploadButton,
  DropZone,
  ReadingRows,
  HideWhileReading,
} from "./components/uploader";
import { QueueTabs, type QueueTab } from "./components/queue-tabs";
import { ReopenButton } from "./components/reopen-button";
import { ReviewNav, ReviewSession } from "./components/review-nav";
import { ReviewForm, type ReviewInvoice, type ReviewLine } from "./components/review-form";

const BASE = "/m/invoice_ocr";
const TABLE = "invoice_ocr_invoices";
const BUCKET = "invoice_ocr";
const EXPORT_HREF = "/api/invoice_ocr/export";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ListInvoice = {
  id: string;
  vendor: string | null;
  invoice_number: string | null;
  issue_date: string | null;
  due_date: string | null;
  currency: string | null;
  total_amount: number | null;
  status: InvoiceStatus;
  revision: number;
  extracted_mock: boolean;
  reviewed_at: string | null;
  comment: string | null;
};
const LIST_COLS =
  "id, vendor, invoice_number, issue_date, due_date, currency, total_amount, status, extracted_mock, reviewed_at, comment, revision";

export async function InvoiceOcrModule({ searchParams }: ModuleProps) {
  if (searchParams.id) return <ReviewPage id={searchParams.id} />;
  return (
    <QueuePage
      tab={searchParams.tab === "obdelano" ? "obdelano" : "pregled"}
      q={searchParams.q?.trim() ?? ""}
      highlight={searchParams.nov === "1"}
    />
  );
}

// ================================================================== the queue

async function QueuePage({ tab, q, highlight }: { tab: QueueTab; q: string; highlight: boolean }) {
  const supabase = await createClient();

  // Two cheap queries, both RLS-scoped to the signed-in user. The queue runs oldest
  // first (first in, first reviewed); Obdelano shows the latest decisions first.
  let doneQuery = supabase
    .from(TABLE)
    .select(LIST_COLS)
    .neq("status", "pending")
    .order("reviewed_at", { ascending: false, nullsFirst: false })
    .limit(DONE_LIMIT);
  if (q) doneQuery = doneQuery.ilike("vendor", `%${escapeLike(q)}%`);
  const [pendingRes, doneRes] = await Promise.all([
    supabase
      .from(TABLE)
      .select(LIST_COLS)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    doneQuery,
  ]);
  const pending = (pendingRes.data ?? []) as ListInvoice[];
  const done = (doneRes.data ?? []) as ListInvoice[];
  const firstRun = !pending.length && !done.length && !q;

  return (
    <UploadProvider highlight={highlight}>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <>
            {pending.length ? (
              <Button variant="outline" render={<Link href={`${BASE}?id=${pending[0].id}`} />}>
                <CheckCheck />
                {t.queue.startReview}
              </Button>
            ) : null}
            <UploadButton />
          </>
        }
      />

      <QueueTabs
        defaultTab={tab}
        queueCount={pending.length}
        queue={
          firstRun ? (
            <>
              <ReadingRows />
              <DropZone hero title={t.queue.firstTitle} text={t.queue.firstText} />
            </>
          ) : (
            <div className="space-y-4">
              <DropZone />
              <div>
                <ReadingRows />
                {pending.length ? (
                  <DataList>
                    {pending.map((inv) => (
                      <QueueRow key={inv.id} inv={inv} />
                    ))}
                  </DataList>
                ) : (
                  <HideWhileReading>
                    <EmptyState
                      icon={CheckCheck}
                      title={t.queue.emptyTitle}
                      action={
                        done.length ? (
                          <Button variant="outline" render={<a href={EXPORT_HREF} />}>
                            <Download />
                            {t.done.export}
                          </Button>
                        ) : undefined
                      }
                    >
                      {t.queue.emptyText}
                    </EmptyState>
                  </HideWhileReading>
                )}
              </div>
            </div>
          )
        }
        done={<DoneList rows={done} q={q} />}
      />
    </UploadProvider>
  );
}

/** One invoice waiting for review. The whole row opens the review page. */
function QueueRow({ inv }: { inv: ListInvoice }) {
  const due = dueInfo(inv.due_date);
  const missing = !inv.vendor || inv.total_amount === null;
  const meta = [
    inv.invoice_number ? t.queue.number(inv.invoice_number) : null,
    inv.issue_date ? t.queue.issued(formatDate(inv.issue_date)) : null,
  ].filter(Boolean);
  return (
    <ListRow
      href={`${BASE}?id=${inv.id}`}
      scroll
      title={inv.vendor ?? t.queue.unknownVendor}
      // The due date leads: on a phone the meta line truncates, and "zapadlo" matters most.
      meta={
        <>
          {due ? <span className={toneText[due.tone]}>{due.label}</span> : null}
          {due && meta.length ? " · " : null}
          {meta.join(" · ")}
        </>
      }
      trailing={
        <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
          <span className="font-semibold tabular-nums">
            {money(inv.total_amount, inv.currency)}
          </span>
          {missing ? (
            <StatusBadge tone="attention">{t.queue.missing}</StatusBadge>
          ) : inv.extracted_mock ? (
            <StatusBadge tone="info">{t.review.demo}</StatusBadge>
          ) : (
            <StatusBadge tone="neutral">{t.status.pending}</StatusBadge>
          )}
        </div>
      }
    />
  );
}

// Due-date text colour by tone (StatusBadge's palette, as text).
const toneText = {
  neutral: "",
  info: "text-info",
  attention: "font-medium text-foreground",
  good: "text-success",
  danger: "font-medium text-destructive",
} as const;

/** Obdelano: approved and rejected invoices, newest decision first. */
function DoneList({ rows, q }: { rows: ListInvoice[]; q: string }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* A plain GET form: the search lives in the URL (?q=), no client state. */}
        <form action={BASE} className="flex min-w-0 flex-1 gap-2">
          <input type="hidden" name="tab" value="obdelano" />
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              type="search"
              defaultValue={q}
              placeholder={t.done.searchPlaceholder}
              aria-label={t.done.searchPlaceholder}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline">
            {t.done.search}
          </Button>
          {q ? (
            <Button variant="ghost" render={<Link href={`${BASE}?tab=obdelano`} />}>
              {t.done.clear}
            </Button>
          ) : null}
        </form>
        <Button variant="outline" render={<a href={EXPORT_HREF} />}>
          <Download />
          {t.done.export}
        </Button>
      </div>

      {rows.length ? (
        <>
          <DataList>
            {rows.map((inv) => {
              const badge = statusBadge(inv.status);
              const meta = [
                inv.invoice_number ? t.queue.number(inv.invoice_number) : null,
                inv.reviewed_at ? t.done.reviewed(formatRelative(inv.reviewed_at)) : null,
                inv.comment,
              ].filter(Boolean);
              return (
                <ListRow
                  key={inv.id}
                  href={`${BASE}?id=${inv.id}`}
                  scroll
                  title={inv.vendor ?? t.queue.unknownVendor}
                  meta={meta.join(" · ")}
                  trailing={
                    <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <span className="font-semibold tabular-nums">
                        {money(inv.total_amount, inv.currency)}
                      </span>
                      <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                    </div>
                  }
                  actions={<ReopenButton id={inv.id} revision={inv.revision} />}
                />
              );
            })}
          </DataList>
          {rows.length === DONE_LIMIT ? (
            <p className="px-1 text-sm text-muted-foreground">{t.done.limited(DONE_LIMIT)}</p>
          ) : null}
        </>
      ) : q ? (
        <EmptyState icon={Search} title={t.done.noMatchTitle}>
          {t.done.noMatchText(q)}
        </EmptyState>
      ) : (
        <EmptyState icon={CheckCheck} title={t.done.emptyTitle}>
          {t.done.emptyText}
        </EmptyState>
      )}
    </div>
  );
}

// ================================================================== review page

async function ReviewPage({ id }: { id: string }) {
  const supabase = await createClient();
  // RLS: a foreign or unknown id simply returns nothing.
  const { data } = UUID.test(id)
    ? await supabase
        .from(TABLE)
        .select(
          "id, file_path, file_mime, vendor, invoice_number, issue_date, due_date, currency, net_amount, tax_amount, total_amount, status, extracted_mock, reviewed_at, comment, revision",
        )
        .eq("id", id)
        .maybeSingle()
    : { data: null };
  if (!data) {
    return (
      <EmptyState
        icon={FileQuestion}
        title={t.review.notFound}
        action={<Button render={<Link href={BASE} />}>{t.review.back}</Button>}
      >
        {t.review.notFoundText}
      </EmptyState>
    );
  }
  const inv = data as ReviewInvoice & {
    file_path: string;
    file_mime: string;
    extracted_mock: boolean;
    reviewed_at: string | null;
  };

  // Everything else the page needs, in parallel: the private file's signed URL, the
  // line items, the queue (for "3 / 7" and J/K) and a possible duplicate.
  const [signed, linesRes, queueRes, dupRes] = await Promise.all([
    supabase.storage.from(BUCKET).createSignedUrl(inv.file_path, 3600),
    supabase
      .from("invoice_ocr_line_items")
      .select("line_no, description, quantity, unit, unit_price, tax_rate, total_amount")
      .eq("invoice_id", inv.id)
      .order("line_no", { ascending: true }),
    supabase
      .from(TABLE)
      .select("id")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    inv.vendor && inv.invoice_number
      ? supabase
          .from(TABLE)
          .select("id")
          .eq("vendor", inv.vendor)
          .eq("invoice_number", inv.invoice_number)
          .neq("id", inv.id)
          .limit(1)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ]);
  const url = signed.data?.signedUrl ?? null;
  const lines = (linesRes.data ?? []) as ReviewLine[];
  const queue = ((queueRes.data ?? []) as { id: string }[]).map((r) => r.id);
  const duplicateId = (dupRes.data?.[0]?.id as string | undefined) ?? null;

  const at = queue.indexOf(inv.id);
  const position = at >= 0 ? { index: at + 1, total: queue.length } : null;
  const backHref = inv.status === "pending" ? BASE : `${BASE}?tab=obdelano`;
  const badge = statusBadge(inv.status);

  // key: fresh session state (dirty, reject panel) for every invoice J/K or A lands on.
  return (
    <ReviewSession key={inv.id}>
      <div className="space-y-6 max-lg:pb-40">
        <ReviewNav
          backHref={backHref}
          position={position}
          prevId={at > 0 ? queue[at - 1] : null}
          nextId={at >= 0 && at < queue.length - 1 ? queue[at + 1] : null}
        />

        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            {inv.vendor ?? t.queue.unknownVendor}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {inv.status !== "pending" ? (
              <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
            ) : null}
            {inv.extracted_mock ? (
              <span title={t.review.demoHint} className="cursor-help">
                <StatusBadge tone="info">{t.review.demo}</StatusBadge>
              </span>
            ) : null}
            {duplicateId ? (
              <Link href={`${BASE}?id=${duplicateId}`} title={t.review.duplicateHint}>
                <StatusBadge tone="danger">{t.review.duplicate}</StatusBadge>
              </Link>
            ) : null}
            {inv.status !== "pending" && inv.reviewed_at ? (
              <span className="text-sm text-muted-foreground">
                {t.review.statusNote(badge.label, formatRelative(inv.reviewed_at))}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:items-start">
          {/* The original stays in view while you scroll the fields (desktop). */}
          <section className="space-y-2 lg:sticky lg:top-24" aria-label={t.review.original}>
            <div className="overflow-hidden rounded-2xl bg-card shadow-xs ring-1 ring-foreground/8">
              {url ? (
                inv.file_mime.startsWith("image/") ? (
                  // A signed URL to a private object; a plain <img> avoids next/image remote config.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={t.review.imageAlt}
                    className="max-h-[45vh] w-full object-contain lg:max-h-[calc(100vh-9rem)]"
                  />
                ) : (
                  <iframe
                    src={url}
                    title={t.review.pdfTitle}
                    className="h-[45vh] w-full lg:h-[calc(100vh-9rem)]"
                  />
                )
              ) : (
                <p className="px-6 py-16 text-center text-muted-foreground">{t.review.noPreview}</p>
              )}
            </div>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-block px-1 text-sm text-primary underline-offset-4 hover:underline"
              >
                {t.review.openOriginal}
              </a>
            ) : null}
          </section>

          {/* key: a fresh form (and fresh field state) for every invoice J/K or A lands on. */}
          <ReviewForm key={inv.id} invoice={inv} lines={lines} requestId={crypto.randomUUID()} />
        </div>
      </div>
    </ReviewSession>
  );
}

/** ilike treats % and _ as wildcards; a vendor search should match them literally. */
function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}
