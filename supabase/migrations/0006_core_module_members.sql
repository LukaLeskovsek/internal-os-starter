-- 0006_core_module_members.sql — "who else uses this module?"
--
-- core_profiles RLS lets a member read only their OWN profile, so a member could
-- never pick a colleague (e.g. assign a work order). This SECURITY DEFINER
-- function returns the active people granted a module — and only if the caller
-- is an ACTIVE user who is granted that same, enabled module (or is an owner).
-- It exposes id, name and email, nothing else.

create or replace function public.core_module_members(p_module text)
returns table (id uuid, full_name text, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, p.email
  from public.core_profiles p
  join public.core_user_modules g on g.user_id = p.id and g.module_id = p_module
  where not p.disabled
    -- the caller must be an active user (a disabled user may still hold a session)
    and exists (
      select 1 from public.core_profiles caller
      where caller.id = auth.uid() and not caller.disabled
    )
    and (
      public.is_owner()
      or (
        -- members: only for a module that is switched on AND granted to them
        exists (
          select 1 from public.core_modules m
          where m.id = p_module and m.enabled
        )
        and exists (
          select 1 from public.core_user_modules me
          where me.user_id = auth.uid() and me.module_id = p_module
        )
      )
    )
  order by coalesce(p.full_name, p.email);
$$;

revoke all on function public.core_module_members(text) from public, anon;
grant execute on function public.core_module_members(text) to authenticated;
