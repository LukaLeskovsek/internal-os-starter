"use client";

// "Vrni v pregled" on an Obdelano row: a typed button action with undo. The undo puts
// back the exact status the invoice had (Potrjen or Zavrnjen).
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";
import { reopenInvoice, undoInvoice } from "../actions";
import { t } from "../strings";

export function ReopenButton({ id, revision }: { id: string; revision: number }) {
  const run = useActionToast();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={run.pending}
      onClick={() => {
        const requestId = crypto.randomUUID();
        run(() => reopenInvoice(id, revision, requestId), {
          undo: (res) => undoInvoice(id, res.data!.revision, res.data!.requestId, crypto.randomUUID()),
        });
      }}
    >
      <RotateCcw />
      <span className="max-sm:sr-only">{t.done.reopen}</span>
    </Button>
  );
}
