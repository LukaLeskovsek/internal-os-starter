-- travel_orders module — database migration (travel/mileage orders).
-- Apply with:  npm run db:run -- modules/travel_orders/db/0001_travel_orders.sql
--
-- Same convention as the other modules (register → grant → prefixed table + RLS).
-- A trip belongs to ONE user, so the usual owner-only RLS applies. The km rate is
-- stored per-row (default 0.43, the SLO uredba rate) so a later edit can't silently
-- rewrite history; `amount` is the reimbursement the action computed (km × rate).
-- Safe to re-run (if-not-exists / drop-if-exists guards).

-- 1. Register + order the module.
insert into public.core_modules (id, name) values ('travel_orders', 'Potni nalogi')
  on conflict (id) do nothing;
update public.core_modules set sort_order = 5 where id = 'travel_orders';

-- 2. Grant to every existing owner (new users are handled by handle_new_user()).
insert into public.core_user_modules (user_id, module_id, granted_by)
  select id, 'travel_orders', id from public.core_profiles where role = 'owner'
  on conflict (user_id, module_id) do nothing;

-- 3. The module's data — prefixed table, RLS in the same migration.
create table if not exists public.travel_orders_trips (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  customer     text,                                            -- free text (cross-module CRM read is forbidden)
  trip_date    date not null default current_date,
  route_from   text not null,
  route_to     text not null,
  km           numeric(8, 1) not null check (km >= 0),
  departed_at  text,                                            -- 'HH:MM' (optional)
  arrived_at   text,                                            -- 'HH:MM' (optional)
  rate         numeric(6, 3) not null default 0.43 check (rate >= 0),
  amount       numeric(10, 2) not null check (amount >= 0),     -- km × rate, computed in the action
  created_at   timestamptz not null default now()
);

create index if not exists travel_orders_trips_user_idx
  on public.travel_orders_trips (user_id, trip_date desc);

alter table public.travel_orders_trips enable row level security;

drop policy if exists "travel_orders_trips: owner all" on public.travel_orders_trips;
create policy "travel_orders_trips: owner all"
  on public.travel_orders_trips for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
