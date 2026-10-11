// travel_orders: the reference module for the "quick entry" pattern.
//
// Job: "After a client visit I want my trip on record in a few seconds, and at
// the end of the month I want the km and € for my reimbursement."
//
// So the page is one month of trips (?mesec=YYYY-MM) with the month's totals on
// top, one primary action ("Nova pot", N, ?nov=1) and one-click "Ponovi" on every
// row. Data loads here on the server; the sheets and row buttons are client
// components that receive plain props.
import Link from "next/link";
import { CarFront, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { ModuleProps } from "@/lib/modules";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { DataList, ListRow } from "@/components/app/data-list";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { count, formatKm, formatMoney, formatMonth, formatRelative, todayIso } from "@/lib/format";
import { RECENT_ROUTES } from "./constants";
import { t, trips as tripsWord } from "./strings";
import { NewTripSheet } from "./trip-sheet";
import { TripActions } from "./trip-actions";
import type { RecentRoute, Trip, TripDefaults } from "./types";

const BASE = "/m/travel_orders";
const COLS =
  "id, customer, trip_date, route_from, route_to, km, departed_at, arrived_at, rate, amount, created_at";

export async function TravelOrdersModule({ searchParams }: ModuleProps) {
  const thisMonth = todayIso().slice(0, 7);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.mesec ?? "")
    ? searchParams.mesec!
    : thisMonth;
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  // RLS scopes both queries to the signed-in user's own trips.
  const supabase = await createClient();
  const [monthRes, recentRes] = await Promise.all([
    supabase
      .from("travel_orders_trips")
      .select(COLS)
      .gte("trip_date", `${month}-01`)
      .lt("trip_date", `${next}-01`)
      .order("trip_date", { ascending: false })
      .order("created_at", { ascending: false }),
    // The last 50 trips feed the sheet's guesses (routes, origin, customers).
    supabase
      .from("travel_orders_trips")
      .select("route_from, route_to, km, customer")
      .order("trip_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const trips = ((monthRes.data ?? []) as Trip[]).map((x) => ({
    ...x,
    km: Number(x.km),
    rate: Number(x.rate),
    amount: Number(x.amount),
  }));
  const defaults = buildDefaults(
    (recentRes.data ?? []) as { route_from: string; route_to: string; km: number; customer: string | null }[],
  );

  const totalKm = trips.reduce((s, x) => s + x.km, 0);
  const totalEur = trips.reduce((s, x) => s + x.amount, 0);
  const isThisMonth = month === thisMonth;
  const monthLabel = capitalize(formatMonth(`${month}-01`));

  const newTrip = <NewTripSheet defaults={defaults} defaultOpen={searchParams.nov === "1"} />;

  return (
    <div className="max-sm:pb-24">
      <nav aria-label={t.monthNav} className="-ml-3 mb-2 flex items-center gap-1 text-muted-foreground">
        <Button variant="ghost" size="sm" render={<Link href={`${BASE}?mesec=${prev}`} scroll={false} />}>
          <ChevronLeft />
          {formatMonth(`${prev}-01`)}
        </Button>
        {!isThisMonth ? (
          <>
            <Button variant="ghost" size="sm" render={<Link href={`${BASE}?mesec=${next}`} scroll={false} />}>
              {formatMonth(`${next}-01`)}
              <ChevronRight />
            </Button>
            <Button variant="ghost" size="sm" render={<Link href={BASE} scroll={false} />}>
              {t.thisMonth}
            </Button>
          </>
        ) : null}
      </nav>

      <PageHeader
        title={monthLabel}
        description={
          trips.length
            ? `${count(trips.length, tripsWord)} · ${formatKm(totalKm)} · ${formatMoney(totalEur)}`
            : undefined
        }
        actions={newTrip}
      />

      {trips.length ? (
        <DataList>
          {trips.map((trip) => (
            <ListRow
              key={trip.id}
              leading={<DayTile date={trip.trip_date} />}
              title={`${trip.route_from} → ${trip.route_to}`}
              meta={rowMeta(trip)}
              trailing={
                <div className="text-right tabular-nums">
                  <div className="font-semibold">{formatMoney(trip.amount)}</div>
                  <div className="text-sm text-muted-foreground">{formatKm(trip.km)}</div>
                </div>
              }
              actions={<TripActions trip={trip} defaults={defaults} />}
            />
          ))}
        </DataList>
      ) : (
        <EmptyState
          icon={CarFront}
          title={isThisMonth ? t.monthEmpty : t.otherMonthEmpty}
          action={
            <Button size="lg" render={<Link href={`${BASE}?mesec=${month}&nov=1`} scroll={false} />}>
              <Plus />
              {t.newTrip}
            </Button>
          }
        >
          {t.emptyText}
        </EmptyState>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ helpers

/** The day of the month in a soft tile, so a month of trips scans by date. */
function DayTile({ date }: { date: string }) {
  return (
    <div className="grid size-11 place-items-center rounded-2xl bg-accent text-lg font-semibold text-accent-foreground tabular-nums">
      {Number(date.slice(8, 10))}.
    </div>
  );
}

/** "včeraj · Acme d.o.o. · 08:00–10:30" */
function rowMeta(trip: Trip): string {
  const parts = [formatRelative(trip.trip_date)];
  if (trip.customer) parts.push(trip.customer);
  if (trip.departed_at && trip.arrived_at) parts.push(`${trip.departed_at}–${trip.arrived_at}`);
  return parts.join(" · ");
}

/** The sheet's guesses, from the user's recent trips (newest first). */
function buildDefaults(
  recent: { route_from: string; route_to: string; km: number; customer: string | null }[],
): TripDefaults {
  const routes: RecentRoute[] = [];
  const seen = new Set<string>();
  const origins = new Map<string, number>();
  const customers: string[] = [];

  for (const r of recent) {
    origins.set(r.route_from, (origins.get(r.route_from) ?? 0) + 1);
    if (r.customer && !customers.includes(r.customer)) customers.push(r.customer);
    const key = `${r.route_from}|${r.route_to}`;
    if (routes.length < RECENT_ROUTES && !seen.has(key)) {
      seen.add(key);
      routes.push({ from: r.route_from, to: r.route_to, km: Number(r.km), customer: r.customer });
    }
  }

  // Most frequent origin; ties go to the most recent (Map keeps insertion order).
  let origin = "";
  let best = 0;
  for (const [place, n] of origins) {
    if (n > best) [origin, best] = [place, n];
  }

  return { today: todayIso(), yesterday: todayIso(-1), origin, routes, customers };
}

/** "2026-10" + 1 → "2026-11" */
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
