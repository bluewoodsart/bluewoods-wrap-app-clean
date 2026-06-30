-- SlapWrapz CRM
-- Phase 3C - Multi-Proof Options
--
-- Additive migration only. Do not run until reviewed and approved.
-- Preserves the existing single-proof upload and approval flow.

begin;

alter table public.quote_requests
  add column if not exists customer_proof_mode text not null default 'single'
    check (customer_proof_mode in ('single', 'multi')),
  add column if not exists selected_customer_proof_option_id uuid,
  add column if not exists customer_proof_selection_message text,
  add column if not exists customer_proof_selected_at timestamptz;

alter table public.quote_requests
  drop constraint if exists quote_requests_customer_proof_status_check;

alter table public.quote_requests
  add constraint quote_requests_customer_proof_status_check
  check (customer_proof_status in ('pending', 'approved', 'changes_requested', 'selection_received'));

create table if not exists public.customer_proof_options (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  label text not null,
  sort_order integer not null check (sort_order between 0 and 9),
  image_url text not null,
  admin_note text,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_proof_options_quote_request_id_sort_order_idx
  on public.customer_proof_options (quote_request_id, sort_order)
  where is_active = true;

alter table public.customer_proof_options enable row level security;

alter table public.quote_requests
  drop constraint if exists quote_requests_selected_customer_proof_option_id_fkey;

alter table public.quote_requests
  add constraint quote_requests_selected_customer_proof_option_id_fkey
  foreign key (selected_customer_proof_option_id)
  references public.customer_proof_options(id)
  on delete set null;

create or replace function public.get_customer_proof_option_label(p_sort_order integer)
returns text
language sql
immutable
as $$
  select 'Option ' || chr(65 + greatest(0, least(9, p_sort_order)));
$$;

create or replace function public.get_customer_proof_options_json(p_quote_request_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', cpo.id,
        'quote_request_id', cpo.quote_request_id,
        'label', cpo.label,
        'sort_order', cpo.sort_order,
        'image_url', cpo.image_url,
        'admin_note', cpo.admin_note,
        'is_active', cpo.is_active,
        'created_at', cpo.created_at
      )
      order by cpo.sort_order
    ),
    '[]'::jsonb
  )
  from public.customer_proof_options cpo
  where cpo.quote_request_id = p_quote_request_id
    and cpo.is_active = true;
$$;

create or replace function public.get_customer_proof_options_public_json(p_quote_request_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', cpo.id,
        'label', cpo.label,
        'sort_order', cpo.sort_order,
        'image_url', cpo.image_url
      )
      order by cpo.sort_order
    ),
    '[]'::jsonb
  )
  from public.customer_proof_options cpo
  where cpo.quote_request_id = p_quote_request_id
    and cpo.is_active = true;
$$;

