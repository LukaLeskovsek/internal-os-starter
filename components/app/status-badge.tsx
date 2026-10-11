// A soft coloured pill for statuses. Pick the tone by meaning, not by colour.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "info" | "attention" | "good" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-info/12 text-info",
  attention: "bg-warning/15 text-[color-mix(in_oklch,var(--warning),var(--foreground)_35%)]",
  good: "bg-success/12 text-success",
  danger: "bg-destructive/10 text-destructive",
};

export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Small dot for inline status (tile summaries). */
export function ToneDot({ tone = "neutral" }: { tone?: Tone }) {
  const dot: Record<Tone, string> = {
    neutral: "bg-muted-foreground/50",
    info: "bg-info",
    attention: "bg-warning",
    good: "bg-success",
    danger: "bg-destructive",
  };
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", dot[tone])} />;
}
