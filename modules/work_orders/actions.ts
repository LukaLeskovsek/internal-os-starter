"use server";

// work_orders write paths ("dispatch" pattern). Every action starts with
// moduleContext(), validates with zod, writes the module's own RLS-scoped table,
// revalidates and returns an ActionResult for the toast.
//
// RLS lets the creator OR the assignee read and write a row. On top of that the
// actions enforce two rules RLS doesn't express:
//   - only the creator may delete a work order
//   - only the creator may reassign it (an assignee handing it to someone else
//     would also fail RLS's WITH CHECK, so we say so clearly instead)
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, fromZod, ok, type ActionResult } from "@/lib/action-result";
import { moduleContext } from "@/lib/module-context";
import { listModuleMembers } from "@/lib/access";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listCustomers } from "./lib/zoho";
import { STATUS, STATUSES, t, type Status } from "./strings";

const MODULE = "work_orders";
const BASE = `/m/${MODULE}`;
const TABLE = "work_orders_orders";

const UUID = z.uuid();
const Title = z.string().trim().min(1, t.errTitle).max(200, t.errTooLong);
const Description = z.string().trim().max(4000, t.errTooLong).optional();

/** fd.get() that turns empty inputs into undefined, so optional fields stay optional. */
function formGetter(fd: FormData) {
  return (k: string) => {
    const v = fd.get(k);
    return v === null || String(v).trim() === "" ? undefined : String(v);
  };
}

/** The assignee must be someone who can use this module. */
async function isMember(supabase: SupabaseClient, userId: string) {
  const members = await listModuleMembers(supabase, MODULE);
  return members.some((m) => m.id === userId);
}

const now = () => new Date().toISOString();

// ------------------------------------------------------------------ create
const CreateSchema = z.object({
  title: Title,
  description: Description,
  assignee_id: z.uuid({ error: t.errAssignee }),
  zoho_customer_id: z.string().max(100).optional(),
});

export async function createWorkOrder(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;

  const get = formGetter(fd);
  const parsed = CreateSchema.safeParse({
    title: get("title") ?? "",
    description: get("description"),
    assignee_id: get("assignee_id") ?? "",
    zoho_customer_id: get("zoho_customer_id"),
  });
  if (!parsed.success) return fromZod(parsed.error);
  const d = parsed.data;

  if (!(await isMember(ctx.supabase, d.assignee_id))) {
    return fail(t.errAssigneeNoAccess, { assignee_id: t.errAssigneeNoAccess });
  }

  // Denormalize the customer name from Zoho (read-only) so the list needs no
  // per-row Zoho call. Mock mode resolves against the bundled fixtures.
  let customerName: string | null = null;
  if (d.zoho_customer_id) {
    const { customers } = await listCustomers();
    customerName = customers.find((c) => c.id === d.zoho_customer_id)?.name ?? null;
    if (!customerName) return fail(t.errCustomer, { zoho_customer_id: t.errCustomer });
  }

  const { error } = await ctx.supabase.from(TABLE).insert({
    user_id: ctx.user.id,
    assignee_id: d.assignee_id,
    zoho_customer_id: d.zoho_customer_id ?? null,
    customer_name: customerName,
    title: d.title,
    description: d.description ?? null,
    status: "odprt",
  });
  if (error) return fail(error.message);

  revalidatePath(BASE);
  return ok(t.created);
}

// ------------------------------------------------------------------ edit title / description
const UpdateSchema = z.object({ id: UUID, title: Title, description: Description });

export async function updateWorkOrder(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;

  const get = formGetter(fd);
  const parsed = UpdateSchema.safeParse({
    id: get("id") ?? "",
    title: get("title") ?? "",
    description: get("description"),
  });
  if (!parsed.success) return fromZod(parsed.error);
  const d = parsed.data;

  // RLS scopes the update to rows where the user is creator or assignee.
  const { data, error } = await ctx.supabase
    .from(TABLE)
    .update({ title: d.title, description: d.description ?? null, updated_at: now() })
    .eq("id", d.id)
    .select("id");
  if (error) return fail(error.message);
  if (!data?.length) return fail(t.errNotFound);

  revalidatePath(BASE);
  return ok(t.updated);
}

// ------------------------------------------------------------------ status (inline button + segmented control)
export async function setWorkOrderStatus(id: string, status: Status): Promise<ActionResult> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  if (!UUID.safeParse(id).success || !STATUSES.includes(status)) return fail(t.errNotFound);

  const { data, error } = await ctx.supabase
    .from(TABLE)
    .update({ status, updated_at: now() })
    .eq("id", id)
    .select("id");
  if (error) return fail(error.message);
  if (!data?.length) return fail(t.errNotFound);

  revalidatePath(BASE);
  return ok(t.statusTo(STATUS[status].label));
}

// ------------------------------------------------------------------ reassign
export async function reassignWorkOrder(id: string, assigneeId: string): Promise<ActionResult> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  if (!UUID.safeParse(id).success) return fail(t.errNotFound);
  if (!UUID.safeParse(assigneeId).success) return fail(t.errAssignee);

  const { data: row } = await ctx.supabase.from(TABLE).select("user_id").eq("id", id).maybeSingle();
  if (!row) return fail(t.errNotFound);
  if (row.user_id !== ctx.user.id) return fail(t.errOnlyCreatorReassigns);
  if (!(await isMember(ctx.supabase, assigneeId))) return fail(t.errAssigneeNoAccess);

  const { error } = await ctx.supabase
    .from(TABLE)
    .update({ assignee_id: assigneeId, updated_at: now() })
    .eq("id", id);
  if (error) return fail(error.message);

  revalidatePath(BASE);
  return ok(t.reassigned);
}

// ------------------------------------------------------------------ delete (creator only, confirmed in the UI)
export async function deleteWorkOrder(id: string): Promise<ActionResult> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  if (!UUID.safeParse(id).success) return fail(t.errNotFound);

  const { data: row } = await ctx.supabase.from(TABLE).select("user_id").eq("id", id).maybeSingle();
  if (!row) return fail(t.errNotFound);
  if (row.user_id !== ctx.user.id) return fail(t.errOnlyCreatorDeletes);

  const { error } = await ctx.supabase.from(TABLE).delete().eq("id", id).eq("user_id", ctx.user.id);
  if (error) return fail(error.message);

  revalidatePath(BASE);
  return ok(t.deleted);
}
