import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listUsers } from "@/lib/access";
import { listCustomers } from "./lib/zoho";
import { createWorkOrder, setWorkOrderStatus } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "odprt" | "v_delu" | "zakljucen";

type WorkOrder = {
  id: string;
  user_id: string;
  assignee_id: string | null;
  zoho_customer_id: string | null;
  customer_name: string | null;
  title: string;
  description: string | null;
  status: Status;
  created_at: string;
};

const SELECT_COLS =
  "id, user_id, assignee_id, zoho_customer_id, customer_name, title, description, status, created_at";

// The three states, with Slovenian labels + a badge variant each. The order is the
// natural lifecycle, reused for the status buttons on the detail screen.
const STATUS_FLOW: Status[] = ["odprt", "v_delu", "zakljucen"];
const STATUS: Record<
  Status,
  { label: string; variant: "outline" | "secondary" | "default" }
> = {
  odprt: { label: "Odprt", variant: "outline" },
  v_delu: { label: "V delu", variant: "secondary" },
  zakljucen: { label: "Zaključen", variant: "default" },
};

// Native <select>, styled to match the Input. shadcn has no Select primitive here,
// and a native control is the most mobile-friendly (uses the OS picker on phones).
const selectClass =
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function userLabel(u: { full_name: string | null; email: string | null; id: string }) {
  return u.full_name || u.email || u.id.slice(0, 8);
}

// Module entry: the list (with the create form), or a single work order when ?id= is set.
export async function WorkOrdersModule({ selectedId }: { selectedId?: string }) {
  return selectedId ? <WorkOrderDetail id={selectedId} /> : <WorkOrderList />;
}

// ---------------------------------------------------------------- list view
async function WorkOrderList() {
  const supabase = await createClient();
  // RLS scopes this to rows where the user is creator OR assignee.
  const { data } = await supabase
    .from("work_orders_orders")
    .select(SELECT_COLS)
    .order("created_at", { ascending: false });
  const orders = (data ?? []) as WorkOrder[];

  const users = await listUsers(supabase);
  const nameById = new Map(users.map((u) => [u.id, userLabel(u)]));
  const { customers, mock } = await listCustomers();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Delovni nalogi</h1>
          {mock ? <Badge variant="secondary">Zoho: mock</Badge> : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Pisarna ustvari nalog in ga dodeli izvajalcu; izvajalec ga na telefonu
          premika skozi statuse do zaključka.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nov delovni nalog</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createWorkOrder} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="title">Naslov</Label>
              <Input id="title" name="title" required maxLength={200} placeholder="npr. Servis klime — pisarna 2. nadstropje" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zoho_customer_id">Stranka (Zoho)</Label>
              <select id="zoho_customer_id" name="zoho_customer_id" className={selectClass} defaultValue="">
                <option value="">— brez stranke —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.city ? ` · ${c.city}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assignee_id">Izvajalec</Label>
              <select id="assignee_id" name="assignee_id" required className={selectClass} defaultValue="">
                <option value="" disabled>
                  — izberi izvajalca —
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {userLabel(u)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Opis (neobvezno)</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                maxLength={4000}
                placeholder="Podrobnosti naloga, navodila za teren…"
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton className="w-full sm:w-auto" pendingText="Shranjujem…">
                Ustvari nalog
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Nalogi</h2>
        {orders.length > 0 ? (
          <div className="space-y-2">
            {orders.map((o) => {
              const st = STATUS[o.status] ?? STATUS.odprt;
              return (
                <Link key={o.id} href={`/m/work_orders?id=${o.id}`} className="group block">
                  <Card size="sm" className="transition group-hover:ring-foreground/25">
                    <CardContent className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{o.title}</div>
                        <div className="mt-0.5 truncate text-sm text-muted-foreground">
                          {o.customer_name ?? "Brez stranke"}
                          {" · "}
                          {o.assignee_id ? (nameById.get(o.assignee_id) ?? "—") : "ni dodeljen"}
                        </div>
                      </div>
                      <Badge variant={st.variant} className="shrink-0">
                        {st.label}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Še ni nalogov. Ustvari prvega zgoraj.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------- detail view
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm whitespace-pre-wrap">{value}</div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/m/work_orders"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> Nazaj na seznam
    </Link>
  );
}

async function WorkOrderDetail({ id }: { id: string }) {
  const supabase = await createClient();
  // RLS: returns the row only if the user is its creator or assignee.
  const { data } = await supabase
    .from("work_orders_orders")
    .select(SELECT_COLS)
    .eq("id", id)
    .maybeSingle();
  const order = data as WorkOrder | null;

  if (!order) {
    return (
      <div className="space-y-5">
        <BackLink />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nalog ni najden (ali nimaš dostopa).
          </CardContent>
        </Card>
      </div>
    );
  }

  const users = await listUsers(supabase);
  const nameById = new Map(users.map((u) => [u.id, userLabel(u)]));
  const st = STATUS[order.status] ?? STATUS.odprt;

  return (
    <div className="space-y-5">
      <BackLink />

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{order.title}</h1>
        <Badge variant={st.variant}>{st.label}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Podatki naloga</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Stranka" value={order.customer_name ?? "—"} />
          <Field
            label="Izvajalec"
            value={order.assignee_id ? (nameById.get(order.assignee_id) ?? "—") : "ni dodeljen"}
          />
          <div className="col-span-2">
            <Field label="Opis" value={order.description ?? "—"} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          {/* One small form per target status — robust regardless of button value
              forwarding. The current status is disabled. Stacks on mobile. */}
          <div className="flex flex-col gap-2 sm:flex-row">
            {STATUS_FLOW.map((s) => {
              const isCurrent = s === order.status;
              return (
                <form key={s} action={setWorkOrderStatus} className="sm:flex-1">
                  <input type="hidden" name="id" value={order.id} />
                  <input type="hidden" name="status" value={s} />
                  <SubmitButton
                    className="w-full"
                    variant={isCurrent ? "default" : "outline"}
                    disabled={isCurrent}
                    pendingText="Shranjujem…"
                  >
                    {STATUS[s].label}
                  </SubmitButton>
                </form>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
