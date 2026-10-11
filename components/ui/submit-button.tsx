"use client";

// Submit button for Server Action forms. While the action runs it shows a
// spinner AND disables itself — so the user gets feedback and can't double-click.
// DONE — use this for every form submit instead of a bare <button>/<Button>.
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type ComponentProps, useContext } from "react";
import { FormPending } from "@/components/app/action-form";

type Props = ComponentProps<typeof Button> & { pendingText?: string };

export function SubmitButton({
  children,
  pendingText,
  disabled,
  ...props
}: Props) {
  // Works in plain <form action> forms AND inside <ActionForm>.
  const { pending: formPending } = useFormStatus();
  const ctxPending = useContext(FormPending);
  const pending = formPending || ctxPending;
  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          {pendingText ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
