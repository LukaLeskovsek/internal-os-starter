"use client";

// ⌘K / Ctrl+K (or "/") — jump to any tool or run its main action from anywhere.
// Items are built on the server (app/(app)/layout.tsx) from the modules this
// user may open, so a member never sees tools they lack.
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LogOut, Monitor, Moon, Search, Sun } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/login/actions";
import { sl } from "@/lib/i18n/sl";

export type PaletteItem = {
  group: "goTo" | "actions";
  label: string;
  href: string;
  icon: ReactNode;
  keywords?: string[];
};

export function CommandPalette({ items }: { items: PaletteItem[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        t &&
        (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" && !typing)
      ) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    if (href.startsWith("/api/")) window.location.href = href;
    else router.push(href);
  };

  const group = (g: PaletteItem["group"]) => items.filter((i) => i.group === g);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-10 gap-2 rounded-full bg-card px-3 text-muted-foreground max-sm:size-10 max-sm:p-0 sm:w-64 sm:justify-start"
        aria-label={sl.shell.searchButton}
      >
        <Search />
        <span className="max-sm:hidden">{sl.shell.searchButton}</span>
        <kbd className="pointer-coarse:hidden ml-auto rounded-md border px-1.5 font-sans text-xs max-sm:hidden">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={sl.shell.searchButton}
        description={sl.palette.placeholder}
        className="sm:max-w-xl"
      >
        <Command>
          <CommandInput placeholder={sl.palette.placeholder} />
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>{sl.palette.empty}</CommandEmpty>
            {group("actions").length ? (
              <CommandGroup heading={sl.palette.actions}>
                {group("actions").map((i) => (
                  <CommandItem
                    key={i.href + i.label}
                    value={`${i.label} ${(i.keywords ?? []).join(" ")}`}
                    onSelect={() => go(i.href)}
                    className="h-11 gap-3"
                  >
                    {i.icon}
                    {i.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            <CommandGroup heading={sl.palette.goTo}>
              {group("goTo").map((i) => (
                <CommandItem
                  key={i.href}
                  value={`${i.label} ${(i.keywords ?? []).join(" ")}`}
                  onSelect={() => go(i.href)}
                  className="h-11 gap-3"
                >
                  {i.icon}
                  {i.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading={sl.palette.other}>
              <CommandItem
                value={`${sl.shell.theme} ${sl.theme.light}`}
                onSelect={() => {
                  setTheme("light");
                  setOpen(false);
                }}
                className="h-11 gap-3"
              >
                <Sun /> {sl.shell.theme}: {sl.theme.light}
              </CommandItem>
              <CommandItem
                value={`${sl.shell.theme} ${sl.theme.dark}`}
                onSelect={() => {
                  setTheme("dark");
                  setOpen(false);
                }}
                className="h-11 gap-3"
              >
                <Moon /> {sl.shell.theme}: {sl.theme.dark}
              </CommandItem>
              <CommandItem
                value={`${sl.shell.theme} ${sl.theme.system}`}
                onSelect={() => {
                  setTheme("system");
                  setOpen(false);
                }}
                className="h-11 gap-3"
              >
                <Monitor /> {sl.shell.theme}: {sl.theme.system}
              </CommandItem>
              <CommandItem
                value={sl.shell.signOut}
                onSelect={() => {
                  setOpen(false);
                  void signOut();
                }}
                className="h-11 gap-3"
              >
                <LogOut /> {sl.shell.signOut}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
