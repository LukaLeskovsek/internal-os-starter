-- leave module — company days off (kolektivni dopust, a bridge day between holidays).
-- Apply with:  npm run db:run -- modules/leave/db/0002_leave_company_days.sql
--
-- Like public holidays, these days don't count as leave. Same shared access as the
-- rest of the module: anyone granted "leave" (and active), or an owner — see
-- public.leave_can_access() in 0001_leave.sql. Safe to re-run.

create table if not exists public.leave_company_days (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade, -- who entered it
  name        text not null check (length(name) between 1 and 200),
  start_date  date not null,
  end_date    date not null,
  created_at  timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists leave_company_days_dates_idx
  on public.leave_company_days (start_date, end_date);

alter table public.leave_company_days enable row level security;

drop policy if exists "leave_company_days: granted all" on public.leave_company_days;
create policy "leave_company_days: granted all"
  on public.leave_company_days for all
  using ((select public.leave_can_access()))
  with check ((select public.leave_can_access()));
