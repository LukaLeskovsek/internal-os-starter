// Lists are rows, not wide tables: readable on a phone, scannable on a laptop.
//
// <DataList>
//   <ListRow href="?id=1" title="Servis klime" meta="Petrol · danes" trailing={<StatusBadge…/>} />
// </DataList>
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DataList({ children, className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn(
        "divide-y overflow-hidden rounded-2xl bg-card shadow-xs ring-1 ring-foreground/8",
        className,
      )}
      {...props}
    >
      {children}
    </ul>
  );
}

export function ListRow({
  href,
  leading,
  title,
  meta,
  trailing,
  actions,
  className,
  hideLeadingOnMobile = false,
  scroll = false,
}: {
  href?: string;
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  /** Buttons that must stay clickable on top of the row link. */
  actions?: ReactNode;
  className?: string;
  /** Hide the leading tile on phones (it can crowd the title). */
  hideLeadingOnMobile?: boolean;
  scroll?: boolean;
}) {
  return (
    <li
      className={cn(
        "relative flex items-center gap-3 px-4 py-3.5 transition-colors sm:px-5",
        href && "hover:bg-accent/50",
        className,
      )}
    >
      {leading ? (
        <div className={cn("shrink-0", hideLeadingOnMobile && "max-sm:hidden")}>{leading}</div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">
          {href ? (
            <Link href={href} scroll={scroll} className="outline-none after:absolute after:inset-0 focus-visible:underline">
              {title}
            </Link>
          ) : (
            title
          )}
        </div>
        {meta ? <div className="mt-0.5 truncate text-sm text-muted-foreground">{meta}</div> : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
      {actions ? <div className="relative z-10 flex shrink-0 items-center gap-1">{actions}</div> : null}
    </li>
  );
}

/** A small heading above a list ("Danes", "Ta teden"). */
export function ListHeading({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2 mt-8 flex items-baseline justify-between px-1 first:mt-0">
      <h2 className="text-sm font-semibold text-muted-foreground">{children}</h2>
      {aside ? <div className="text-sm text-muted-foreground">{aside}</div> : null}
    </div>
  );
}
