"use client";

// Create / edit sheet. The quick-entry rule: open with everything we can guess
// already filled in, so the person only taps. Recent titles are chips; the date
// starts on today; the optional note hides behind "Dodaj opombo".
import { useState } from "react";
import { Plus } from "lucide-react";
import { FormSheet } from "@/components/app/form-sheet";
import { Field } from "@/components/app/field";
import { KbdHint } from "@/components/app/kbd-hint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sl } from "@/lib/i18n/sl";
import { cn } from "@/lib/utils";
import { createItem, updateItem } from "./actions";
import { t } from "./strings";
import type { Item, ItemDefaults } from "./types";

/** The primary action: header button, hotkey N, and ?nov=1 deep links from Home / ⌘K. */
export function NewItemSheet({ defaults, defaultOpen }: { defaults: ItemDefaults; defaultOpen?: boolean }) {
  return (
    <FormSheet
      trigger={
        <Button size="lg">
          <Plus />
          {t.newItem}
          <KbdHint>N</KbdHint>
        </Button>
      }
      title={t.sheetNew}
      description={t.sheetDescription}
      action={createItem}
      submitLabel={t.save}
      defaultOpen={defaultOpen}
      hotkey="n"
    >
      <ItemFields defaults={defaults} />
    </FormSheet>
  );
}

/** Opened from the row menu, so it has no trigger of its own. */
export function EditItemSheet({
  item,
  defaults,
  open,
  onOpenChange,
}: {
  item: Item;
  defaults: ItemDefaults;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <FormSheet title={t.sheetEdit} action={updateItem} submitLabel={sl.common.save} open={open} onOpenChange={onOpenChange}>
      <input type="hidden" name="id" value={item.id} />
      <ItemFields defaults={defaults} initial={item} />
    </FormSheet>
  );
}

function ItemFields({ defaults, initial }: { defaults: ItemDefaults; initial?: Item }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.item_date ?? defaults.today);
  const [showNote, setShowNote] = useState(!!initial?.note);

  return (
    <>
      {!initial && defaults.recentTitles.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t.recent}</p>
          <div className="flex flex-wrap gap-2">
            {defaults.recentTitles.map((x) => (
              <Chip key={x} active={title === x} onClick={() => setTitle(x)}>
                {x}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      <Field label={t.fieldTitle} name="title">
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.fieldTitlePlaceholder}
          autoFocus
          required
        />
      </Field>

      <Field label={t.fieldDate} name="item_date">
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={date === defaults.today} onClick={() => setDate(defaults.today)}>
            {sl.common.today}
          </Chip>
          <Chip active={date === defaults.yesterday} onClick={() => setDate(defaults.yesterday)}>
            {sl.common.yesterday}
          </Chip>
          <Input
            id="item_date"
            name="item_date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
            required
          />
        </div>
      </Field>

      {showNote ? (
        <Field label={t.fieldNote} name="note" optional>
          <Textarea id="note" name="note" defaultValue={initial?.note ?? ""} rows={3} />
        </Field>
      ) : (
        <Button type="button" variant="ghost" className="-ml-3 self-start" onClick={() => setShowNote(true)}>
          <Plus />
          {t.addNote}
        </Button>
      )}
    </>
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 rounded-full border px-4 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
