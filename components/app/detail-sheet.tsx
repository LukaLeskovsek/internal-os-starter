"use client";

// A detail view that slides over the list, driven by the URL (?id=…) so it can be
// linked and survives refresh. The server renders it only when ?id is set.
//
// {selected ? <DetailSheet title={…} closeHref="/m/work_orders?f=moji">…</DetailSheet> : null}
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function DetailSheet({
  title,
  description,
  closeHref,
  children,
  footer,
}: {
  title: ReactNode;
  description?: ReactNode;
  closeHref: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const router = useRouter();
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) router.push(closeHref, { scroll: false });
      }}
    >
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="pr-8">{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="flex-1 space-y-6 px-5 pb-5">{children}</div>
        {footer ? <div className="border-t p-5">{footer}</div> : null}
      </SheetContent>
    </Sheet>
  );
}
