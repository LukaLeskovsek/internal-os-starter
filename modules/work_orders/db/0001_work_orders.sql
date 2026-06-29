-- work_orders module — database migration (work orders: create, assign, status).
-- Apply with:  npm run db:run -- modules/work_orders/db/0001_work_orders.sql
--
-- Same convention as the other modules (register → grant → prefixed table + RLS),
-- with ONE difference worth understanding: this table is shared between TWO users —
-- the office creator (user_id) and the field worker it's assigned to (assignee_id).
-- So the RLS policy is "creator OR assignee", not the usual "owner only". Safe to
-- re-run (drop-if-exists guards).

-- 1. Register + order the module.
insert into public.core_modules (id, name) values ('work_orders', 'Delovni nalogi')
  on conflict (id) do nothing;
update public.core_modules set sort_order = 4 where id = 'work_orders';

-- 2. Grant to every existing owner (new users are handled by handle_new_user()).
insert into public.core_user_modules (user_id, module_id, granted_by)
  select id, 'work_orders', id from public.core_profiles where role = 'owner'
  on conflict (user_id, module_id) do nothing;

-- 3. The module's data — prefixed table, RLS in the same migration.
create table if not exists public.work_orders_orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade, -- creator (office)
  assignee_id      uuid references auth.users (id) on delete set null,                            -- field worker
  zoho_customer_id text,                                                                          -- Zoho Account id (read-only ref)
  customer_name    text,                                                                          -- denormalized for display
  title            text not null,
  description      text,
  status           text not null default 'odprt'
                     check (status in ('odprt', 'v_delu', 'zakljucen')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists work_orders_orders_assignee_idx
  on public.work_orders_orders (assignee_id);

alter table public.work_orders_orders enable row level security;

-- Creator OR assignee may read/write the row. The office creates and assigns; the
-- field worker (assignee) advances the status. WITH CHECK uses the same predicate
-- so an assignee's status update passes (auth.uid() = assignee_id).
drop policy if exists "work_orders_orders: creator or assignee all" on public.work_orders_orders;
create policy "work_orders_orders: creator or assignee all"
  on public.work_orders_orders for all
  using (auth.uid() = user_id or auth.uid() = assignee_id)
  with check (auth.uid() = user_id or auth.uid() = assignee_id);
