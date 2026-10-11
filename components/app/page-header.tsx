// Page title + one-line "what is this for" + the primary action on the right.
// On phones the primary action becomes a sticky button at the bottom of the screen.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">{title}</h1>
        {description ? (
          <p className="max-w-prose text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-2 max-sm:fixed max-sm:inset-x-4 max-sm:bottom-4 max-sm:z-30 max-sm:[&>*]:flex-1 max-sm:[&>*]:shadow-lg">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
