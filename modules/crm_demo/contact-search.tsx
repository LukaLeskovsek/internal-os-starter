"use client";

// The "Iskanje" pattern: one autofocused box that filters as you type, arrow
// keys to move, Enter to open. Filtering is client-side (the list is small and
// already loaded), so results appear on every keystroke.
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SearchX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DataList, ListRow } from "@/components/app/data-list";
import { EmptyState } from "@/components/app/empty-state";
import { count } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Contact } from "./lib/mock-data";
import { RowActions } from "./contact-actions";
import { s } from "./strings";

// "Čeh" matches "ceh": case- and diacritic-insensitive.
const norm = (v: string) =>
  v.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")
  ).toUpperCase();
}

export function ContactSearch({ contacts }: { contacts: Contact[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const index = useMemo(
    () =>
      contacts.map((c) => ({
        c,
        hay: norm(
          [c.name, c.company, c.email, c.phone].filter(Boolean).join(" "),
        ),
      })),
    [contacts],
  );
  const results = useMemo(() => {
    const terms = norm(deferred).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return contacts;
    return index
      .filter(({ hay }) => terms.every((t) => hay.includes(t)))
      .map(({ c }) => c);
  }, [deferred, index, contacts]);

  const current = Math.min(active, Math.max(results.length - 1, 0));

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${current}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [current]);

  const open = (c: Contact) =>
    router.push(`/m/crm_demo?id=${encodeURIComponent(c.id)}`, {
      scroll: false,
    });

  return (
    <div className="space-y-4">
      <div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="contact-search" className="sr-only">
            {s.searchLabel}
          </label>
          <Input
            id="contact-search"
            type="search"
            autoFocus
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive(Math.min(current + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive(Math.max(current - 1, 0));
              } else if (e.key === "Enter" && results[current]) {
                e.preventDefault();
                open(results[current]);
              }
            }}
            placeholder={s.searchPlaceholder}
            aria-describedby="contact-search-hint"
            className="h-12 rounded-2xl pl-12 text-base md:text-base"
          />
        </div>
        <p
          id="contact-search-hint"
          className="mt-2 px-1 text-sm text-muted-foreground pointer-coarse:hidden"
        >
          {s.searchHint}
        </p>
      </div>

      {results.length === 0 ? (
        <EmptyState icon={SearchX} title={s.noMatchTitle}>
          {s.noMatchText}
        </EmptyState>
      ) : (
        <div ref={listRef}>
          <p
            className="mb-2 px-1 text-sm text-muted-foreground"
            aria-live="polite"
          >
            {count(results.length, s.results)}
          </p>
          <DataList>
            {results.map((c, i) => (
              <ListRow
                key={c.id}
                href={`/m/crm_demo?id=${encodeURIComponent(c.id)}`}
                className={cn(i === current && "bg-accent/60")}
                leading={
                  <span
                    data-index={i}
                    aria-hidden
                    className="grid size-10 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
                  >
                    {initials(c.name)}
                  </span>
                }
                title={c.name}
                meta={c.company}
                actions={<RowActions contact={c} />}
              />
            ))}
          </DataList>
        </div>
      )}
    </div>
  );
}
