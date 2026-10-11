"use client";

// Orodja: switch a tool on/off, rename it in place (Enter saves, Esc cancels)
// and move it up/down the launcher. All three update the screen at once.
import { useOptimistic, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Puzzle } from "lucide-react";
import { DataList } from "@/components/app/data-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useActionToast } from "@/hooks/use-action-toast";
import { cn } from "@/lib/utils";
import { moveModule, renameModule, setModuleEnabled } from "./actions";
import { s } from "./strings";

export type ModuleItem = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  icon: ReactNode;
};

type Change =
  | { type: "enabled"; id: string; enabled: boolean }
  | { type: "rename"; id: string; label: string }
  | { type: "move"; id: string; dir: "up" | "down" };

function apply(state: ModuleItem[], c: Change): ModuleItem[] {
  if (c.type === "move") {
    const i = state.findIndex((m) => m.id === c.id);
    const j = c.dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= state.length) return state;
    const next = [...state];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  }
  return state.map((m) =>
    m.id !== c.id ? m : c.type === "enabled" ? { ...m, enabled: c.enabled } : { ...m, label: c.label },
  );
}

export function ModulesPanel({
  modules,
  notInstalled = [],
}: {
  modules: ModuleItem[];
  /** core_modules ids with no code in modules/ (shown muted, not editable). */
  notInstalled?: string[];
}) {
  const [list, change] = useOptimistic(modules, apply);
  const run = useActionToast();

  const toggle = (m: ModuleItem, enabled: boolean) =>
    run(
      async () => {
        change({ type: "enabled", id: m.id, enabled });
        return setModuleEnabled(m.id, enabled);
      },
      { undo: () => setModuleEnabled(m.id, !enabled) },
    );
  const rename = (m: ModuleItem, label: string) =>
    run(async () => {
      change({ type: "rename", id: m.id, label });
      return renameModule(m.id, label);
    });
  const move = (m: ModuleItem, dir: "up" | "down") =>
    run(
      async () => {
        change({ type: "move", id: m.id, dir });
        return moveModule(m.id, dir);
      },
      { silent: true },
    );

  return (
    <div className="space-y-3">
      <p className="px-1 text-sm text-muted-foreground">{s.modulesHint}</p>
      <DataList>
        {list.map((m, idx) => (
          <li key={m.id} className={cn("flex items-center gap-3 px-4 py-3 sm:px-5", !m.enabled && "opacity-70")}>
            <div className="shrink-0">{m.icon}</div>
            <div className="min-w-0 flex-1">
              {/* Keyed by the saved label so a successful rename resets the draft. */}
              <RenameInput key={m.label} item={m} onSave={(label) => rename(m, label)} />
              <p className="truncate px-2 text-sm text-muted-foreground">{m.description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                disabled={idx === 0}
                aria-label={`${s.moveUp}: ${m.label}`}
                title={s.moveUp}
                onClick={() => move(m, "up")}
              >
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={idx === list.length - 1}
                aria-label={`${s.moveDown}: ${m.label}`}
                title={s.moveDown}
                onClick={() => move(m, "down")}
              >
                <ArrowDown />
              </Button>
              <label className="ml-2 flex min-h-10 items-center gap-2">
                <span className="sr-only">{s.toggleModule(m.label)}</span>
                <Switch
                  checked={m.enabled}
                  disabled={m.id === "admin"}
                  onCheckedChange={(on) => toggle(m, on)}
                />
                <span className="w-24 text-sm text-muted-foreground max-sm:hidden">
                  {m.enabled ? s.on : s.off}
                </span>
              </label>
            </div>
          </li>
        ))}
        {notInstalled.map((id) => (
          <li key={id} className="flex items-center gap-3 px-4 py-3 text-muted-foreground sm:px-5">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted [&_svg]:size-4">
              <Puzzle />
            </span>
            <span className="px-2 text-sm">{s.notInstalled(id)}</span>
          </li>
        ))}
      </DataList>
    </div>
  );
}

function RenameInput({ item, onSave }: { item: ModuleItem; onSave: (label: string) => void }) {
  const [draft, setDraft] = useState(item.label);
  const cancelled = useRef(false);
  const save = () => {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const next = draft.trim();
    if (!next) return setDraft(item.label);
    if (next !== item.label) onSave(next);
  };
  return (
    <Input
      aria-label={s.renameLabel(item.label)}
      value={draft}
      maxLength={60}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur(); // blur saves
        } else if (e.key === "Escape") {
          cancelled.current = true;
          setDraft(item.label);
          e.currentTarget.blur();
        }
      }}
      className="h-9 border-transparent bg-transparent px-2 font-medium shadow-none hover:border-input focus-visible:border-ring dark:bg-transparent"
    />
  );
}
