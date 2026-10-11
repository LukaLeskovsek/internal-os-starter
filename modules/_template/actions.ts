"use server";

// Write paths. Every action:
//   1. starts with moduleContext() — signed in, granted, module switched on;
//   2. validates with zod and returns field errors (fromZod), never throws;
//   3. writes only this module's own RLS-scoped table;
//   4. revalidates the page and returns a Slovenian message for the toast.
// Form actions take (prev, formData); button actions take typed arguments.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, fromZod, ok, type ActionResult } from "@/lib/action-result";
import { moduleContext } from "@/lib/module-context";
import { todayIso } from "@/lib/format";
import { t } from "./strings";
import type { Item } from "./types";

const MODULE = "template";
const BASE = `/m/${MODULE}`;
const TABLE = "template_items";
const COLS = "id, title, note, item_date, created_at";

const UUID = z.uuid();
const ItemSchema = z.object({
  title: z.string().trim().min(1, t.errTitle).max(200, t.errTooLong),
  item_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t.errDate),
  note: z.string().trim().max(2000, t.errTooLong).optional(),
});

function readForm(fd: FormData) {
  const get = (k: string) => {
    const v = fd.get(k);
    return v === null || String(v).trim() === "" ? undefined : String(v);
  };
  return { id: get("id"), fields: { title: get("title") ?? "", item_date: get("item_date") ?? "", note: get("note") } };
}

export async function createItem(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  const parsed = ItemSchema.safeParse(readForm(fd).fields);
  if (!parsed.success) return fromZod(parsed.error);

  const { error } = await ctx.supabase.from(TABLE).insert({
    user_id: ctx.user.id,
    title: parsed.data.title,
    item_date: parsed.data.item_date,
    note: parsed.data.note ?? null,
  });
  if (error) return fail(t.saveFailed);

  revalidatePath(BASE);
  return ok(t.created);
}

export async function updateItem(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  const { id, fields } = readForm(fd);
  if (!UUID.safeParse(id).success) return fail(t.notFound);
  const parsed = ItemSchema.safeParse(fields);
  if (!parsed.success) return fromZod(parsed.error);

  // RLS makes this a no-op for someone else's row.
  const { data, error } = await ctx.supabase
    .from(TABLE)
    .update({ title: parsed.data.title, item_date: parsed.data.item_date, note: parsed.data.note ?? null })
    .eq("id", id!)
    .select("id")
    .maybeSingle();
  if (error) return fail(t.saveFailed);
  if (!data) return fail(t.notFound);

  revalidatePath(BASE);
  return ok(t.updated);
}

/** "Ponovi": the same entry, dated today. Returns the new id so undo can remove it. */
export async function repeatItem(id: string): Promise<ActionResult<{ id: string }>> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  if (!UUID.safeParse(id).success) return fail(t.notFound);

  const { data: src } = await ctx.supabase.from(TABLE).select(COLS).eq("id", id).maybeSingle();
  if (!src) return fail(t.notFound);

  const { data, error } = await ctx.supabase
    .from(TABLE)
    .insert({ user_id: ctx.user.id, title: src.title, note: src.note, item_date: todayIso() })
    .select("id")
    .single();
  if (error) return fail(t.saveFailed);

  revalidatePath(BASE);
  return ok(t.repeated, { id: data.id as string });
}

/** Delete, returning the row so "Razveljavi" can put it back (no confirm dialog needed). */
export async function deleteItem(id: string): Promise<ActionResult<Item>> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  if (!UUID.safeParse(id).success) return fail(t.notFound);

  const { data, error } = await ctx.supabase.from(TABLE).delete().eq("id", id).select(COLS).maybeSingle();
  if (error) return fail(t.saveFailed);
  if (!data) return fail(t.notFound);

  revalidatePath(BASE);
  return ok(t.deleted, data as Item);
}

export async function restoreItem(item: Item): Promise<ActionResult> {
  const ctx = await moduleContext(MODULE);
  if (!ctx.ok) return ctx;
  // The row comes back from the browser: re-validate it, and let the database set
  // created_at. Never trust client-sent values that matter (amounts, rates, dates of record).
  const parsed = ItemSchema.extend({ id: UUID }).safeParse({
    ...item,
    note: item.note ?? undefined,
  });
  if (!parsed.success) return fromZod(parsed.error);

  const { id, title, item_date, note } = parsed.data;
  const { error } = await ctx.supabase.from(TABLE).insert({ id, title, item_date, note: note ?? null, user_id: ctx.user.id });
  if (error) return fail(t.saveFailed);

  revalidatePath(BASE);
  return ok(t.restored);
}
