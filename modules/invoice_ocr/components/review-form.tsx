"use client";

// The heart of the review queue: everything the AI read, prefilled and editable, and
// one decision. "Potrdi in naprej" (A) saves the corrections + approves + jumps to the
// next invoice in ONE call; "Zavrni" (R) first shows reason chips, R again rejects.
//
// Why controlled inputs? So the screen reacts while you type: an emptied field gets the
// warning ring, the net + DDV = skupaj check updates live, and J/K knows when there
// are corrections that would be lost.
import { useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm, FormPending } from "@/components/app/action-form";
import { Field } from "@/components/app/field";
import { KbdHint } from "@/components/app/kbd-hint";
import { useHotkey } from "@/hooks/use-hotkey";
import { sl } from "@/lib/i18n/sl";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { decideInvoice, setInvoiceStatus } from "../actions";
import { amountInput, money, parseAmount, sumMatches } from "../lib/invoice-format";
import { t, type InvoiceStatus } from "../strings";
import { useReviewSession } from "./review-nav";

const BASE = "/m/invoice_ocr";
const FORM_ID = "invoice-review";

export type ReviewInvoice = {
  id: string;
  status: InvoiceStatus;
  vendor: string | null;
  invoice_number: string | null;
  currency: string | null;
  issue_date: string | null;
  due_date: string | null;
  net_amount: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  comment: string | null;
};

export type ReviewLine = {
  line_no: number;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  tax_rate: number | null;
  total_amount: number | null;
};

type Values = {
  vendor: string;
  invoice_number: string;
  currency: string;
  issue_date: string;
  due_date: string;
  net_amount: string;
  tax_amount: string;
  total_amount: string;
  comment: string;
};

// Fields the AI should have read. Empty ones get the warning ring.
const CHECKED: (keyof Values)[] = [
  "vendor",
  "invoice_number",
  "currency",
  "issue_date",
  "due_date",
  "net_amount",
  "tax_amount",
  "total_amount",
];

