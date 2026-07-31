-- SlapWrapz rep office dialogue, secure quote continuation, and professional order numbers.
-- Does not touch Phase 3 pricing.

update public.quote_requests
set quote_id = 'SW-'
  || to_char(created_at at time zone 'America/New_York', 'YYYYMMDD')
  || '-'
  || upper(substr(replace(id::text, '-', ''), 1, 6))
where quote_id like 'short_test_%';

create or replace function public.get_quote_internal_notes_rep_v1(p_quote_request_id uuid)
returns table (
  id uuid,
  quote_request_id uuid,
  note_text text,
  created_by text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.admin_users%rowtype;
begin
  select * into v_user
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role in ('sales_rep', 'rep_manager')
  limit 1;

  if v_user.id is null then
    raise exception 'Active rep access is required.';
  end if;

  if not exists (
    select 1
    from public.quote_requests qr
    where qr.id = p_quote_request_id
      and (
        lower(trim(coalesce(qr.rep_slug, ''))) = lower(trim(coalesce(v_user.rep_slug, '')))
        or (
          v_user.role = 'rep_manager'
          and exists (
            select 1
            from public.admin_users child
            where child.manager_admin_user_id = v_user.id
              and child.is_active = true
              and lower(trim(coalesce(child.rep_slug, ''))) = lower(trim(coalesce(qr.rep_slug, '')))
          )
        )
      )
  ) then
    raise exception 'This quote is not assigned to your rep account.';
  end if;

  return query
  select qin.id, qin.quote_request_id, qin.note_text, qin.created_by, qin.created_at
  from public.quote_internal_notes qin
  where qin.quote_request_id = p_quote_request_id
  order by qin.created_at asc;
end;
$$;

revoke all on function public.get_quote_internal_notes_rep_v1(uuid) from public;
revoke all on function public.get_quote_internal_notes_rep_v1(uuid) from anon;
grant execute on function public.get_quote_internal_notes_rep_v1(uuid) to authenticated;

create or replace function public.add_quote_internal_note_rep_v1(
  p_quote_request_id uuid,
  p_note_text text
)
returns table (
  id uuid,
  quote_request_id uuid,
  note_text text,
  created_by text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.admin_users%rowtype;
  v_created_by text;
begin
  if length(trim(coalesce(p_note_text, ''))) < 1 then
    raise exception 'A message is required.';
  end if;

  if length(trim(p_note_text)) > 5000 then
    raise exception 'Messages must be 5,000 characters or fewer.';
  end if;

  select * into v_user
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role in ('sales_rep', 'rep_manager')
  limit 1;

  if v_user.id is null then
    raise exception 'Active rep access is required.';
  end if;

  if not exists (
    select 1
    from public.quote_requests qr
    where qr.id = p_quote_request_id
      and (
        lower(trim(coalesce(qr.rep_slug, ''))) = lower(trim(coalesce(v_user.rep_slug, '')))
        or (
          v_user.role = 'rep_manager'
          and exists (
            select 1
            from public.admin_users child
            where child.manager_admin_user_id = v_user.id
              and child.is_active = true
              and lower(trim(coalesce(child.rep_slug, ''))) = lower(trim(coalesce(qr.rep_slug, '')))
          )
        )
      )
  ) then
    raise exception 'This quote is not assigned to your rep account.';
  end if;

  v_created_by := case when v_user.role = 'rep_manager' then 'Rep manager: ' else 'Rep: ' end
    || coalesce(nullif(trim(v_user.display_name), ''), v_user.email, 'Rep');

  return query
  insert into public.quote_internal_notes (quote_request_id, note_text, created_by)
  values (p_quote_request_id, trim(p_note_text), v_created_by)
  returning
    quote_internal_notes.id,
    quote_internal_notes.quote_request_id,
    quote_internal_notes.note_text,
    quote_internal_notes.created_by,
    quote_internal_notes.created_at;
end;
$$;

revoke all on function public.add_quote_internal_note_rep_v1(uuid, text) from public;
revoke all on function public.add_quote_internal_note_rep_v1(uuid, text) from anon;
grant execute on function public.add_quote_internal_note_rep_v1(uuid, text) to authenticated;

create or replace function public.continue_rep_quote_request_v1(
  p_quote_request_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_preferred_contact text,
  p_quote_data jsonb,
  p_uploaded_files jsonb
)
returns table (
  id uuid,
  quote_id text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.admin_users%rowtype;
begin
  if length(trim(coalesce(p_customer_name, ''))) < 1 then
    raise exception 'Customer name is required.';
  end if;
  if length(trim(coalesce(p_customer_email, ''))) < 3 then
    raise exception 'Customer email is required.';
  end if;
  if length(trim(coalesce(p_customer_phone, ''))) < 7 then
    raise exception 'Customer phone is required.';
  end if;
  if p_preferred_contact not in ('email', 'text', 'call') then
    raise exception 'Invalid preferred contact.';
  end if;
  if p_quote_data is null or jsonb_typeof(p_quote_data) <> 'object' then
    raise exception 'Quote data must be an object.';
  end if;
  if p_uploaded_files is null or jsonb_typeof(p_uploaded_files) <> 'array' then
    raise exception 'Uploaded files must be an array.';
  end if;

  select * into v_user
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role in ('sales_rep', 'rep_manager')
  limit 1;

  if v_user.id is null then
    raise exception 'Active rep access is required.';
  end if;

  if not exists (
    select 1
    from public.quote_requests qr
    where qr.id = p_quote_request_id
      and (
        lower(trim(coalesce(qr.rep_slug, ''))) = lower(trim(coalesce(v_user.rep_slug, '')))
        or (
          v_user.role = 'rep_manager'
          and exists (
            select 1
            from public.admin_users child
            where child.manager_admin_user_id = v_user.id
              and child.is_active = true
              and lower(trim(coalesce(child.rep_slug, ''))) = lower(trim(coalesce(qr.rep_slug, '')))
          )
        )
      )
  ) then
    raise exception 'This quote is not assigned to your rep account.';
  end if;

  return query
  update public.quote_requests qr
  set
    customer_name = trim(p_customer_name),
    customer_email = trim(p_customer_email),
    customer_phone = trim(p_customer_phone),
    preferred_contact = p_preferred_contact,
    quote_data = coalesce(qr.quote_data, '{}'::jsonb) || p_quote_data,
    uploaded_files = p_uploaded_files,
    status = case when qr.status = 'partial_lead' then 'new' else qr.status end,
    status_updated_at = case when qr.status = 'partial_lead' then now() else qr.status_updated_at end
  where qr.id = p_quote_request_id
  returning qr.id, qr.quote_id, qr.status;
end;
$$;

revoke all on function public.continue_rep_quote_request_v1(uuid, text, text, text, text, jsonb, jsonb) from public;
revoke all on function public.continue_rep_quote_request_v1(uuid, text, text, text, text, jsonb, jsonb) from anon;
grant execute on function public.continue_rep_quote_request_v1(uuid, text, text, text, text, jsonb, jsonb) to authenticated;
