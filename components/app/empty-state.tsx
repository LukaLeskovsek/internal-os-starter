// The friendly "nothing here yet" — always offer the next step.
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-3xl border border-dashed bg-card/50 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <Icon className="size-7" />
        </div>
      ) : null}
      <h2 className="text-lg font-semibold">{title}</h2>
      {children ? (
        <p className="mt-1 max-w-sm text-muted-foreground">{children}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
