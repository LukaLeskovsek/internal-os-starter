-- leave module — database migration (the team, its yearly leave days, absences).
-- Apply with:  npm run db:run -- modules/leave/db/0001_leave.sql
--
-- Same convention as the other modules (register → grant → prefixed tables + RLS),
-- with ONE difference worth understanding: the data is SHARED. A manager and HR
-- both keep the same team and the same absences, so the policy is not "owner only"
-- but "anyone granted the leave module (and still active), or an owner". Access
-- stays data: granting the module in Administracija is what opens the rows.
-- Safe to re-run (if-not-exists / drop-if-exists guards).

-- 1. Register + order the module.
insert into public.core_modules (id, name) values ('leave', 'Dopusti')
  on conflict (id) do nothing;
update public.core_modules set sort_order = 5 where id = 'leave';

-- 2. Grant to every existing owner (new users are handled by handle_new_user()).
insert into public.core_user_modules (user_id, module_id, granted_by)
  select id, 'leave', id from public.core_profiles where role = 'owner'
  on conflict (user_id, module_id) do nothing;

-- 3. Who may touch the shared rows: an active user granted the switched-on module,
--    or an owner. SECURITY DEFINER so the policy can read the grant tables without
--    RLS recursion (same approach as is_owner() / core_module_members()).
create or replace function public.leave_can_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.core_profiles p
    where p.id = auth.uid() and not p.disabled
  )
  and (
    public.is_owner()
    or (
      exists (select 1 from public.core_modules m where m.id = 'leave' and m.enabled)
      and exists (
        select 1 from public.core_user_modules g
        where g.user_id = auth.uid() and g.module_id = 'leave'
      )
    )
  );
$$;

revoke all on function public.leave_can_access() from public, anon;
grant execute on function public.leave_can_access() to authenticated;

-- 4. The team: names only (these people don't sign in) + yearly leave days.
create table if not exists public.leave_people (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade, -- who added them
  full_name   text not null check (length(full_name) between 1 and 200),
  annual_days integer not null default 20 check (annual_days between 0 and 365),
  created_at  timestamptz not null default now()
);

alter table public.leave_people enable row level security;

drop policy if exists "leave_people: granted all" on public.leave_people;
create policy "leave_people: granted all"
  on public.leave_people for all
  using ((select public.leave_can_access()))
  with check ((select public.leave_can_access()));

-- 5. Absences. work_days is computed by the server (weekends + Slovenian holidays
--    excluded), never trusted from the browser.
create table if not exists public.leave_absences (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade, -- who entered it
  person_id   uuid not null references public.leave_people (id) on delete restrict,
  kind        text not null default 'dopust' check (kind in ('dopust', 'bolniska', 'drugo')),
  start_date  date not null,
  end_date    date not null,
  work_days   integer not null check (work_days >= 0),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists leave_absences_dates_idx
  on public.leave_absences (start_date, end_date);
create index if not exists leave_absences_person_idx
  on public.leave_absences (person_id);

alter table public.leave_absences enable row level security;

drop policy if exists "leave_absences: granted all" on public.leave_absences;
create policy "leave_absences: granted all"
  on public.leave_absences for all
  using ((select public.leave_can_access()))
  with check ((select public.leave_can_access()));
