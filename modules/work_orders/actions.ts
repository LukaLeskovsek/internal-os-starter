"use server";

// work_orders write paths. Mirrors invoice_ocr/actions.ts: validate → re-check
// userCanAccess (a member without the module can't drive it by posting directly) →
// write the module's PREFIXED, RLS-scoped table → revalidate. RLS guarantees a user
// can only touch rows where they are the creator OR the assignee.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { userCanAccess } from "@/lib/access";
import { listCustomers } from "./lib/zoho";

const MODULE = "work_orders";
const BASE = `/m/${MODULE}`;
const UUID = /^[0-9a-fA-F-]{36}$/;

function fail(message: string): never {
  redirect(`${BASE}?error=${encodeURIComponent(message)}`);
}

const CreateSchema = z.object({
  title: z.string().trim().min(1, "Naslov je obvezen.").max(200, "Naslov je predolg."),
  description: z.string().max(4000, "Opis je predolg.").optional(),
  assignee_id: z.string().regex(UUID, "Izberi izvajalca."),
  zoho_customer_id: z.string().max(100).optional(),
});

export async function createWorkOrder(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return v === null || v === "" ? undefined : String(v);
  };
  const parsed = CreateSchema.safeParse({
    title: get("title") ?? "",
    description: get("description"),
    assignee_id: get("assignee_id") ?? "",
    zoho_customer_id: get("zoho_customer_id"),
  });
  if (!parsed.success) fail(parsed.error.issues[0]!.message);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await userCanAccess(supabase, user.id, MODULE))) fail("Nimaš dostopa do tega modula.");

  // Denormalize the customer name from Zoho (read-only) so the list/detail can show
  // it without a per-row Zoho call. Mock mode resolves against bundled fixtures.
  let customerName: string | null = null;
  if (parsed.data.zoho_customer_id) {
    const { customers } = await listCustomers();
    customerName =
      customers.find((c) => c.id === parsed.data.zoho_customer_id)?.name ?? null;
  }

  const { error } = await supabase.from("work_orders_orders").insert({
    user_id: user.id,
    assignee_id: parsed.data.assignee_id,
    zoho_customer_id: parsed.data.zoho_customer_id ?? null,
    customer_name: customerName,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    status: "odprt",
  });
  if (error) fail(error.message);

  revalidatePath(BASE);
  redirect(`${BASE}?ok=1`);
}

const StatusSchema = z.object({
  id: z.string().regex(UUID, "Neveljaven ID."),
  status: z.enum(["odprt", "v_delu", "zakljucen"]),
});

export async function setWorkOrderStatus(formData: FormData) {
  const parsed = StatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) fail(parsed.error.issues[0]!.message);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await userCanAccess(supabase, user.id, MODULE))) fail("Nimaš dostopa do tega modula.");

  // RLS scopes the update to rows where the user is creator or assignee.
  const { error } = await supabase
    .from("work_orders_orders")
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id);
  if (error) fail(error.message);

  revalidatePath(BASE);
  redirect(`${BASE}?id=${parsed.data.id}&ok=1`);
}
