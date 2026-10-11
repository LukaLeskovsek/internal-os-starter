// Read-only "label: value" for detail views.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Info({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium break-words">{children || "—"}</dd>
    </div>
  );
}

export function InfoGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("grid gap-x-6 gap-y-4 sm:grid-cols-2", className)}>{children}</dl>;
}
