"use client";

// Dostopi: who can open which tool. A grid on wide screens, one card per person
// on phones. Every tick saves at once (with "Razveljavi"); a failure flips it back.
import { useOptimistic, type ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useActionToast } from "@/hooks/use-action-toast";
import type { Profile } from "@/lib/access";
import { cn } from "@/lib/utils";
import { setAccess } from "./actions";
import { displayName } from "./people";
import { s } from "./strings";

export type AccessModule = { id: string; label: string; icon: ReactNode };

const key = (userId: string, moduleId: string) => `${userId}:${moduleId}`;

export function AccessPanel({
  users,
  modules,
  granted,
  selfId,
}: {
  users: Profile[];
  modules: AccessModule[];
  granted: string[];
  selfId: string;
}) {
  const [set, flip] = useOptimistic(new Set(granted), (state: Set<string>, k: string) => {
    const next = new Set(state);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    return next;
  });
  const run = useActionToast();

  const toggle = (userId: string, moduleId: string) => {
    const k = key(userId, moduleId);
    const grant = !set.has(k);
    run(
      async () => {
        flip(k);
        return setAccess(userId, moduleId, grant);
      },
      { undo: () => setAccess(userId, moduleId, !grant) },
    );
  };
  // You can't take Administracija away from yourself (you'd lose this page).
  const locked = (userId: string, moduleId: string) => userId === selfId && moduleId === "admin";

  return (
    <div className="space-y-3">
      <p className="px-1 text-sm text-muted-foreground">{s.accessHint}</p>

      {/* Phones: a card per person with a switch per tool. */}
      <div className="space-y-3 md:hidden">
        {users.map((u) => (
          <section key={u.id} className={cn("rounded-2xl bg-card p-4 shadow-xs ring-1 ring-foreground/8", u.disabled && "opacity-70")}>
            <h3 className="font-medium">
              {displayName(u)}
              {u.id === selfId ? <span className="font-normal text-muted-foreground"> ({s.you})</span> : null}
            </h3>
            <ul className="mt-2 divide-y">
              {modules.map((m) => (
                <li key={m.id}>
                  <label className="flex min-h-12 items-center gap-3 py-1">
                    {m.icon}
                    <span className="flex-1">{m.label}</span>
                    <Switch
                      checked={set.has(key(u.id, m.id))}
                      disabled={locked(u.id, m.id)}
                      onCheckedChange={() => toggle(u.id, m.id)}
                    />
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Wider screens: the people × tools grid. */}
      <div className="overflow-x-auto rounded-2xl bg-card shadow-xs ring-1 ring-foreground/8 max-md:hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th scope="col" className="sticky left-0 bg-card px-5 py-3 text-left font-semibold text-muted-foreground">
                {s.person}
              </th>
              {modules.map((m) => (
                <th key={m.id} scope="col" className="px-3 py-3 text-center font-semibold text-muted-foreground">
                  <span className="inline-flex flex-col items-center gap-1.5">
                    {m.icon}
                    <span className="max-w-28 leading-tight">{m.label}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id} className={cn("transition-colors hover:bg-accent/40", u.disabled && "opacity-70")}>
                <th scope="row" className="sticky left-0 bg-card px-5 py-3 text-left font-medium">
                  {displayName(u)}
                  {u.id === selfId ? <span className="font-normal text-muted-foreground"> ({s.you})</span> : null}
                  {u.full_name && u.email ? (
                    <span className="block text-sm font-normal text-muted-foreground">{u.email}</span>
                  ) : null}
                </th>
                {modules.map((m) => (
                  <td key={m.id} className="px-3 py-3 text-center">
                    <span className="inline-grid size-10 place-items-center">
                      <Checkbox
                        aria-label={s.accessToggle(displayName(u), m.label)}
                        checked={set.has(key(u.id, m.id))}
                        disabled={locked(u.id, m.id)}
                        onCheckedChange={() => toggle(u.id, m.id)}
                        className="size-5"
                      />
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
