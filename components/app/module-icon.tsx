// A module's lucide icon in a soft tinted square (Home tiles, palette, switcher).
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ModuleIcon({ icon: Icon, size = "md", className }: { icon: LucideIcon; size?: "sm" | "md" | "lg"; className?: string }) {
  const box = { sm: "size-7 rounded-lg [&_svg]:size-4", md: "size-10 rounded-xl [&_svg]:size-5", lg: "size-12 rounded-2xl [&_svg]:size-6" }[size];
  return (
    <span className={cn("grid shrink-0 place-items-center bg-accent text-accent-foreground", box, className)}>
      <Icon />
    </span>
  );
}
