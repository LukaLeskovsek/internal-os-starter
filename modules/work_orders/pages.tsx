// work_orders: the "dispatch" pattern.
//
// Job: "The office hands a job to someone; that person sees it on their phone,
// starts it and closes it." So the page opens on what concerns you (Moji, when
// something is assigned to you), every row carries its next step as one tap,
// "Nov nalog" (N, ?nov=1) is three answers, and ?id= opens the order in a sheet
// over the list. Data loads here; the interactive pieces are client components.
import Link from "next/link";
import { ClipboardCheck, Plus } from "lucide-react";
import type { ModuleProps } from "@/lib/modules";
import { createClient } from "@/lib/supabase/server";
import { listModuleMembers } from "@/lib/access";
import { PageHeader } from "@/components/app/page-header";
import { FilterChips } from "@/components/app/filter-chips";
import { DataList } from "@/components/app/data-list";
import { EmptyState } from "@/components/app/empty-state";
import { DetailSheet } from "@/components/app/detail-sheet";
import { Button } from "@/components/ui/button";
import { formatDate, formatRelative } from "@/lib/format";
import { listCustomers } from "./lib/zoho";
import { FILTERS, t, type Filter } from "./strings";
import { NewOrderSheet } from "./new-order-sheet";
import { OrderRow } from "./order-row";
import { OrderDetail } from "./order-detail";
import type { CustomerOption, OrderRowData, PersonOption, WorkOrder } from "./types";

const BASE = "/m/work_orders";
const COLS =
  "id, user_id, assignee_id, zoho_customer_id, customer_name, title, description, status, created_at, updated_at";
const RECENT_CUSTOMERS = 5;

/** Which orders each filter chip shows. */
const MATCHES: Record<Filter, (o: WorkOrder, me: string) => boolean> = {
  moji: (o, me) => o.assignee_id === me && o.status !== "zakljucen",
  odprti: (o) => o.status === "odprt",
  v_delu: (o) => o.status === "v_delu",
  zakljuceni: (o) => o.status === "zakljucen",
};

const EMPTY: Record<Filter, { title: string; text: string }> = {
  moji: { title: t.emptyMine, text: t.emptyMineText },
  odprti: { title: t.emptyOpen, text: t.emptyOpenText },
  v_delu: { title: t.emptyInProgress, text: t.emptyInProgressText },
  zakljuceni: { title: t.emptyDone, text: t.emptyDoneText },
};

export async function WorkOrdersModule({ searchParams }: ModuleProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const me = user?.id ?? "";

  // RLS returns only orders where I'm the creator or the assignee.
  const [ordersRes, members, zoho] = await Promise.all([
    supabase.from("work_orders_orders").select(COLS).order("created_at", { ascending: false }),
    listModuleMembers(supabase, "work_orders"),
    listCustomers().catch(() => ({ customers: [], mock: false })),
  ]);
  const all = (ordersRes.data ?? []) as WorkOrder[];

  // ---- people: names for rows, options for the pickers
  const nameOf = new Map(members.map((m) => [m.id, m.full_name || m.email || t.formerColleague]));
  const personLabel = (id: string | null) =>
    !id ? t.unassigned : id === me ? t.you : (nameOf.get(id) ?? t.formerColleague);
  const people: PersonOption[] = members.map((m) => ({
    value: m.id,
    label: m.id === me ? `${nameOf.get(m.id)} (${t.you.toLowerCase()})` : nameOf.get(m.id)!,
  }));

  // ---- filter: default to "Moji" when something is waiting for me
  const mineCount = all.filter((o) => MATCHES.moji(o, me)).length;
  const requested = FILTERS.find((f) => f.value === searchParams.f)?.value;
  const filter: Filter = requested ?? (mineCount ? "moji" : "odprti");
  const shown = all.filter((o) => MATCHES[filter](o, me));
  // In "Moji", what's already in progress comes first.
  if (filter === "moji") shown.sort((a, b) => Number(b.status === "v_delu") - Number(a.status === "v_delu"));
  const listHref = `${BASE}?f=${filter}`;

  const rows: OrderRowData[] = shown.map((o) => ({
    id: o.id,
    title: o.title,
    status: o.status,
    meta: [o.customer_name ?? t.noCustomer, personLabel(o.assignee_id), formatRelative(o.created_at)].join(" · "),
    href: `${listHref}&id=${o.id}`,
  }));

  // ---- the new-order sheet's guesses, from orders I created (newest first)
  const mineCreated = all.filter((o) => o.user_id === me);
  const recentIds = [...new Set(mineCreated.map((o) => o.zoho_customer_id).filter(Boolean))].slice(
    0,
    RECENT_CUSTOMERS,
  ) as string[];
  const customers: CustomerOption[] = [
    ...recentIds.flatMap((id) => zoho.customers.filter((c) => c.id === id)),
    ...zoho.customers
      .filter((c) => !recentIds.includes(c.id))
      .sort((a, b) => a.name.localeCompare(b.name, "sl")),
  ].map((c) => ({ value: c.id, label: c.name, city: c.city, recent: recentIds.includes(c.id) }));
  const lastAssignee = mineCreated.find((o) => o.assignee_id && nameOf.has(o.assignee_id))?.assignee_id;
  const defaultAssignee = lastAssignee ?? (nameOf.has(me) ? me : people[0]?.value);

  // ---- detail sheet (?id=)
  const selected = searchParams.id ? all.find((o) => o.id === searchParams.id) : undefined;

  const opensNew = searchParams.nov === "1";
  const empty = EMPTY[filter];

  return (
    <div className="max-sm:pb-24">
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <NewOrderSheet
            defaultOpen={opensNew}
            customers={customers}
            customersAreDemo={zoho.mock}
            people={people}
            defaultAssignee={defaultAssignee}
          />
        }
      />

      <FilterChips
        base={BASE}
        value={filter}
        options={FILTERS.map((f) => ({
          value: f.value,
          label: f.label,
          count: all.filter((o) => MATCHES[f.value](o, me)).length,
        }))}
      />

      {rows.length ? (
        <DataList>
          {rows.map((r) => (
            <OrderRow key={r.id} order={r} />
          ))}
        </DataList>
      ) : (
        <EmptyState
          icon={ClipboardCheck}
          title={empty.title}
          action={
            <Button size="lg" render={<Link href={`${listHref}&nov=1`} scroll={false} />}>
              <Plus />
              {t.newOrder}
            </Button>
          }
        >
          {empty.text}
        </EmptyState>
      )}

      {searchParams.id ? (
        selected ? (
          <OrderDetail
            key={selected.id}
            closeHref={listHref}
            // Keep a former colleague selectable as "who has it now", never as a raw id.
            people={
              selected.assignee_id && !nameOf.has(selected.assignee_id)
                ? [...people, { value: selected.assignee_id, label: t.formerColleague }]
                : people
            }
            order={{
              id: selected.id,
              title: selected.title,
              description: selected.description,
              status: selected.status,
              assigneeId: selected.assignee_id,
              assigneeLabel: personLabel(selected.assignee_id),
              customerLabel: selected.customer_name ?? t.noCustomer,
              creatorLabel: personLabel(selected.user_id),
              createdLabel: formatDate(selected.created_at),
              isCreator: selected.user_id === me,
            }}
          />
        ) : (
          <DetailSheet title={t.notFound} closeHref={listHref}>
            <p className="text-muted-foreground">{t.notFoundText}</p>
          </DetailSheet>
        )
      ) : null}
    </div>
  );
}
