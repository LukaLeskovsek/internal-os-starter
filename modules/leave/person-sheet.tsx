"use client";

// "Dodaj osebo" / "Uredi osebo": a name and the yearly leave days. The days start
// on the value used last time, since a team usually shares one number.
import { UserPlus } from "lucide-react";
import { FormSheet } from "@/components/app/form-sheet";
import { Field } from "@/components/app/field";
import { KbdHint } from "@/components/app/kbd-hint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sl } from "@/lib/i18n/sl";
import { createPerson, updatePerson } from "./actions";
import { t } from "./strings";
import type { Person } from "./types";

export function NewPersonSheet({
  defaultDays,
  defaultOpen,
  hotkey,
  variant = "default",
}: {
  defaultDays: number;
  defaultOpen?: boolean;
  /** "n" on the Ekipa tab, where adding a person is the main job. */
  hotkey?: string;
  variant?: "default" | "outline";
}) {
  return (
    <FormSheet
      trigger={
        <Button size="lg" variant={variant}>
          <UserPlus />
          {t.addPerson}
          {hotkey ? <KbdHint>{hotkey.toUpperCase()}</KbdHint> : null}
        </Button>
      }
      title={t.sheetPerson}
      description={t.sheetPersonDescription}
      action={createPerson}
      submitLabel={t.savePerson}
      defaultOpen={defaultOpen}
      hotkey={hotkey}
    >
      <PersonFields defaultDays={defaultDays} />
    </FormSheet>
  );
}

export function EditPersonSheet({
  person,
  open,
  onOpenChange,
}: {
  person: Person;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <FormSheet
      title={t.sheetPersonEdit}
      action={updatePerson}
      submitLabel={sl.common.save}
      open={open}
      onOpenChange={onOpenChange}
    >
      <input type="hidden" name="id" value={person.id} />
      <PersonFields defaultDays={person.annual_days} initial={person} />
    </FormSheet>
  );
}

function PersonFields({ defaultDays, initial }: { defaultDays: number; initial?: Person }) {
  return (
    <>
      <Field label={t.fullName} name="full_name">
        <Input
          id="full_name"
          name="full_name"
          defaultValue={initial?.full_name ?? ""}
          placeholder={t.fullNamePlaceholder}
          maxLength={200}
          autoComplete="off"
          autoFocus
          required
        />
      </Field>
      <Field label={t.annualDays} name="annual_days" hint={t.annualDaysHint}>
        <Input
          id="annual_days"
          name="annual_days"
          type="number"
          inputMode="numeric"
          min={0}
          max={365}
          step={1}
          defaultValue={defaultDays}
          className="w-32"
          required
        />
      </Field>
    </>
  );
}
