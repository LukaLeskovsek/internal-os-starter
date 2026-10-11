"use client";

// "Dodaj dela prost dan": a company day off (kolektivni dopust, a bridge day).
// The usual names are chips; the dates start on the next work day.
import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { FormSheet } from "@/components/app/form-sheet";
import { Field } from "@/components/app/field";
import { KbdHint } from "@/components/app/kbd-hint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createCompanyDay } from "./actions";
import { t } from "./strings";

const NAME_CHIPS = ["Kolektivni dopust", "Most med prazniki"];

export function NewCompanyDaySheet({ start, defaultOpen }: { start: string; defaultOpen?: boolean }) {
  return (
    <FormSheet
      trigger={
        <Button size="lg">
          <CalendarPlus />
          {t.addCompanyDay}
          <KbdHint>N</KbdHint>
        </Button>
      }
      title={t.sheetCompanyDay}
      description={t.sheetCompanyDayDescription}
      action={createCompanyDay}
      submitLabel={t.saveCompanyDay}
      defaultOpen={defaultOpen}
      hotkey="n"
    >
      <CompanyDayFields start={start} />
    </FormSheet>
  );
}

function CompanyDayFields({ start }: { start: string }) {
  const [name, setName] = useState("");
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(start);

  return (
    <>
      <Field label={t.companyDayName} name="name">
        <div className="mb-2 flex flex-wrap gap-2">
          {NAME_CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setName(c)}
              aria-pressed={name === c}
              className={cn(
                "inline-flex h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                name === c ? "border-primary bg-accent text-accent-foreground" : "bg-card hover:bg-accent/60",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.companyDayNamePlaceholder}
          maxLength={200}
          autoComplete="off"
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.from} name="start_date">
          <Input
            id="start_date"
            name="start_date"
            type="date"
            value={from}
            onChange={(e) => {
              if (to === from || to < e.target.value) setTo(e.target.value);
              setFrom(e.target.value);
            }}
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
    </>
  );
}
