"use client";

// The standard way to create or edit something: a sheet (bottom on phones, side
// panel on desktop) with an ActionForm inside. Closes itself on success.
//
// <FormSheet trigger={<Button>Nova pot</Button>} title="Nova pot"
//            action={createTrip} submitLabel="Shrani pot" defaultOpen={sp.nov === "1"}>
//   …fields…
// </FormSheet>
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm, type FormAction } from "@/components/app/action-form";
import { useHotkey } from "@/hooks/use-hotkey";
import { sl } from "@/lib/i18n/sl";

export function FormSheet({
  trigger,
  title,
  description,
  action,
  submitLabel = sl.common.save,
  pendingLabel = sl.common.saving,
  defaultOpen = false,
  hotkey,
  open: openProp,
  onOpenChange,
  onSuccess,
  silent,
  children,
}: {
  trigger?: React.ReactElement;
  title: ReactNode;
  description?: ReactNode;
  action: FormAction;
  submitLabel?: ReactNode;
  pendingLabel?: string;
  /** Open on load — pass `searchParams.nov === "1"` so Home/⌘K can deep-link here. */
  defaultOpen?: boolean;
  /** Single key that opens the sheet, e.g. "n". */
  hotkey?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Runs after a successful save (the sheet closes either way). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess?: (result: { ok: true; message?: string; data?: any }) => void;
  /** Skip the default success toast (e.g. you show your own in onSuccess). */
  silent?: boolean;
  children: ReactNode;
}) {
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const open = openProp ?? ownOpen;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setOpen = (next: boolean) => {
    setOwnOpen(next);
    onOpenChange?.(next);
    // Closing a deep-linked sheet drops ?nov=1 so a refresh doesn't reopen it.
    if (!next && params.get("nov")) {
      const qs = new URLSearchParams(params.toString());
      qs.delete("nov");
      router.replace(qs.size ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  };

  // A link to ?nov=1 on the same page (e.g. the EmptyState button) opens the sheet too.
  const nov = params.get("nov") === "1";
  useEffect(() => {
    if (nov && defaultOpen !== false) setOwnOpen(true);
  }, [nov, defaultOpen]);

  useHotkey(hotkey, () => setOpen(true), { enabled: !!hotkey && !open });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger ? <SheetTrigger render={trigger} /> : null}
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <ActionForm
          action={action}
          silent={silent}
          onSuccess={(r) => {
            setOpen(false);
            onSuccess?.(r);
          }}
          className="flex flex-1 flex-col px-5 pb-5">
          <div className="space-y-5">{children}</div>
          <div className="mt-auto flex gap-2 pt-6">
            <SubmitButton size="lg" className="flex-1" pendingText={pendingLabel}>
              {submitLabel}
            </SubmitButton>
          </div>
        </ActionForm>
      </SheetContent>
    </Sheet>
  );
}