export function ReviewForm({ invoice, lines }: { invoice: ReviewInvoice; lines: ReviewLine[] }) {
  const router = useRouter();
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const { rejecting, setRejecting, setDirty } = useReviewSession();
  const [initial] = useState<Values>(() => ({
    vendor: invoice.vendor ?? "",
    invoice_number: invoice.invoice_number ?? "",
    currency: invoice.currency ?? "",
    issue_date: invoice.issue_date ?? "",
    due_date: invoice.due_date ?? "",
    net_amount: amountInput(invoice.net_amount),
    tax_amount: amountInput(invoice.tax_amount),
    total_amount: amountInput(invoice.total_amount),
    comment: invoice.comment ?? "",
  }));
  const [v, setV] = useState<Values>(initial);

  // Tell the nav whether J/K would throw corrections away.
  const dirty = (Object.keys(initial) as (keyof Values)[]).some((k) => v[k] !== initial[k]);
  useEffect(() => setDirty(dirty), [dirty, setDirty]);

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((prev) => ({ ...prev, [k]: e.target.value }));
  const warn = (k: keyof Values) => CHECKED.includes(k) && v[k].trim() === "";
  const input = (k: keyof Values, extra?: React.ComponentProps<typeof Input>) => (
    <Input
      id={k}
      name={k}
      value={v[k]}
      onChange={set(k)}
      aria-describedby={warn(k) ? "review-empty-hint" : undefined}
      {...extra}
      className={cn(warn(k) && "border-warning ring-3 ring-warning/30", extra?.className)}
    />
  );

  // The sum check, live. null = an amount is missing, so there's nothing to compare.
  const net = parseAmount(v.net_amount);
  const tax = parseAmount(v.tax_amount);
  const total = parseAmount(v.total_amount);
  const sumOk = sumMatches(net, tax, total);
  const expected = net !== null && tax !== null ? Math.round((net + tax) * 100) / 100 : null;
  const currency = v.currency.trim().toUpperCase() || "EUR";

  /** Hotkeys "press" the matching button, so the form sends decision=approve|reject. */
  const submit = (decision: "approve" | "reject") => {
    const form = document.getElementById(FORM_ID) as HTMLFormElement | null;
    const button = form?.querySelector<HTMLButtonElement>(`button[name=decision][value=${decision}]`);
    if (form && button) form.requestSubmit(button);
  };

  const pickReason = (reason: string) => {
    setV((prev) => {
      const current = prev.comment.trim();
      // Replace a previous chip; keep anything the person typed themselves.
      const typed = (t.review.reasons as readonly string[]).includes(current) ? "" : current;
      return { ...prev, comment: typed ? `${reason}. ${typed}` : reason };
    });
  };

  const anyEmpty = CHECKED.some(warn);

  return (
    <ActionForm
      id={FORM_ID}
      action={decideInvoice}
      silent
      resetOnSuccess={false}
      className="space-y-6"
      onSuccess={(res) => {
        // Undo puts back the status it had before (pending, or the earlier decision)
        // and opens it again. The corrections stay saved.
        toast.success(res.message ?? sl.common.saved, {
          action: {
            label: sl.common.undo,
            onClick: async () => {
              const r = await setInvoiceStatus(invoice.id, invoice.status);
              if (!r.ok) return void toast.error(r.error);
              router.replace(`${BASE}?id=${invoice.id}`);
            },
          },
        });
        const nextId = res.data?.nextId;
        if (nextId && nextId !== invoice.id) router.replace(`${BASE}?id=${nextId}`);
        else router.replace(`${BASE}?tab=pregled`); // empty queue → "Vse pregledano"
      }}
    >
      <input type="hidden" name="id" value={invoice.id} />
      <Hotkeys rejecting={rejecting} onApprove={() => submit("approve")} onReject={() => (rejecting ? submit("reject") : setRejecting(true))} />

      {anyEmpty ? (
        <p id="review-empty-hint" className="flex items-start gap-2 rounded-2xl bg-warning/15 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          {t.review.emptyHint}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        <Field label={t.review.fields.vendor} name="vendor" className="col-span-2">
          {input("vendor", { autoComplete: "off" })}
        </Field>
        <Field label={t.review.fields.number} name="invoice_number">
          {input("invoice_number", { autoComplete: "off" })}
        </Field>
        <Field label={t.review.fields.currency} name="currency">
          {input("currency", { maxLength: 3, className: "uppercase", autoComplete: "off" })}
        </Field>
        <Field label={t.review.fields.issueDate} name="issue_date">
          {input("issue_date", { type: "date" })}
        </Field>
        <Field label={t.review.fields.dueDate} name="due_date">
          {input("due_date", { type: "date" })}
        </Field>
      </div>

      <div className="rounded-2xl bg-muted/50 p-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label={t.review.fields.net} name="net_amount">
            {input("net_amount", { inputMode: "decimal", className: "text-right tabular-nums" })}
          </Field>
          <Field label={t.review.fields.tax} name="tax_amount">
            {input("tax_amount", { inputMode: "decimal", className: "text-right tabular-nums" })}
          </Field>
          <Field label={t.review.fields.total} name="total_amount">
            {input("total_amount", { inputMode: "decimal", className: "text-right font-semibold tabular-nums" })}
          </Field>
        </div>
        {sumOk === true ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="size-4 shrink-0" />
            {t.review.sumOk}
          </p>
        ) : sumOk === false && expected !== null ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              {t.review.sumOff(money(expected, currency))}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setV((prev) => ({ ...prev, total_amount: amountInput(expected) }))}
            >
              {t.review.sumFix}
            </Button>
          </div>
        ) : null}
      </div>

      <details className="group rounded-2xl ring-1 ring-foreground/8">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-medium select-none [&::-webkit-details-marker]:hidden">
          <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
          {t.review.lines(lines.length)}
        </summary>
        <div className="border-t px-4 py-2">
          {lines.length ? (
            <ul className="divide-y">
              {lines.map((li) => (
                <li key={li.line_no} className="flex items-baseline gap-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium break-words">{li.description ?? "—"}</div>
                    <div className="text-muted-foreground tabular-nums">
                      {formatNumber(li.quantity, 3)} {li.unit ?? ""} × {money(li.unit_price, currency)}
                      {li.tax_rate !== null ? ` · DDV ${formatNumber(li.tax_rate)} %` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 font-medium tabular-nums">{money(li.total_amount, currency)}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">{t.review.noLines}</p>
          )}
        </div>
      </details>

      <Field label={t.review.fields.comment} name="comment" optional={!rejecting}>
        <Textarea
          ref={commentRef}
          id="comment"
          name="comment"
          rows={2}
          maxLength={2000}
          value={v.comment}
          onChange={set("comment")}
          placeholder={t.review.commentPlaceholder}
        />
      </Field>

      {/* Sticky at the bottom of the column on desktop, pinned to the screen on phones. */}
      <div className="z-30 border-t bg-background/95 py-3 backdrop-blur max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:px-4 lg:sticky lg:bottom-0">
        {rejecting ? (
          <div className="mb-3 space-y-2">
            <p className="text-sm font-medium">{t.review.rejectTitle}</p>
            <div className="flex flex-wrap gap-2">
              {t.review.reasons.map((r) => (
                <Button key={r} type="button" variant="outline" size="sm" className="rounded-full" onClick={() => pickReason(r)}>
                  {r}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => commentRef.current?.focus()}
              >
                {t.review.otherReason}
              </Button>
            </div>
          </div>
        ) : null}
        <div className="flex gap-2">
          {rejecting ? (
            <>
              <Button type="button" variant="ghost" size="icon" onClick={() => setRejecting(false)} aria-label={t.review.rejectCancel}>
                <X />
              </Button>
              <SubmitButton name="decision" value="reject" variant="destructive" className="flex-1">
                {t.review.rejectConfirm}
                <KbdHint>R</KbdHint>
              </SubmitButton>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" className="flex-1" onClick={() => setRejecting(true)}>
                {t.review.reject}
                <KbdHint>R</KbdHint>
              </Button>
              <SubmitButton name="decision" value="approve" className="flex-[2]">
                {invoice.status === "pending" ? t.review.approveNext : t.review.approve}
                <KbdHint>A</KbdHint>
              </SubmitButton>
            </>
          )}
        </div>
      </div>
    </ActionForm>
  );
}

/** A / R, off while the decision is saving (no double submits). Lives inside the form to read FormPending. */
function Hotkeys({ rejecting, onApprove, onReject }: { rejecting: boolean; onApprove: () => void; onReject: () => void }) {
  const pending = useContext(FormPending);
  useHotkey("a", onApprove, { enabled: !pending && !rejecting });
  useHotkey("r", onReject, { enabled: !pending });
  return null;
}
