"use client";

// For button actions (status change, approve, delete…) that return ActionResult:
//
//   const run = useActionToast();
//   run(() => setStatus(id, "v_delu"), { undo: () => setStatus(id, "odprt") });
//   run(() => repeatTrip(id), { undo: (res) => deleteTrip(res.data!.id) });  // undo gets the result
//
// Shows a success/error toast, optionally with "Razveljavi".
import { useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";
import { sl } from "@/lib/i18n/sl";

export function useActionToast() {
  const [pending, startTransition] = useTransition();

  function run<T>(
    fn: () => Promise<ActionResult<T>>,
    opts: {
      undo?: (result: Extract<ActionResult<T>, { ok: true }>) => Promise<ActionResult<unknown>>;
      silent?: boolean;
      onSuccess?: (r: ActionResult<T>) => void;
    } = {},
  ) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      opts.onSuccess?.(res);
      if (opts.silent) return;
      toast.success(res.message ?? sl.common.saved, {
        action: opts.undo
          ? {
              label: sl.common.undo,
              onClick: () => {
                startTransition(async () => {
                  const r = await opts.undo!(res);
                  if (!r.ok) toast.error(r.error);
                });
              },
            }
          : undefined,
      });
    });
  }

  return Object.assign(run, { pending });
}
