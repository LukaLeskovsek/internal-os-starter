// URL-driven filter chips (?f=…): shareable, survive refresh, no client state.
import Link from "next/link";
import { cn } from "@/lib/utils";

export function FilterChips({
  base,
  param = "f",
  value,
  options,
  keep,
}: {
  base: string;
  param?: string;
  value: string;
  options: { value: string; label: string; count?: number }[];
  /** Other query params to keep when switching. */
  keep?: Record<string, string | undefined>;
}) {
  return (
    <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
      {options.map((o) => {
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(keep ?? {})) if (v) qs.set(k, v);
        qs.set(param, o.value);
        const active = o.value === value;
        return (
          <Link
            key={o.value}
            href={`${base}?${qs}`}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:bg-accent",
            )}
          >
            {o.label}
            {o.count !== undefined ? (
              <span className={cn("tabular-nums", active ? "opacity-80" : "text-muted-foreground")}>
                {o.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
