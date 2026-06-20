-- tasks module migration. Run with:  npm run db:run -- modules/tasks/db/0001_tasks.sql
-- Follows the rails: table is PREFIXED (tasks_*) and ships RLS in the same file.

create table if not exists public.tasks_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null,
  done       boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.tasks_items enable row level security;

create policy "tasks_items: owner all"
  on public.tasks_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- register the module in the catalogue (mirrors modules/_registry.ts)
insert into public.core_modules (id, name) values ('tasks', 'Tasks')
on conflict (id) do nothing;
