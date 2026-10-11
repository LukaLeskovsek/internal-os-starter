"use client";

// The "Nova pot" and "Uredi pot" sheets. This is the heart of the quick-entry
// pattern: most trips are a repeat of an earlier one, so the sheet opens with
// everything it can guess already filled in, and the person only taps.
//
//   - recent-route chips fill from / to / km / customer in one tap
//   - "Od" starts on the most frequent origin, the date on today
//   - Danes / Včeraj chips instead of a date picker for the usual case
//   - "Povratna pot" doubles the km (the server does the same maths)
//   - times are optional, so they hide behind "Dodaj čas"
//   - the € amount updates live; the server recomputes it on save
import { useId, useState } from "react";
import { Clock, Plus } from "lucide-react";
import { FormSheet } from "@/components/app/form-sheet";
import { Field } from "@/components/app/field";
import { KbdHint } from "@/components/app/kbd-hint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatKm, formatMoney, formatNumber } from "@/lib/format";
import { sl } from "@/lib/i18n/sl";
import { cn } from "@/lib/utils";
import { createTrip, updateTrip } from "./actions";
import { RATE_EUR_PER_KM, reimbursement } from "./constants";
import { t } from "./strings";
import type { RecentRoute, Trip, TripDefaults } from "./types";

// ------------------------------------------------------------------ sheets

/** The primary action: header button, hotkey N, and ?nov=1 deep links. */
export function NewTripSheet({
  defaults,
  defaultOpen,
}: {
  defaults: TripDefaults;
  defaultOpen?: boolean;
}) {
  return (
    <FormSheet
      trigger={
        <Button size="lg">
          <Plus />
          {t.newTrip}
          <KbdHint>N</KbdHint>
        </Button>
      }
      title={t.sheetNew}
      description={t.sheetDescription}
      action={createTrip}
      submitLabel={t.saveTrip}
      defaultOpen={defaultOpen}
      hotkey="n"
    >
      <TripFields defaults={defaults} />
    </FormSheet>
  );
}

/** Edit an existing trip. Opened from the row menu, so it has no trigger. */
export function EditTripSheet({
  trip,
  defaults,
  open,
  onOpenChange,
}: {
  trip: Trip;
  defaults: TripDefaults;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <FormSheet
      title={t.sheetEdit}
      action={updateTrip}
      submitLabel={sl.common.save}
      open={open}
      onOpenChange={onOpenChange}
    >
      <input type="hidden" name="id" value={trip.id} />
      <TripFields defaults={defaults} initial={trip} />
    </FormSheet>
  );
}

// ------------------------------------------------------------------ fields

function TripFields({ defaults, initial }: { defaults: TripDefaults; initial?: Trip }) {
  const editing = !!initial;
  const [from, setFrom] = useState(initial?.route_from ?? defaults.origin);
  const [to, setTo] = useState(initial?.route_to ?? "");
  const [km, setKm] = useState(initial ? String(initial.km) : "");
  const [customer, setCustomer] = useState(initial?.customer ?? "");
  const [date, setDate] = useState(initial?.trip_date ?? defaults.today);
  const [roundTrip, setRoundTrip] = useState(false);
  const [showTimes, setShowTimes] = useState(!!(initial?.departed_at || initial?.arrived_at));
  const customersListId = useId();

  // Live preview. Same helpers as the server, so the number matches what is saved.
  const oneWay = Number(km.replace(",", ".")) || 0;
  const totalKm = roundTrip ? oneWay * 2 : oneWay;
  const rate = initial?.rate ?? RATE_EUR_PER_KM;

  function pickRoute(r: RecentRoute) {
    setFrom(r.from);
    setTo(r.to);
    setKm(String(r.km));
    setCustomer(r.customer ?? "");
    setRoundTrip(false);
  }

  return (
    <>
      {!editing && defaults.routes.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t.recentRoutes}</p>
          <div className="flex flex-wrap gap-2">
            {defaults.routes.map((r) => (
              <Chip
                key={`${r.from}|${r.to}|${r.km}`}
                active={r.from === from && r.to === to && String(r.km) === km}
                onClick={() => pickRoute(r)}
              >
                {r.from} → {r.to}
                <span className="text-muted-foreground">· {formatKm(r.km)}</span>
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label={t.from} name="route_from">
          <Input
            id="route_from"
            name="route_from"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder={t.fromPlaceholder}
            maxLength={200}
            required
          />
        </Field>
        <Field label={t.to} name="route_to">
          <Input
            id="route_to"
            name="route_to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={t.toPlaceholder}
            maxLength={200}
            // Origin is usually prefilled, so the cursor starts on the destination.
            autoFocus={!editing}
            required
          />
        </Field>
      </div>

      <Field label={t.km} name="km" hint={!editing && roundTrip ? t.kmHintOneWay : undefined}>
        <Input
          id="km"
          name="km"
          value={km}
          onChange={(e) => setKm(e.target.value)}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.1"
          placeholder={t.kmPlaceholder}
          required
        />
      </Field>

      {!editing ? (
        <label className="flex min-h-10 cursor-pointer items-center justify-between gap-4 rounded-2xl bg-muted/60 px-4 py-2.5">
          <span>
            <span className="block text-sm font-medium">{t.roundTrip}</span>
            <span className="block text-sm text-muted-foreground">{t.roundTripHint}</span>
          </span>
          <Switch checked={roundTrip} onCheckedChange={setRoundTrip} />
          <input type="hidden" name="round_trip" value={roundTrip ? "1" : ""} />
        </label>
      ) : null}

      <Field label={t.date} name="trip_date">
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={date === defaults.today} onClick={() => setDate(defaults.today)}>
            {sl.common.today}
          </Chip>
          <Chip active={date === defaults.yesterday} onClick={() => setDate(defaults.yesterday)}>
            {sl.common.yesterday}
          </Chip>
          <Input
            id="trip_date"
            name="trip_date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto flex-1"
            required
          />
        </div>
      </Field>

      <Field label={t.customer} name="customer" optional>
        <Input
          id="customer"
          name="customer"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          placeholder={t.customerPlaceholder}
          list={customersListId}
          maxLength={200}
        />
        <datalist id={customersListId}>
          {defaults.customers.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>

      {showTimes ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.departed} name="departed_at" optional>
            <Input
              id="departed_at"
              name="departed_at"
              type="time"
              defaultValue={initial?.departed_at ?? ""}
            />
          </Field>
          <Field label={t.arrived} name="arrived_at" optional>
            <Input
              id="arrived_at"
              name="arrived_at"
              type="time"
              defaultValue={initial?.arrived_at ?? ""}
            />
          </Field>
        </div>
      ) : (
        <Button type="button" variant="ghost" className="-ml-3" onClick={() => setShowTimes(true)}>
          <Clock />
          {t.addTime}
        </Button>
      )}

      <div className="flex items-center justify-between rounded-2xl bg-accent px-4 py-3 text-accent-foreground">
        <div>
          <div className="text-sm font-medium">{t.reimbursement}</div>
          <div className="text-sm opacity-75">
            {formatKm(totalKm)} × {formatNumber(rate, 2)} €/km
          </div>
        </div>
        <div className="text-2xl font-semibold tabular-nums" aria-live="polite">
          {formatMoney(reimbursement(totalKm, rate))}
        </div>
      </div>
    </>
  );
}

/** A pill-shaped one-tap choice (recent route, Danes / Včeraj). */
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
