// Shows a keyboard shortcut next to an action — hidden on touch screens.
import { cn } from "@/lib/utils";

export function KbdHint({ children, className }: { children: string; className?: string }) {
  return (
    <kbd
      className={cn(
        "pointer-coarse:hidden ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-current/20 px-1 font-sans text-[0.7rem] font-medium opacity-70",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
