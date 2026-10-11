"use client";

// "Nov nalog": the office's one job is "this needs doing, at this customer, by
// this person". So the sheet asks exactly that, in that order, with the likely
// answers already chosen: recent customers on top, the assignee you picked last
// time preselected, the description tucked away. Enter in the title submits.
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
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { sl } from "@/lib/i18n/sl";
import { createWorkOrder } from "./actions";
import { t } from "./strings";
import type { CustomerOption, PersonOption } from "./types";

export function NewOrderSheet({
  customers,
  customersAreDemo,
  people,
  defaultAssignee,
  defaultOpen,
}: {
  customers: CustomerOption[];
  customersAreDemo: boolean;
  people: PersonOption[];
  defaultAssignee?: string;
  defaultOpen?: boolean;
}) {
  return (
    <FormSheet
      trigger={
        <Button size="lg">
          <Plus />
          {t.newOrder}
          <KbdHint>N</KbdHint>
        </Button>
      }
      title={t.newOrder}
      description={t.sheetDescription}
      action={createWorkOrder}
      submitLabel={t.create}
      defaultOpen={defaultOpen}
      hotkey="n"
    >
      <NewOrderFields
        customers={customers}
        customersAreDemo={customersAreDemo}
        people={people}
        defaultAssignee={defaultAssignee}
      />
    </FormSheet>
  );
}

function NewOrderFields({
  customers,
  customersAreDemo,
  people,
  defaultAssignee,
}: {
  customers: CustomerOption[];
  customersAreDemo: boolean;
  people: PersonOption[];
  defaultAssignee?: string;
}) {
  const [customer, setCustomer] = useState<CustomerOption | null>(null);
  const [showDescription, setShowDescription] = useState(false);

  return (
    <>
      <Field label={t.orderTitle} name="title">
        <Input
          id="title"
          name="title"
          placeholder={t.orderTitlePlaceholder}
          maxLength={200}
          autoFocus
          required
        />
      </Field>

      <Field
        label={t.customer}
        name="zoho_customer_id"
        optional
        hint={customersAreDemo ? sl.common.demo : undefined}
      >
        <Combobox items={customers} value={customer} onValueChange={setCustomer} autoHighlight>
          <ComboboxInput
            id="zoho_customer_id"
            placeholder={t.customerPlaceholder}
            showClear={!!customer}
            className="h-10 w-full rounded-xl bg-card"
          />
          <ComboboxContent>
            <ComboboxEmpty>{t.customerEmpty}</ComboboxEmpty>
            <ComboboxList>
              {(c: CustomerOption) => (
                <ComboboxItem key={c.value} value={c} className="py-2">
                  <span className="min-w-0 flex-1 truncate">
                    {c.label}
                    {c.city ? <span className="text-muted-foreground"> · {c.city}</span> : null}
                  </span>
                  {c.recent ? (
                    <span className="text-xs text-muted-foreground">{t.recentCustomer}</span>
                  ) : null}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        {/* The combobox holds an object; the form submits just its id. */}
        <input type="hidden" name="zoho_customer_id" value={customer?.value ?? ""} />
      </Field>

      <Field label={t.assignee} name="assignee_id">
        <Select name="assignee_id" items={people} defaultValue={defaultAssignee ?? null}>
          <SelectTrigger id="assignee_id" className="w-full">
            <SelectValue placeholder={t.assigneePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {people.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {showDescription ? (
        <Field label={t.descriptionLabel} name="description" optional>
          <Textarea
            id="description"
            name="description"
            placeholder={t.descriptionPlaceholder}
            maxLength={4000}
            rows={4}
            autoFocus
          />
        </Field>
      ) : (
        <Button
          type="button"
          variant="ghost"
          className="-ml-3"
          onClick={() => setShowDescription(true)}
        >
          <Plus />
          {t.addDescription}
        </Button>
      )}
    </>
  );
}
