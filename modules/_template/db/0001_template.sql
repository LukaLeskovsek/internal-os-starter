-- template module — database migration. /scaffold-module renames "template".
-- Apply with:  npm run db:run -- modules/<id>/db/0001_<id>.sql
-- Safe to re-run (if-not-exists / drop-if-exists guards).

-- 1. Register the module in the catalogue (owners rename / reorder it in Administracija).
insert into public.core_modules (id, name) values ('template', 'Zapiski')
  on conflict (id) do nothing;

-- 2. Grant it to every existing owner (new users get modules from handle_new_user()).
insert into public.core_user_modules (user_id, module_id, granted_by)
  select id, 'template', id from public.core_profiles where role = 'owner'
  on conflict (user_id, module_id) do nothing;

-- 3. Only the data the flow needs — prefixed table, RLS in the same file.
create table if not exists public.template_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null,
  note       text,
  item_date  date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists template_items_user_date_idx
  on public.template_items (user_id, item_date desc);

alter table public.template_items enable row level security;

drop policy if exists "template_items: owner all" on public.template_items;
create policy "template_items: owner all"
  on public.template_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
