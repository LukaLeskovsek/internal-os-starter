-- Apply after 0001–0003. Old invoice writers fail closed after this migration.
-- Trusted migration owner only; application credentials cannot replace this boundary.
begin;

alter table public.invoice_ocr_invoices add column if not exists revision bigint not null default 0;

create table if not exists public.invoice_ocr_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  input jsonb not null,
  result jsonb not null,
  primary key (user_id, request_id)
);
create table if not exists public.invoice_ocr_audit (
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null references public.invoice_ocr_invoices(id) on delete cascade,
  request_id uuid not null,
  command text not null,
  before_status text,
  after_status text not null,
  revision bigint not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id),
  unique (invoice_id, revision)
);
alter table public.invoice_ocr_requests enable row level security;
alter table public.invoice_ocr_audit enable row level security;

create or replace function public.invoice_ocr_can_access()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.core_profiles p
    join public.core_user_modules g on g.user_id = p.id and g.module_id = 'invoice_ocr'
    join public.core_modules m on m.id = g.module_id
    where p.id = auth.uid() and not p.disabled and m.enabled
  );
$$;
revoke all on function public.invoice_ocr_can_access() from public, anon;
grant execute on function public.invoice_ocr_can_access() to authenticated;

-- Private helper: no exposed RPC execution privilege. Closed fields are checked
-- separately for each command. These checks also run for raw HTTP callers.
create or replace function public.invoice_ocr_check_fields(p jsonb)
returns void language plpgsql set search_path = '' as $$
declare k text; v jsonb;
begin
  for k, v in select * from jsonb_each(p) loop
    if k = any(array['vendor','invoice_number','currency','comment','issue_date','due_date']) then
      if jsonb_typeof(v) not in ('string','null') then raise exception 'invoice_invalid_fields'; end if;
      if k = 'vendor' and length(p->>k) > 200 or k = 'invoice_number' and length(p->>k) > 100
         or k = 'comment' and length(p->>k) > 2000 then raise exception 'invoice_invalid_fields'; end if;
      if k = 'currency' and p->>k is not null and p->>k !~ '^[A-Z]{3}$' then
        raise exception 'invoice_invalid_fields';
      end if;
      if k in ('issue_date','due_date') and p->>k is not null then
        if p->>k !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'invoice_invalid_fields'; end if;
        perform (p->>k)::date;
      end if;
    elsif k = any(array['net_amount','tax_amount','total_amount']) then
      if jsonb_typeof(v) not in ('number','null') then raise exception 'invoice_invalid_fields'; end if;
      if v <> 'null'::jsonb and ((v::text)::numeric <> round((v::text)::numeric, 2)
         or abs((v::text)::numeric) >= 1000000000000) then raise exception 'invoice_invalid_fields'; end if;
    end if;
  end loop;
end;
$$;
revoke all on function public.invoice_ocr_check_fields(jsonb) from public, anon, authenticated, service_role;

