import { createClient } from "@/lib/supabase/server";
import { createTrip } from "./actions";
import { RATE_EUR_PER_KM } from "./constants";
import { SubmitButton } from "@/components/ui/submit-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Trip = {
  id: string;
  customer: string | null;
  trip_date: string;
  route_from: string;
  route_to: string;
  km: number;
  departed_at: string | null;
  arrived_at: string | null;
  rate: number;
  amount: number;
  created_at: string;
};

const SELECT_COLS =
  "id, customer, trip_date, route_from, route_to, km, departed_at, arrived_at, rate, amount, created_at";

const eur = new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" });
const km1 = new Intl.NumberFormat("sl-SI", { maximumFractionDigits: 1 });

// Duration from two 'HH:MM' strings, same calendar day. Returns "" if either is
// missing or the times don't form a positive span (we don't guess overnight trips).
function duration(from: string | null, to: string | null): string {
  if (!from || !to) return "";
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  const mins = th * 60 + tm - (fh * 60 + fm);
  if (mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Module entry. List + create form. (No detail view in this slice.)
export async function TravelOrdersModule(_props: { selectedId?: string }) {
  void _props;
  const supabase = await createClient();
  // RLS scopes this to the signed-in user's own trips.
  const { data } = await supabase
    .from("travel_orders_trips")
    .select(SELECT_COLS)
    .order("trip_date", { ascending: false })
    .order("created_at", { ascending: false });
  const trips = (data ?? []) as Trip[];

  const totalKm = trips.reduce((s, t) => s + Number(t.km), 0);
  const totalAmount = trips.reduce((s, t) => s + Number(t.amount), 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Potni nalogi</h1>
          <Badge variant="secondary">{eur.format(RATE_EUR_PER_KM)}/km</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Vneseš službeno pot in modul izračuna povračilo kilometrine.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova pot</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTrip} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer">Stranka (neobvezno)</Label>
              <Input id="customer" name="customer" maxLength={200} placeholder="npr. Acme d.o.o." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trip_date">Datum</Label>
              <Input id="trip_date" name="trip_date" type="date" required defaultValue={today} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="route_from">Od</Label>
              <Input id="route_from" name="route_from" required maxLength={200} placeholder="npr. Ljubljana" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="route_to">Do</Label>
              <Input id="route_to" name="route_to" required maxLength={200} placeholder="npr. Maribor" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="km">Kilometri</Label>
              <Input id="km" name="km" type="number" required min={0} step="0.1" inputMode="decimal" placeholder="npr. 128" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="departed_at">Odhod</Label>
                <Input id="departed_at" name="departed_at" type="time" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="arrived_at">Prihod</Label>
                <Input id="arrived_at" name="arrived_at" type="time" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <SubmitButton className="w-full sm:w-auto" pendingText="Shranjujem…">
                Dodaj pot
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Poti</h2>
          {trips.length > 0 ? (
            <div className="text-sm text-muted-foreground">
              Skupaj: <span className="font-medium text-foreground">{km1.format(totalKm)} km</span>
              {" · "}
              <span className="font-medium text-foreground">{eur.format(totalAmount)}</span>
            </div>
          ) : null}
        </div>

        {trips.length > 0 ? (
          <div className="space-y-2">
            {trips.map((t) => {
              const dur = duration(t.departed_at, t.arrived_at);
              return (
                <Card key={t.id} size="sm">
                  <CardContent className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {t.route_from} → {t.route_to}
                      </div>
                      <div className="mt-0.5 truncate text-sm text-muted-foreground">
                        {t.trip_date}
                        {t.customer ? ` · ${t.customer}` : ""}
                        {` · ${km1.format(Number(t.km))} km`}
                        {dur ? ` · ${dur}` : ""}
                      </div>
                    </div>
                    <Badge variant="default" className="shrink-0">
                      {eur.format(Number(t.amount))}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Še ni poti. Dodaj prvo zgoraj.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
