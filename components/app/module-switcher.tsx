"use client";

// "Domov / Računi ▾" — shows where you are and hops to another tool in one click.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ChevronDown, House } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sl } from "@/lib/i18n/sl";

export type SwitcherModule = { id: string; label: string; icon: ReactNode };

export function ModuleSwitcher({ modules }: { modules: SwitcherModule[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = modules.find((m) => pathname.startsWith(`/m/${m.id}`));
  if (!current) return null;

  return (
    <nav className="flex min-w-0 items-center gap-1 text-[0.9375rem]">
      <Link href="/home" className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={sl.shell.home}>
        <House className="size-4" />
      </Link>
      <span className="text-muted-foreground/60">/</span>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex min-w-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/40">
          <span className="truncate">{current.label}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{sl.shell.switchModule}</DropdownMenuLabel>
            {modules.map((m) => (
              <DropdownMenuItem key={m.id} onClick={() => router.push(`/m/${m.id}`)} className="h-10 gap-3">
                {m.icon}
                {m.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