create or replace function public.set_customer_proof_mode_admin(
  p_quote_request_id uuid,
  p_customer_proof_mode text
)
returns table (
  quote_request_id uuid,
  customer_proof_mode text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quote_id uuid;
  v_mode text;
begin
  perform public.require_active_admin_role(array['owner_admin', 'staff']);

  v_mode := trim(coalesce(p_customer_proof_mode, 'single'));
  if v_mode not in ('single', 'multi') then
    raise exception 'Invalid proof mode.';
  end if;

  select qr.id
    into v_quote_id
  from public.quote_requests qr
  where qr.id = p_quote_request_id
  for update;

  if v_quote_id is null then
    raise exception 'Quote request not found.';
  end if;

  update public.quote_requests qr
  set customer_proof_mode = v_mode
  where qr.id = p_quote_request_id;

  insert into public.quote_status_events (
    quote_request_id,
    event_type,
    status,
    message
  )
  values (
    p_quote_request_id,
    'customer_proof_mode_updated',
    (select qr.status from public.quote_requests qr where qr.id = p_quote_request_id),
    'Customer proof mode set to ' || v_mode || '.'
  );

  return query
  select qr.id, qr.customer_proof_mode
  from public.quote_requests qr
  where qr.id = p_quote_request_id;
end;
$$;

create or replace function public.upsert_customer_proof_option_admin(
  p_quote_request_id uuid,
  p_option_id uuid default null,
  p_sort_order integer default null,
  p_image_url text default null,
  p_admin_note text default null
)
returns table (
  proof_options jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quote_id uuid;
  v_option_id uuid;
  v_sort_order integer;
  v_active_option_count integer;
  v_image_url text;
begin
  perform public.require_active_admin_role(array['owner_admin', 'staff']);

  select qr.id
    into v_quote_id
  from public.quote_requests qr
  where qr.id = p_quote_request_id
  for update;

  if v_quote_id is null then
    raise exception 'Quote request not found.';
  end if;

  select count(*)
    into v_active_option_count
  from public.customer_proof_options cpo
  where cpo.quote_request_id = p_quote_request_id
    and cpo.is_active = true
    and (p_option_id is null or cpo.id <> p_option_id);

  if p_option_id is null and v_active_option_count >= 10 then
    raise exception 'A proof set can include up to 10 active options.';
  end if;

  v_sort_order := coalesce(p_sort_order, v_active_option_count);
  if v_sort_order < 0 or v_sort_order > 9 then
    raise exception 'Proof option sort order must be between 0 and 9.';
  end if;

  v_image_url := nullif(trim(coalesce(p_image_url, '')), '');

  if p_option_id is null then
    if v_image_url is null then
      raise exception 'Proof option image URL is required.';
    end if;

    insert into public.customer_proof_options (
      quote_request_id,
      label,
      sort_order,
      image_url,
      admin_note,
      created_by
    )
    values (
      p_quote_request_id,
      public.get_customer_proof_option_label(v_sort_order),
      v_sort_order,
      v_image_url,
      nullif(trim(coalesce(p_admin_note, '')), ''),
      auth.uid()
    )
    returning id into v_option_id;
  else
    update public.customer_proof_options cpo
    set
      sort_order = v_sort_order,
      label = public.get_customer_proof_option_label(v_sort_order),
      image_url = coalesce(v_image_url, cpo.image_url),
      admin_note = nullif(trim(coalesce(p_admin_note, '')), ''),
      updated_at = now()
    where cpo.id = p_option_id
      and cpo.quote_request_id = p_quote_request_id
      and cpo.is_active = true
    returning cpo.id into v_option_id;

    if v_option_id is null then
      raise exception 'Proof option not found.';
    end if;
  end if;

  update public.quote_requests qr
  set
    customer_proof_mode = 'multi',
    customer_proof_status = case
      when qr.customer_proof_status = 'approved' then 'pending'
      else qr.customer_proof_status
    end,
    customer_proof_approved_at = case
      when qr.customer_proof_status = 'approved' then null
      else qr.customer_proof_approved_at
    end
  where qr.id = p_quote_request_id;

  insert into public.quote_status_events (
    quote_request_id,
    event_type,
    status,
    message
  )
  values (
    p_quote_request_id,
    'customer_proof_option_saved',
    (select qr.status from public.quote_requests qr where qr.id = p_quote_request_id),
    'Customer proof option saved.'
  );

  return query
  select public.get_customer_proof_options_json(p_quote_request_id);
end;
$$;

create or replace function public.delete_customer_proof_option_admin(
  p_quote_request_id uuid,
  p_option_id uuid
)
returns table (
  proof_options jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_option_id uuid;
begin
  perform public.require_active_admin_role(array['owner_admin', 'staff']);

  update public.customer_proof_options cpo
  set
    is_active = false,
    updated_at = now()
  where cpo.id = p_option_id
    and cpo.quote_request_id = p_quote_request_id
    and cpo.is_active = true
  returning cpo.id into v_option_id;

  if v_option_id is null then
    raise exception 'Proof option not found.';
  end if;

  update public.quote_requests qr
  set
    selected_customer_proof_option_id = case
      when qr.selected_customer_proof_option_id = p_option_id then null
      else qr.selected_customer_proof_option_id
    end,
    customer_proof_selection_message = case
      when qr.selected_customer_proof_option_id = p_option_id then null
      else qr.customer_proof_selection_message
    end,
    customer_proof_selected_at = case
      when qr.selected_customer_proof_option_id = p_option_id then null
      else qr.customer_proof_selected_at
    end,
    customer_proof_status = case
      when qr.selected_customer_proof_option_id = p_option_id then 'pending'
      else qr.customer_proof_status
    end
  where qr.id = p_quote_request_id;

  insert into public.quote_status_events (
    quote_request_id,
    event_type,
    status,
    message
  )
  values (
    p_quote_request_id,
    'customer_proof_option_deleted',
    (select qr.status from public.quote_requests qr where qr.id = p_quote_request_id),
    'Customer proof option removed.'
  );

  return query
  select public.get_customer_proof_options_json(p_quote_request_id);
end;
$$;

create or replace function public.reorder_customer_proof_options_admin(
  p_quote_request_id uuid,
  p_options jsonb
)
returns table (
  proof_options jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_option_count integer;
  v_item jsonb;
  v_option_id uuid;
  v_sort_order integer;
begin
  perform public.require_active_admin_role(array['owner_admin', 'staff']);

  if jsonb_typeof(coalesce(p_options, '[]'::jsonb)) <> 'array' then
    raise exception 'Proof options must be an array.';
  end if;

  v_option_count := jsonb_array_length(coalesce(p_options, '[]'::jsonb));
  if v_option_count > 10 then
    raise exception 'A proof set can include up to 10 active options.';
  end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_options, '[]'::jsonb))
  loop
    v_option_id := (v_item ->> 'id')::uuid;
    v_sort_order := (v_item ->> 'sort_order')::integer;

    if v_sort_order < 0 or v_sort_order > 9 then
      raise exception 'Proof option sort order must be between 0 and 9.';
    end if;

    update public.customer_proof_options cpo
    set
      sort_order = v_sort_order,
      label = public.get_customer_proof_option_label(v_sort_order),
      updated_at = now()
    where cpo.id = v_option_id
      and cpo.quote_request_id = p_quote_request_id
      and cpo.is_active = true;
  end loop;

  insert into public.quote_status_events (
    quote_request_id,
    event_type,
    status,
    message
  )
  values (
    p_quote_request_id,
    'customer_proof_options_reordered',
    (select qr.status from public.quote_requests qr where qr.id = p_quote_request_id),
    'Customer proof options reordered.'
  );

  return query
  select public.get_customer_proof_options_json(p_quote_request_id);
end;
$$;

create or replace function public.submit_customer_proof_option_selection_public(
  p_token text,
  p_option_id uuid,
  p_selection_message text default null,
  p_final_approval boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quote_request_id uuid;
  v_current_status text;
  v_option_label text;
  v_selection_message text;
begin
  select qr.id, qr.status, cpo.label
    into v_quote_request_id, v_current_status, v_option_label
  from public.quote_customer_proof_tokens qcpt
  join public.quote_requests qr on qr.id = qcpt.quote_request_id
  join public.customer_proof_options cpo on cpo.quote_request_id = qr.id
  where qcpt.token = trim(coalesce(p_token, ''))
    and qcpt.status = 'active'
    and qr.customer_proof_mode = 'multi'
    and cpo.id = p_option_id
    and cpo.is_active = true
  limit 1
  for update of qr;

  if v_quote_request_id is null then
    raise exception 'Proof option is invalid or no longer available.';
  end if;

  v_selection_message := nullif(trim(coalesce(p_selection_message, '')), '');
  if length(coalesce(v_selection_message, '')) > 2000 then
    raise exception 'Proof option comments are too long.';
  end if;

  update public.quote_requests qr
  set
    selected_customer_proof_option_id = p_option_id,
    customer_proof_selection_message = v_selection_message,
    customer_proof_selected_at = now(),
    customer_proof_status = case
      when p_final_approval then 'approved'
      else 'selection_received'
    end,
    customer_proof_approved_at = case
      when p_final_approval then now()
      else null
    end,
    customer_proof_revision_requested_at = null,
    customer_proof_revision_message = null
  where qr.id = v_quote_request_id;

  insert into public.quote_status_events (
    quote_request_id,
    event_type,
    status,
    message
  )
  values (
    v_quote_request_id,
    case
      when p_final_approval then 'customer_proof_option_final_approved'
      else 'customer_proof_option_selected'
    end,
    v_current_status,
    case
      when p_final_approval then 'Customer selected and approved ' || v_option_label || '.'
      else 'Customer selected ' || v_option_label || '.'
    end || coalesce(' Comments: ' || v_selection_message, '')
  );
end;
$$;

drop function if exists public.get_customer_proof_portal_public(text);
create or replace function public.get_customer_proof_portal_public(p_token text)
returns table (
  valid boolean,
  customer_first_name text,
  customer_phase text,
  proof_image_url text,
  payment_url text,
  proof_status text,
  approved_at timestamptz,
  revision_requested_at timestamptz,
  revision_message text,
  proof_mode text,
  proof_options jsonb,
  selected_customer_proof_option_id uuid,
  customer_proof_selection_message text,
  customer_proof_selected_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if trim(coalesce(p_token, '')) = '' then
    return query
    select false, null::text, null::text, null::text, null::text, null::text, null::timestamptz, null::timestamptz, null::text, null::text, '[]'::jsonb, null::uuid, null::text, null::timestamptz;
    return;
  end if;

  update public.quote_customer_proof_tokens qcpt
  set last_used_at = now()
  where qcpt.token = trim(p_token)
    and qcpt.status = 'active';

  return query
  select
    true,
    nullif(split_part(trim(qr.customer_name), ' ', 1), ''),
    qr.status,
    qr.customer_proof_image_url,
    qr.customer_proof_payment_url,
    qr.customer_proof_status,
    qr.customer_proof_approved_at,
    qr.customer_proof_revision_requested_at,
    qr.customer_proof_revision_message,
    qr.customer_proof_mode,
    public.get_customer_proof_options_public_json(qr.id),
    qr.selected_customer_proof_option_id,
    qr.customer_proof_selection_message,
    qr.customer_proof_selected_at
  from public.quote_customer_proof_tokens qcpt
  join public.quote_requests qr on qr.id = qcpt.quote_request_id
  where qcpt.token = trim(p_token)
    and qcpt.status = 'active'
  limit 1;

  if not found then
    return query
    select false, null::text, null::text, null::text, null::text, null::text, null::timestamptz, null::timestamptz, null::text, null::text, '[]'::jsonb, null::uuid, null::text, null::timestamptz;
  end if;
end;
$$;

drop function if exists public.get_admin_quote_request_detail(uuid);
create or replace function public.get_admin_quote_request_detail(quote_request_id uuid)
 returns table(
  id uuid,
  quote_id text,
  customer_name text,
  customer_email text,
  customer_phone text,
  preferred_contact text,
  rep_slug text,
  rep_email text,
  assigned_rep_name text,
  status text,
  product_type text,
  quote_data jsonb,
  uploaded_files jsonb,
  customer_proof_token text,
  customer_proof_image_url text,
  customer_proof_payment_url text,
  customer_proof_status text,
  customer_proof_approved_at timestamp with time zone,
  customer_proof_revision_requested_at timestamp with time zone,
  customer_proof_revision_message text,
  customer_proof_mode text,
  customer_proof_options jsonb,
  selected_customer_proof_option_id uuid,
  selected_customer_proof_option_label text,
  selected_customer_proof_option_image_url text,
  customer_proof_selection_message text,
  customer_proof_selected_at timestamp with time zone,
  created_at timestamp with time zone
 )
 language plpgsql
 security definer
 set search_path to public, pg_temp
as $function$
begin
  perform public.require_active_admin_role(array['owner_admin', 'staff']);

  return query
  select
    qr.id,
    qr.quote_id,
    qr.customer_name,
    qr.customer_email,
    qr.customer_phone,
    qr.preferred_contact,
    qr.rep_slug,
    qr.rep_email,
    qr.assigned_rep_name,
    qr.status,
    qr.product_type,
    qr.quote_data,
    qr.uploaded_files,
    qcpt.token as customer_proof_token,
    qr.customer_proof_image_url,
    qr.customer_proof_payment_url,
    qr.customer_proof_status,
    qr.customer_proof_approved_at,
    qr.customer_proof_revision_requested_at,
    qr.customer_proof_revision_message,
    qr.customer_proof_mode,
    public.get_customer_proof_options_json(qr.id),
    qr.selected_customer_proof_option_id,
    selected_option.label,
    selected_option.image_url,
    qr.customer_proof_selection_message,
    qr.customer_proof_selected_at,
    qr.created_at
  from public.quote_requests qr
  left join public.quote_customer_proof_tokens qcpt
    on qcpt.quote_request_id = qr.id
   and qcpt.status = 'active'
  left join public.customer_proof_options selected_option
    on selected_option.id = qr.selected_customer_proof_option_id
  where qr.id = get_admin_quote_request_detail.quote_request_id
  limit 1;
end;
$function$;

revoke all on function public.get_customer_proof_option_label(integer) from public;
grant execute on function public.get_customer_proof_option_label(integer) to anon, authenticated;

revoke all on function public.get_customer_proof_options_json(uuid) from public;
grant execute on function public.get_customer_proof_options_json(uuid) to authenticated;

revoke all on function public.get_customer_proof_options_public_json(uuid) from public;
grant execute on function public.get_customer_proof_options_public_json(uuid) to anon, authenticated;

revoke all on function public.set_customer_proof_mode_admin(uuid, text) from public;
revoke all on function public.set_customer_proof_mode_admin(uuid, text) from anon;
grant execute on function public.set_customer_proof_mode_admin(uuid, text) to authenticated;

revoke all on function public.upsert_customer_proof_option_admin(uuid, uuid, integer, text, text) from public;
revoke all on function public.upsert_customer_proof_option_admin(uuid, uuid, integer, text, text) from anon;
grant execute on function public.upsert_customer_proof_option_admin(uuid, uuid, integer, text, text) to authenticated;

revoke all on function public.delete_customer_proof_option_admin(uuid, uuid) from public;
revoke all on function public.delete_customer_proof_option_admin(uuid, uuid) from anon;
grant execute on function public.delete_customer_proof_option_admin(uuid, uuid) to authenticated;

revoke all on function public.reorder_customer_proof_options_admin(uuid, jsonb) from public;
revoke all on function public.reorder_customer_proof_options_admin(uuid, jsonb) from anon;
grant execute on function public.reorder_customer_proof_options_admin(uuid, jsonb) to authenticated;

revoke all on function public.submit_customer_proof_option_selection_public(text, uuid, text, boolean) from public;
grant execute on function public.submit_customer_proof_option_selection_public(text, uuid, text, boolean) to anon, authenticated;

revoke all on function public.get_customer_proof_portal_public(text) from public;
grant execute on function public.get_customer_proof_portal_public(text) to anon, authenticated;

revoke all on function public.get_admin_quote_request_detail(uuid) from public;
revoke all on function public.get_admin_quote_request_detail(uuid) from anon;
grant execute on function public.get_admin_quote_request_detail(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
