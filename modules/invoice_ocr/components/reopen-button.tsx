"use client";

// "Vrni v pregled" on an Obdelano row: a typed button action with undo. The undo puts
// back the exact status the invoice had (Potrjen or Zavrnjen).
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";
import { setInvoiceStatus } from "../actions";
import { t, type InvoiceStatus } from "../strings";

export function ReopenButton({ id, status }: { id: string; status: InvoiceStatus }) {
  const run = useActionToast();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={run.pending}
      onClick={() => run(() => setInvoiceStatus(id, "pending"), { undo: () => setInvoiceStatus(id, status) })}
    >
      <RotateCcw />
      <span className="max-sm:sr-only">{t.done.reopen}</span>
    </Button>
  );
}
