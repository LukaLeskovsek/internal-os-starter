"use client";

// The "Nova odsotnost" and "Uredi odsotnost" sheets. The quick-entry rule: open
// with everything we can guess already filled in, so the manager only taps.
//
//   - people are chips (the most recently entered first); the rest sit in a picker
//   - "Od" and "Do" start on today (the next work day on a weekend or holiday);
//     moving "Od" past "Do" drags "Do" along
//   - kind defaults to Dopust
//   - the work-day count and the days left update live; the server recomputes
//   - the note hides behind "Dodaj opombo"
import { useState } from "react";
import { Plus } from "lucide-react";
import { FormSheet } from "@/components/app/form-sheet";
import { Field } from "@/components/app/field";
import { KbdHint } from "@/components/app/kbd-hint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber } from "@/lib/format";
import { sl } from "@/lib/i18n/sl";
import { cn } from "@/lib/utils";
import { createAbsence, updateAbsence } from "./actions";
import { countWorkDays, workDaysInYear } from "./lib/workdays";
import { kindLabel, t } from "./strings";
import { KINDS, type Absence, type AbsenceDefaults, type Kind } from "./types";

/** How many people get a chip before the rest move into the picker. */
const CHIPS = 6;

// ------------------------------------------------------------------ sheets

/** The primary action: header button, hotkey N, and ?nov=1 deep links from Home / ⌘K. */
export function NewAbsenceSheet({
  defaults,
  defaultOpen,
}: {
  defaults: AbsenceDefaults;
  defaultOpen?: boolean;
}) {
  return (
    <FormSheet
      trigger={
        <Button size="lg">
          <Plus />
          {t.newAbsence}
          <KbdHint>N</KbdHint>
        </Button>
      }
      title={t.sheetNew}
      description={t.sheetDescription}
      action={createAbsence}
      submitLabel={t.saveAbsence}
      defaultOpen={defaultOpen}
      hotkey="n"
    >
      <AbsenceFields defaults={defaults} />
    </FormSheet>
  );
}

/** Opened from the row menu, so it has no trigger of its own. */
export function EditAbsenceSheet({
  absence,
  defaults,
  open,
  onOpenChange,
}: {
  absence: Absence;
  defaults: AbsenceDefaults;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <FormSheet
      title={t.sheetEdit}
      action={updateAbsence}
      submitLabel={sl.common.save}
      open={open}
      onOpenChange={onOpenChange}
    >
      <input type="hidden" name="id" value={absence.id} />
      <AbsenceFields defaults={defaults} initial={absence} />
    </FormSheet>
  );
}

// ------------------------------------------------------------------ fields

function AbsenceFields({ defaults, initial }: { defaults: AbsenceDefaults; initial?: Absence }) {
  const { people } = defaults;
  const [personId, setPersonId] = useState<string>(
    initial?.person_id ?? (people.length === 1 ? people[0].id : ""),
  );
  const [kind, setKind] = useState<Kind>(initial?.kind ?? "dopust");
  const [from, setFrom] = useState(initial?.start_date ?? defaults.start);
  const [to, setTo] = useState(initial?.end_date ?? defaults.start);
  const [showNote, setShowNote] = useState(!!initial?.note);

  // Chips: recently entered people first, then A–Ž; the rest go into the picker.
  const byId = new Map(people.map((p) => [p.id, p]));
  const ordered = [
    ...defaults.recentPeople.map((id) => byId.get(id)).filter((p) => !!p),
    ...people.filter((p) => !defaults.recentPeople.includes(p.id)),
  ];
  const chips = people.length <= CHIPS + 1 ? ordered : ordered.slice(0, CHIPS);
  const rest = people.length <= CHIPS + 1 ? [] : ordered.slice(CHIPS);
  const pickedFromRest = rest.some((p) => p.id === personId);

  function changeFrom(next: string) {
    // A one-day absence stays one day; a "Do" before the new "Od" moves with it.
    if (to === from || to < next) setTo(next);
    setFrom(next);
  }

  // Live preview, with the same helpers the server uses.
  const workDays = countWorkDays(from, to);
  let left: number | null = null;
  if (kind === "dopust" && personId && defaults.remaining[personId] !== undefined) {
    left = defaults.remaining[personId] - workDaysInYear(from, to, defaults.year);
    // Editing: this absence is already counted in the balance — give it back first.
    if (initial && initial.kind === "dopust" && initial.person_id === personId) {
      left += workDaysInYear(initial.start_date, initial.end_date, defaults.year);
    }
  }

  return (
    <>
      {/* The field error ("Izberi osebo") goes away as soon as a person is picked. */}
      <Field label={t.person} name={personId ? undefined : "person_id"}>
        <input type="hidden" name="person_id" value={personId} />
        <div className="flex flex-wrap gap-2">
          {chips.map((p) => (
            <Chip key={p.id} active={p.id === personId} onClick={() => setPersonId(p.id)}>
              {p.name}
            </Chip>
          ))}
        </div>
        {rest.length ? (
          <Select
            items={rest.map((p) => ({ value: p.id, label: p.name }))}
            value={pickedFromRest ? personId : null}
            onValueChange={(v) => setPersonId((v as string | null) ?? "")}
          >
            <SelectTrigger className="mt-2 w-full" aria-label={t.otherPeople}>
              <SelectValue placeholder={t.otherPeople} />
            </SelectTrigger>
            <SelectContent>
              {rest.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </Field>

      <Field label={t.kind} name="kind">
        <input type="hidden" name="kind" value={kind} />
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <Chip key={k} active={k === kind} onClick={() => setKind(k)}>
              {kindLabel[k]}
            </Chip>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t.from} name="start_date">
          <Input
            id="start_date"
            name="start_date"
            type="date"
            value={from}
            onChange={(e) => changeFrom(e.target.value)}
            required
          />
        </Field>
        <Field label={t.to} name="end_date">
          <Input
            id="end_date"
            name="end_date"
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            required
          />
        </Field>
      </div>

      {showNote ? (
        <Field label={t.note} name="note" optional>
          <Textarea id="note" name="note" defaultValue={initial?.note ?? ""} rows={3} maxLength={2000} />
        </Field>
      ) : (
        <Button type="button" variant="ghost" className="-ml-3 self-start" onClick={() => setShowNote(true)}>
          <Plus />
          {t.addNote}
        </Button>
      )}

      <div className="flex items-center justify-between gap-4 rounded-2xl bg-accent px-4 py-3 text-accent-foreground">
        <div className="min-w-0">
          <div className="text-sm font-medium">{t.workDaysLabel}</div>
          <div className="text-sm opacity-75">
            {kind !== "dopust"
              ? t.noFund
              : left === null
                ? t.workDaysHint
                : left < 0
                  ? t.overBy(-left, defaults.year)
                  : t.leftAfter(left, defaults.year)}
          </div>
        </div>
        <div className="shrink-0 text-2xl font-semibold tabular-nums" aria-live="polite">
          {formatNumber(workDays, 0)}
        </div>
      </div>
    </>
  );
}

/** A pill-shaped one-tap choice (a person, a kind). */
function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active ? "border-primary bg-accent text-accent-foreground" : "bg-card hover:bg-accent/60",
      )}
    >
      {children}
    </button>
  );
}
