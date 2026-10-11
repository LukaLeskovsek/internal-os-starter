"use client";

// One work order in the list, with its next step one tap away ("Začni" →
// "Zaključi"). The badge flips immediately (useOptimistic) and the toast offers
// "Razveljavi", so a mis-tap on a phone costs nothing.
import { useOptimistic } from "react";
import { Check, Play } from "lucide-react";
import { ListRow } from "@/components/app/data-list";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";
import { setWorkOrderStatus } from "./actions";
import { STATUS } from "./strings";
import type { OrderRowData } from "./types";

export function OrderRow({ order }: { order: OrderRowData }) {
  const run = useActionToast();
  const [status, setOptimisticStatus] = useOptimistic(order.status);
  const next = STATUS[status].next;

  function advance() {
    if (!next) return;
    const previous = order.status;
    run(
      async () => {
        setOptimisticStatus(next.to);
        return setWorkOrderStatus(order.id, next.to);
      },
      { undo: () => setWorkOrderStatus(order.id, previous) },
    );
  }

  return (
    <ListRow
      href={order.href}
      title={order.title}
      meta={order.meta}
      trailing={
        // On a phone the next-step button already says where the order stands.
        <StatusBadge tone={STATUS[status].tone} className={next ? "max-sm:hidden" : undefined}>
          {STATUS[status].label}
        </StatusBadge>
      }
      actions={
        next ? (
          <Button variant="outline" size="sm" className="h-10 px-3" onClick={advance} disabled={run.pending}>
            {next.to === "zakljucen" ? <Check /> : <Play />}
            {next.label}
          </Button>
        ) : null
      }
    />
  );
}
