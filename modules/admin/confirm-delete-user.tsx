"use client";

// "Are you sure?" before permanently deleting an account. Opened from the row
// menu, so it is controlled (open / onOpenChange) rather than having a trigger.
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";
import { sl } from "@/lib/i18n/sl";
import { deleteUser } from "./actions";
import { s } from "./strings";

export function ConfirmDeleteUser({
  userId,
  label,
  open,
  onOpenChange,
  onDeleted,
}: {
  userId: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const run = useActionToast();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{s.deleteTitle(label)}</AlertDialogTitle>
          <AlertDialogDescription>{s.deleteText}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{sl.common.cancel}</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={run.pending}
            onClick={() =>
              run(() => deleteUser(userId), {
                onSuccess: () => {
                  onOpenChange(false);
                  onDeleted?.();
                },
              })
            }
          >
            {run.pending ? <Loader2 className="animate-spin" /> : null}
            {run.pending ? s.deleting : s.delete}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
