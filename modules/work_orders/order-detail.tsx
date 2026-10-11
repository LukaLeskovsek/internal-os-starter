"use client";

// The detail sheet (?id=…): everything you can do to one work order without
// leaving the list. Status is a three-way segmented control, title and
// description edit in place, the creator can reassign and delete. Closing
// returns to the same filter.
import { useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { DetailSheet } from "@/components/app/detail-sheet";
import { ActionForm } from "@/components/app/action-form";
import { Field } from "@/components/app/field";
import { Info, InfoGrid } from "@/components/app/info";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useActionToast } from "@/hooks/use-action-toast";
import { sl } from "@/lib/i18n/sl";
import { cn } from "@/lib/utils";
import {
  deleteWorkOrder,
  reassignWorkOrder,
  setWorkOrderStatus,
  updateWorkOrder,
} from "./actions";
import { STATUS, STATUSES, t, type Status } from "./strings";
import type { PersonOption } from "./types";

export type OrderDetailData = {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  assigneeId: string | null;
  assigneeLabel: string;
  customerLabel: string;
  creatorLabel: string;
  createdLabel: string;
  isCreator: boolean;
};

export function OrderDetail({
  order,
  people,
  closeHref,
}: {
  order: OrderDetailData;
  people: PersonOption[];
  closeHref: string;
}) {
  return (
    <DetailSheet
      title={order.title}
      description={order.customerLabel}
      closeHref={closeHref}
      footer={order.isCreator ? <DeleteOrder id={order.id} closeHref={closeHref} /> : null}
    >
      <StatusControl id={order.id} status={order.status} />

      <InfoGrid>
        {order.isCreator ? (
          <AssigneePicker id={order.id} assigneeId={order.assigneeId} people={people} />
        ) : (
          <Info label={t.assignee}>{order.assigneeLabel}</Info>
        )}
        <Info label={t.customer}>{order.customerLabel}</Info>
        <Info label={t.createdBy}>{order.creatorLabel}</Info>
        <Info label={t.createdAt}>{order.createdLabel}</Info>
      </InfoGrid>

      {/* key: a fresh form when another order opens in the same sheet. */}
      <ActionForm key={order.id} action={updateWorkOrder} resetOnSuccess={false}>
        <input type="hidden" name="id" value={order.id} />
        <Field label={t.orderTitle} name="title">
          <Input id="title" name="title" defaultValue={order.title} maxLength={200} required />
        </Field>
        <Field label={t.descriptionLabel} name="description" optional>
          <Textarea
            id="description"
            name="description"
            defaultValue={order.description ?? ""}
            placeholder={t.descriptionPlaceholder}
            maxLength={4000}
            rows={4}
          />
        </Field>
        <SubmitButton variant="secondary" pendingText={sl.common.saving}>
          {t.saveChanges}
        </SubmitButton>
      </ActionForm>
    </DetailSheet>
  );
}

/** Odprt / V delu / Zaključen as one segmented control. Optimistic, undoable. */
function StatusControl({ id, status: saved }: { id: string; status: Status }) {
  const run = useActionToast();
  const [status, setOptimisticStatus] = useOptimistic(saved);

  function choose(next: Status) {
    if (next === status) return;
    run(
      async () => {
        setOptimisticStatus(next);
        return setWorkOrderStatus(id, next);
      },
      { undo: () => setWorkOrderStatus(id, saved) },
    );
  }

  return (
    <div role="radiogroup" aria-label={t.status} className="flex gap-1 rounded-2xl bg-muted p-1">
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={s === status}
          onClick={() => choose(s)}
          className={cn(
            "h-10 flex-1 rounded-xl text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            s === status
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {STATUS[s].label}
        </button>
      ))}
    </div>
  );
}

/** Creator only: pick someone else, with "Razveljavi" back to the previous person. */
function AssigneePicker({
  id,
  assigneeId: saved,
  people,
}: {
  id: string;
  assigneeId: string | null;
  people: PersonOption[];
}) {
  const run = useActionToast();
  const [assigneeId, setOptimisticAssignee] = useOptimistic(saved);

  function choose(next: string | null) {
    if (!next || next === assigneeId) return;
    run(
      async () => {
        setOptimisticAssignee(next);
        return reassignWorkOrder(id, next);
      },
      { undo: saved ? () => reassignWorkOrder(id, saved) : undefined },
    );
  }

  return (
    <div className="min-w-0">
      <dt className="mb-1 text-sm text-muted-foreground">{t.assignee}</dt>
      <dd>
        <Select items={people} value={assigneeId} onValueChange={choose}>
          <SelectTrigger className="w-full" aria-label={t.assignee}>
            <SelectValue placeholder={t.unassigned} />
          </SelectTrigger>
          <SelectContent>
            {people.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </dd>
    </div>
  );
}

/** Creator only, and permanent, so it asks first. */
function DeleteOrder({ id, closeHref }: { id: string; closeHref: string }) {
  const run = useActionToast();
  const router = useRouter();

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="destructive" className="w-full">
            <Trash2 />
            {t.deleteOrder}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{t.deleteConfirmText}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{sl.common.cancel}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={run.pending}
            onClick={() =>
              run(() => deleteWorkOrder(id), {
                onSuccess: () => router.push(closeHref, { scroll: false }),
              })
            }
          >
            {sl.common.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