create or replace function public.invoice_ocr_execute(
  p_request_id uuid, p_invoice_id uuid, p_expected_revision bigint,
  p_command text, p_payload jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  input jsonb := jsonb_build_object('invoice_id',p_invoice_id,'revision',p_expected_revision,'command',p_command,'payload',p_payload);
  prior public.invoice_ocr_requests%rowtype;
  inv public.invoice_ocr_invoices%rowtype;
  old_status text;
  next_status text;
  response jsonb;
  prior_audit public.invoice_ocr_audit%rowtype;
  fields jsonb;
  li jsonb;
  line_no integer := 0;
begin
  -- Lock current authority until commit, including on replay. Revocation is
  -- ordered before or after this command, rather than racing a cached JWT grant.
  if actor is null then raise exception 'invoice_no_access' using errcode = '42501'; end if;
  perform 1 from public.core_profiles where id = actor and not disabled for share;
  if not found then raise exception 'invoice_no_access' using errcode = '42501'; end if;
  perform 1 from public.core_modules where id = 'invoice_ocr' and enabled for share;
  if not found then raise exception 'invoice_no_access' using errcode = '42501'; end if;
  perform 1 from public.core_user_modules where user_id = actor and module_id = 'invoice_ocr' for share;
  if not found then raise exception 'invoice_no_access' using errcode = '42501'; end if;

  if p_request_id is null or p_invoice_id is null or p_expected_revision is null
     or p_expected_revision < 0 or p_command is null or p_command not in ('import','approve','reject','reopen','undo')
     or p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invoice_invalid_command' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text || '/' || p_request_id::text,0));
  select * into prior from public.invoice_ocr_requests where user_id = actor and request_id = p_request_id;
  if found then
    if prior.input <> input then raise exception 'invoice_request_conflict' using errcode = '22023'; end if;
    return prior.result;
  end if;

  if p_command = 'import' then
    if p_expected_revision <> 0 or exists (
      select 1 from jsonb_object_keys(p_payload) k where k <> all(array[
        'file_path','file_mime','vendor','invoice_number','currency','issue_date','due_date',
        'net_amount','tax_amount','total_amount','comment','raw_json','extracted_mock','line_items'])
    ) then raise exception 'invoice_invalid_command' using errcode = '22023'; end if;
    if jsonb_typeof(p_payload->'file_path') is distinct from 'string'
       or split_part(p_payload->>'file_path','/',1) <> actor::text
       or p_payload->>'file_mime' is null
       or p_payload->>'file_mime' not in ('image/png','image/jpeg','application/pdf')
       or not exists (select 1 from storage.objects where bucket_id = 'invoice_ocr' and name = p_payload->>'file_path')
       or jsonb_typeof(p_payload->'line_items') is distinct from 'array'
       or jsonb_array_length(p_payload->'line_items') > 1000
       or jsonb_typeof(p_payload->'extracted_mock') is distinct from 'boolean' then
      raise exception 'invoice_invalid_fields' using errcode = '22023';
    end if;
    perform public.invoice_ocr_check_fields(p_payload);
    inv := jsonb_populate_record(null::public.invoice_ocr_invoices, p_payload - 'line_items');
    insert into public.invoice_ocr_invoices (
      id,user_id,file_path,file_mime,vendor,invoice_number,currency,issue_date,due_date,
      net_amount,tax_amount,total_amount,comment,raw_json,extracted_mock,status,revision
    ) values (
      p_invoice_id,actor,inv.file_path,inv.file_mime,inv.vendor,inv.invoice_number,inv.currency,inv.issue_date,inv.due_date,
      inv.net_amount,inv.tax_amount,inv.total_amount,inv.comment,inv.raw_json,inv.extracted_mock,'pending',1
    ) returning * into inv;
    for li in select * from jsonb_array_elements(p_payload->'line_items') loop
      if jsonb_typeof(li) <> 'object' or exists (
        select 1 from jsonb_object_keys(li) k where k <> all(array[
          'description','quantity','unit','unit_price','net_amount','tax_rate','tax_amount','total_amount'])
      ) then raise exception 'invoice_invalid_fields' using errcode = '22023'; end if;
      if exists (select 1 from jsonb_each(li) e where
          (e.key in ('description','unit') and jsonb_typeof(e.value) not in ('string','null'))
          or (e.key not in ('description','unit') and jsonb_typeof(e.value) not in ('number','null'))
      ) then raise exception 'invoice_invalid_fields' using errcode = '22023'; end if;
      line_no := line_no + 1;
      insert into public.invoice_ocr_line_items (
        invoice_id,user_id,line_no,description,quantity,unit,unit_price,net_amount,tax_rate,tax_amount,total_amount
      ) values (
        inv.id,actor,line_no,li->>'description',(li->>'quantity')::numeric,li->>'unit',
        (li->>'unit_price')::numeric,(li->>'net_amount')::numeric,(li->>'tax_rate')::numeric,
        (li->>'tax_amount')::numeric,(li->>'total_amount')::numeric
      );
    end loop;
  else
    select * into inv from public.invoice_ocr_invoices where id = p_invoice_id and user_id = actor for update;
    if not found then raise exception 'invoice_not_found' using errcode = 'PT404'; end if;
    if inv.revision <> p_expected_revision then raise exception 'invoice_stale' using errcode = 'PT409'; end if;
    old_status := inv.status;
    if p_command in ('approve','reject') then
      if inv.status <> 'pending' then raise exception 'invoice_transition' using errcode = '22023'; end if;
      if exists (select 1 from jsonb_object_keys(p_payload) k where k <> all(array[
        'vendor','invoice_number','currency','issue_date','due_date','net_amount','tax_amount','total_amount','comment'])
      ) then raise exception 'invoice_invalid_command' using errcode = '22023'; end if;
      perform public.invoice_ocr_check_fields(p_payload);
      inv := jsonb_populate_record(inv,p_payload);
      next_status := case p_command when 'approve' then 'approved' else 'rejected' end;
    elsif p_command = 'reopen' then
      if p_payload <> '{}'::jsonb or inv.status not in ('approved','rejected') then
        raise exception 'invoice_transition' using errcode = '22023'; end if;
      next_status := 'pending';
    else
      if not (p_payload ? 'request_id') or p_payload - 'request_id' <> '{}'::jsonb
         or jsonb_typeof(p_payload->'request_id') <> 'string' then
        raise exception 'invoice_invalid_command' using errcode = '22023'; end if;
      select * into prior_audit from public.invoice_ocr_audit where invoice_id = inv.id
        and user_id = actor and request_id = (p_payload->>'request_id')::uuid and revision = inv.revision;
      if not found or prior_audit.command not in ('approve','reject','reopen') then
        raise exception 'invoice_transition' using errcode = '22023'; end if;
      next_status := prior_audit.before_status;
    end if;
    -- The invariant is shared by every path into a decided state, including undo.
    if next_status = 'approved' and (nullif(regexp_replace(inv.vendor,U&'[[:space:]\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]','','g'),'') is null or inv.total_amount is null) then
      raise exception 'invoice_approval_fields' using errcode = '22023'; end if;
    if next_status = 'rejected' and nullif(regexp_replace(inv.comment,U&'[[:space:]\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]','','g'),'') is null then
      raise exception 'invoice_rejection_reason' using errcode = '22023'; end if;
    update public.invoice_ocr_invoices set
      vendor = inv.vendor, invoice_number = inv.invoice_number, currency = inv.currency,
      issue_date = inv.issue_date, due_date = inv.due_date, net_amount = inv.net_amount,
      tax_amount = inv.tax_amount, total_amount = inv.total_amount, comment = inv.comment,
      status = next_status, reviewed_at = case when next_status = 'pending' then null else now() end,
      revision = revision + 1 where id = inv.id returning * into inv;
  end if;

  fields := jsonb_build_object('vendor',inv.vendor,'invoice_number',inv.invoice_number,
    'currency',inv.currency,'issue_date',inv.issue_date,'due_date',inv.due_date,'net_amount',inv.net_amount,'tax_amount',inv.tax_amount,
    'total_amount',inv.total_amount,'comment',inv.comment);
  insert into public.invoice_ocr_audit (user_id,invoice_id,request_id,command,before_status,after_status,revision,data)
    values (actor,inv.id,p_request_id,p_command,old_status,inv.status,inv.revision,fields);
  response := jsonb_build_object('id',inv.id,'revision',inv.revision,'status',inv.status,'requestId',p_request_id);
  insert into public.invoice_ocr_requests values (actor,p_request_id,input,response);
  return response;
exception
  when undefined_table or undefined_column or undefined_function then
    raise exception 'invoice_storage_unavailable' using errcode = 'PT500';
end;
$$;
revoke all on function public.invoice_ocr_execute(uuid,uuid,bigint,text,jsonb) from public, anon, service_role;
grant execute on function public.invoice_ocr_execute(uuid,uuid,bigint,text,jsonb) to authenticated;

-- SELECT remains convenient for the existing UI/CSV. All mutations are commands.
revoke all on public.invoice_ocr_invoices, public.invoice_ocr_line_items,
  public.invoice_ocr_requests, public.invoice_ocr_audit from public, anon, authenticated, service_role;
grant select on public.invoice_ocr_invoices, public.invoice_ocr_line_items,
  public.invoice_ocr_audit to authenticated;
drop policy if exists "invoice_ocr_invoices: owner all" on public.invoice_ocr_invoices;
drop policy if exists "invoice_ocr_line_items: owner all" on public.invoice_ocr_line_items;
drop policy if exists "invoice_ocr_invoices: command read" on public.invoice_ocr_invoices;
create policy "invoice_ocr_invoices: command read" on public.invoice_ocr_invoices for select
  using (user_id = auth.uid() and (select public.invoice_ocr_can_access()));
drop policy if exists "invoice_ocr_line_items: command read" on public.invoice_ocr_line_items;
create policy "invoice_ocr_line_items: command read" on public.invoice_ocr_line_items for select
  using (user_id = auth.uid() and (select public.invoice_ocr_can_access()));
drop policy if exists "invoice_ocr_audit: own read" on public.invoice_ocr_audit;
create policy "invoice_ocr_audit: own read" on public.invoice_ocr_audit for select
  using (user_id = auth.uid() and (select public.invoice_ocr_can_access()));
-- Requests intentionally have no application SELECT policy/privilege.

drop policy if exists "invoice_ocr storage: read own" on storage.objects;
create policy "invoice_ocr storage: read own" on storage.objects for select to authenticated
  using (bucket_id = 'invoice_ocr' and (storage.foldername(name))[1] = auth.uid()::text
         and (select public.invoice_ocr_can_access()));
drop policy if exists "invoice_ocr storage: insert own" on storage.objects;
create policy "invoice_ocr storage: insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'invoice_ocr' and (storage.foldername(name))[1] = auth.uid()::text
              and (select public.invoice_ocr_can_access()));
drop policy if exists "invoice_ocr storage: update own" on storage.objects;
create policy "invoice_ocr storage: update own" on storage.objects for update to authenticated
  using (bucket_id = 'invoice_ocr' and (storage.foldername(name))[1] = auth.uid()::text
         and (select public.invoice_ocr_can_access())
         and not exists (select 1 from public.invoice_ocr_invoices i where i.file_path = storage.objects.name))
  with check (bucket_id = 'invoice_ocr' and (storage.foldername(name))[1] = auth.uid()::text
              and (select public.invoice_ocr_can_access()));
drop policy if exists "invoice_ocr storage: delete own" on storage.objects;
create policy "invoice_ocr storage: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'invoice_ocr' and (storage.foldername(name))[1] = auth.uid()::text
         and (select public.invoice_ocr_can_access())
         and not exists (select 1 from public.invoice_ocr_invoices i where i.file_path = storage.objects.name));

notify pgrst, 'reload schema';
commit;
