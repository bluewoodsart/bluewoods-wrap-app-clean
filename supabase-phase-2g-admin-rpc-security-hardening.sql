-- SlapWrapz CRM
-- Phase 2G-C: Admin RPC Security Hardening Final Draft
--
-- DRAFT ONLY. Do not run until reviewed and approved.
-- Source: exported Supabase function inspection CSV from production.
-- Scope: admin/rep RPC permissions, role checks, and SECURITY DEFINER search_path only.
-- No frontend changes. No Phase 3 pricing/admin-pricing changes.

begin;

-- =========================================================
-- Shared fail-closed role guard
-- =========================================================
create or replace function public.require_active_admin_role(allowed_roles text[])
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_role text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated'
      using errcode = '42501';
  end if;

  select au.role
    into caller_role
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
  limit 1;

  if caller_role is null or not (caller_role = any(allowed_roles)) then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.require_active_admin_role(text[]) from public;
revoke execute on function public.require_active_admin_role(text[]) from anon;
revoke execute on function public.require_active_admin_role(text[]) from authenticated;

comment on function public.require_active_admin_role(text[]) is
'Phase 2G admin RPC guard. Requires auth.uid() to map to an active public.admin_users row with an allowed role.';

-- =========================================================
-- Fully replaced RPC definitions with in-function role checks
-- =========================================================

-- get_admin_quote_requests: owner_admin + staff
CREATE OR REPLACE FUNCTION public.get_admin_quote_requests()
 RETURNS TABLE(id uuid, quote_id text, customer_name text, customer_email text, customer_phone text, preferred_contact text, rep_slug text, rep_email text, assigned_rep_name text, status text, product_type text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
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
    qr.created_at
  from public.quote_requests qr
  order by qr.created_at desc
  limit 50;
end;
$function$;

-- get_admin_quote_request_detail: owner_admin + staff
CREATE OR REPLACE FUNCTION public.get_admin_quote_request_detail(quote_request_id uuid)
 RETURNS TABLE(id uuid, quote_id text, customer_name text, customer_email text, customer_phone text, preferred_contact text, rep_slug text, rep_email text, assigned_rep_name text, status text, product_type text, quote_data jsonb, uploaded_files jsonb, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
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
    qr.created_at
  from public.quote_requests qr
  where qr.id = get_admin_quote_request_detail.quote_request_id
  limit 1;
end;
$function$;

-- get_admin_quote_follow_up_summaries: owner_admin + staff
CREATE OR REPLACE FUNCTION public.get_admin_quote_follow_up_summaries()
 RETURNS TABLE(quote_request_id uuid, next_follow_up_task_id uuid, next_follow_up_task_text text, next_follow_up_due_date date, open_follow_up_count integer, overdue_follow_up_count integer, due_today_follow_up_count integer, upcoming_follow_up_count integer, follow_up_bucket text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
begin
  perform public.require_active_admin_role(array['owner_admin', 'staff']);

  return query
with recent_quotes as (
    select qr.id
    from public.quote_requests qr
    order by qr.created_at desc
    limit 50
  ),
  open_tasks as (
    select
      qfut.id,
      qfut.quote_request_id,
      qfut.task_text,
      qfut.due_date,
      qfut.created_at
    from public.quote_follow_up_tasks qfut
    join recent_quotes rq on rq.id = qfut.quote_request_id
    where qfut.status = 'open'
  ),
  ranked_tasks as (
    select
      ot.*,
      row_number() over (
        partition by ot.quote_request_id
        order by ot.due_date asc, ot.created_at asc
      ) as task_rank
    from open_tasks ot
  ),
  counts as (
    select
      ot.quote_request_id,
      count(*)::integer as open_follow_up_count,
      count(*) filter (where ot.due_date < current_date)::integer as overdue_follow_up_count,
      count(*) filter (where ot.due_date = current_date)::integer as due_today_follow_up_count,
      count(*) filter (where ot.due_date > current_date)::integer as upcoming_follow_up_count
    from open_tasks ot
    group by ot.quote_request_id
  )
  select
    rq.id as quote_request_id,
    rt.id as next_follow_up_task_id,
    rt.task_text as next_follow_up_task_text,
    rt.due_date as next_follow_up_due_date,
    coalesce(c.open_follow_up_count, 0) as open_follow_up_count,
    coalesce(c.overdue_follow_up_count, 0) as overdue_follow_up_count,
    coalesce(c.due_today_follow_up_count, 0) as due_today_follow_up_count,
    coalesce(c.upcoming_follow_up_count, 0) as upcoming_follow_up_count,
    case
      when coalesce(c.overdue_follow_up_count, 0) > 0 then 'overdue'
      when coalesce(c.due_today_follow_up_count, 0) > 0 then 'due_today'
      when coalesce(c.open_follow_up_count, 0) > 0 then 'upcoming'
      else 'none'
    end as follow_up_bucket
  from recent_quotes rq
  left join ranked_tasks rt
    on rt.quote_request_id = rq.id
   and rt.task_rank = 1
  left join counts c
    on c.quote_request_id = rq.id;
end;
$function$;

-- get_quote_status_events_admin: owner_admin + staff
CREATE OR REPLACE FUNCTION public.get_quote_status_events_admin(quote_request_id uuid)
 RETURNS TABLE(id uuid, event_type text, status text, message text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
begin
  perform public.require_active_admin_role(array['owner_admin', 'staff']);

  return query
select
    qse.id,
    qse.event_type,
    qse.status,
    qse.message,
    qse.created_at
  from public.quote_status_events qse
  where qse.quote_request_id = get_quote_status_events_admin.quote_request_id
  order by qse.created_at desc;
end;
$function$;

-- get_quote_follow_up_tasks_admin: owner_admin + staff
CREATE OR REPLACE FUNCTION public.get_quote_follow_up_tasks_admin(p_quote_request_id uuid)
 RETURNS TABLE(id uuid, quote_request_id uuid, task_text text, due_date date, status text, created_by text, created_at timestamp with time zone, completed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
begin
  perform public.require_active_admin_role(array['owner_admin', 'staff']);

  return query
select
    qfut.id,
    qfut.quote_request_id,
    qfut.task_text,
    qfut.due_date,
    qfut.status,
    qfut.created_by,
    qfut.created_at,
    qfut.completed_at
  from public.quote_follow_up_tasks as qfut
  where qfut.quote_request_id = p_quote_request_id
  order by
    case when qfut.status = 'open' then 0 else 1 end,
    qfut.due_date asc,
    qfut.created_at desc;
end;
$function$;

-- get_quote_internal_notes_admin: owner_admin + staff
CREATE OR REPLACE FUNCTION public.get_quote_internal_notes_admin(p_quote_request_id uuid)
 RETURNS TABLE(id uuid, quote_request_id uuid, note_text text, created_by text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
begin
  perform public.require_active_admin_role(array['owner_admin', 'staff']);

  return query
select
    qin.id,
    qin.quote_request_id,
    qin.note_text,
    qin.created_by,
    qin.created_at
  from public.quote_internal_notes qin
  where qin.quote_request_id = p_quote_request_id
  order by qin.created_at desc;
end;
$function$;

-- get_quote_customer_action_requests_admin: owner_admin + staff
CREATE OR REPLACE FUNCTION public.get_quote_customer_action_requests_admin(p_quote_request_id uuid)
 RETURNS TABLE(id uuid, quote_request_id uuid, request_type text, request_types jsonb, message text, customer_email text, status text, created_by text, created_at timestamp with time zone, sent_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
begin
  perform public.require_active_admin_role(array['owner_admin', 'staff']);

  return query
select
    qcar.id,
    qcar.quote_request_id,
    qcar.request_type,
    case
      when jsonb_typeof(qcar.request_types) = 'array' and jsonb_array_length(qcar.request_types) > 0
        then qcar.request_types
      else jsonb_build_array(qcar.request_type)
    end as request_types,
    qcar.message,
    qcar.customer_email,
    qcar.status,
    qcar.created_by,
    qcar.created_at,
    qcar.sent_at
  from public.quote_customer_action_requests qcar
  where qcar.quote_request_id = p_quote_request_id
  order by qcar.created_at desc;
end;
$function$;

-- update_quote_status_admin: owner_admin + staff
CREATE OR REPLACE FUNCTION public.update_quote_status_admin(quote_request_id uuid, next_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
declare
  previous_status text;
begin
  
  perform public.require_active_admin_role(array['owner_admin', 'staff']);
if next_status not in (
    'new',
    'contacted',
    'quote_sent',
    'deposit_received',
    'design_started',
    'proof_sent',
    'approved',
    'printing',
    'install_scheduled',
    'completed',
    'lost'
  ) then
    raise exception 'Invalid quote status: %', next_status;
  end if;

  select status
  into previous_status
  from public.quote_requests
  where id = quote_request_id
  for update;

  if previous_status is null then
    raise exception 'Quote request not found: %', quote_request_id;
  end if;

  if previous_status = next_status then
    return;
  end if;

  update public.quote_requests
  set
    status = next_status,
    status_updated_at = now()
  where id = quote_request_id;

  insert into public.quote_status_events (
    quote_request_id,
    event_type,
    status,
    message
  )
  values (
    quote_request_id,
    'status_changed',
    next_status,
    'Status changed from ' || previous_status || ' to ' || next_status
  );
end;
$function$;

-- add_quote_follow_up_task_admin: owner_admin + staff
CREATE OR REPLACE FUNCTION public.add_quote_follow_up_task_admin(p_quote_request_id uuid, p_task_text text, p_due_date date)
 RETURNS TABLE(id uuid, quote_request_id uuid, task_text text, due_date date, status text, created_by text, created_at timestamp with time zone, completed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
begin
  
  perform public.require_active_admin_role(array['owner_admin', 'staff']);
if trim(p_task_text) = '' then
    raise exception 'Follow-up task cannot be empty.';
  end if;

  if p_due_date is null then
    raise exception 'Follow-up due date is required.';
  end if;

  if not exists (
    select 1
    from public.quote_requests as qr
    where qr.id = p_quote_request_id
  ) then
    raise exception 'Quote request not found: %', p_quote_request_id;
  end if;

  return query
  insert into public.quote_follow_up_tasks (
    quote_request_id,
    task_text,
    due_date,
    created_by
  )
  values (
    p_quote_request_id,
    trim(p_task_text),
    p_due_date,
    'Staff'
  )
  returning
    quote_follow_up_tasks.id,
    quote_follow_up_tasks.quote_request_id,
    quote_follow_up_tasks.task_text,
    quote_follow_up_tasks.due_date,
    quote_follow_up_tasks.status,
    quote_follow_up_tasks.created_by,
    quote_follow_up_tasks.created_at,
    quote_follow_up_tasks.completed_at;
end;
$function$;

-- complete_quote_follow_up_task_admin: owner_admin + staff
CREATE OR REPLACE FUNCTION public.complete_quote_follow_up_task_admin(p_follow_up_task_id uuid)
 RETURNS TABLE(id uuid, quote_request_id uuid, task_text text, due_date date, status text, created_by text, created_at timestamp with time zone, completed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
begin
  
  perform public.require_active_admin_role(array['owner_admin', 'staff']);
if not exists (
    select 1
    from public.quote_follow_up_tasks as qfut
    where qfut.id = p_follow_up_task_id
  ) then
    raise exception 'Follow-up task not found: %', p_follow_up_task_id;
  end if;

  return query
  update public.quote_follow_up_tasks as qfut
  set
    status = 'completed',
    completed_at = coalesce(qfut.completed_at, now())
  where qfut.id = p_follow_up_task_id
  returning
    qfut.id,
    qfut.quote_request_id,
    qfut.task_text,
    qfut.due_date,
    qfut.status,
    qfut.created_by,
    qfut.created_at,
    qfut.completed_at;
end;
$function$;

-- add_quote_internal_note_admin: owner_admin + staff
CREATE OR REPLACE FUNCTION public.add_quote_internal_note_admin(p_quote_request_id uuid, p_note_text text)
 RETURNS TABLE(id uuid, quote_request_id uuid, note_text text, created_by text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
begin
  
  perform public.require_active_admin_role(array['owner_admin', 'staff']);
if trim(p_note_text) = '' then
    raise exception 'Internal note cannot be empty.';
  end if;

  if not exists (
    select 1
    from public.quote_requests qr
    where qr.id = p_quote_request_id
  ) then
    raise exception 'Quote request not found: %', p_quote_request_id;
  end if;

  return query
  insert into public.quote_internal_notes (
    quote_request_id,
    note_text,
    created_by
  )
  values (
    p_quote_request_id,
    trim(p_note_text),
    'Staff'
  )
  returning
    quote_internal_notes.id,
    quote_internal_notes.quote_request_id,
    quote_internal_notes.note_text,
    quote_internal_notes.created_by,
    quote_internal_notes.created_at;
end;
$function$;

-- create_quote_customer_action_request_admin: owner_admin + staff
CREATE OR REPLACE FUNCTION public.create_quote_customer_action_request_admin(p_quote_request_id uuid, p_request_type text, p_message text, p_customer_email text, p_create_follow_up boolean DEFAULT true, p_request_types jsonb DEFAULT '[]'::jsonb)
 RETURNS TABLE(id uuid, quote_request_id uuid, request_type text, request_types jsonb, message text, customer_email text, status text, created_by text, created_at timestamp with time zone, sent_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
declare
  v_quote_status text;
  v_request_label text;
  v_request_types jsonb;
  v_primary_request_type text;
begin
  
  perform public.require_active_admin_role(array['owner_admin', 'staff']);
v_request_types := case
    when jsonb_typeof(coalesce(p_request_types, '[]'::jsonb)) = 'array'
      then coalesce(p_request_types, '[]'::jsonb)
    else '[]'::jsonb
  end;

  if jsonb_array_length(v_request_types) = 0 and trim(coalesce(p_request_type, '')) <> '' then
    v_request_types := jsonb_build_array(p_request_type);
  end if;

  if jsonb_array_length(v_request_types) = 0 then
    raise exception 'At least one customer action request type is required.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(v_request_types) as selected_request_type(request_type)
    where selected_request_type.request_type not in (
      'vehicle_photos',
      'logo_artwork',
      'better_quality_artwork',
      'measurements',
      'other'
    )
  ) then
    raise exception 'Invalid customer action request type.';
  end if;

  if trim(coalesce(p_message, '')) = '' then
    raise exception 'Customer action request message cannot be empty.';
  end if;

  if trim(coalesce(p_customer_email, '')) = '' then
    raise exception 'Customer email is required.';
  end if;

  select qr.status
  into v_quote_status
  from public.quote_requests qr
  where qr.id = p_quote_request_id;

  if v_quote_status is null then
    raise exception 'Quote request not found: %', p_quote_request_id;
  end if;

  select selected_request_type.request_type
  into v_primary_request_type
  from jsonb_array_elements_text(v_request_types) with ordinality as selected_request_type(request_type, sort_order)
  order by selected_request_type.sort_order
  limit 1;

  select string_agg(
    case selected_request_type.request_type
      when 'vehicle_photos' then 'Vehicle photos'
      when 'logo_artwork' then 'Logo / artwork'
      when 'better_quality_artwork' then 'Better quality artwork'
      when 'measurements' then 'Measurements'
      else 'Other'
    end,
    ', '
    order by selected_request_type.sort_order
  )
  into v_request_label
  from jsonb_array_elements_text(v_request_types) with ordinality as selected_request_type(request_type, sort_order);

  return query
  insert into public.quote_customer_action_requests (
    quote_request_id,
    request_type,
    request_types,
    message,
    customer_email,
    created_by
  )
  values (
    p_quote_request_id,
    v_primary_request_type,
    v_request_types,
    trim(p_message),
    trim(p_customer_email),
    'Staff'
  )
  returning
    quote_customer_action_requests.id,
    quote_customer_action_requests.quote_request_id,
    quote_customer_action_requests.request_type,
    quote_customer_action_requests.request_types,
    quote_customer_action_requests.message,
    quote_customer_action_requests.customer_email,
    quote_customer_action_requests.status,
    quote_customer_action_requests.created_by,
    quote_customer_action_requests.created_at,
    quote_customer_action_requests.sent_at;

  insert into public.quote_status_events (
    quote_request_id,
    event_type,
    status,
    message
  )
  values (
    p_quote_request_id,
    'customer_action_requested',
    v_quote_status,
    'Customer action requested: ' || v_request_label
  );

  if p_create_follow_up then
    insert into public.quote_follow_up_tasks (
      quote_request_id,
      task_text,
      due_date,
      created_by
    )
    values (
      p_quote_request_id,
      'Check whether customer replied with requested items: ' || v_request_label,
      current_date + 3,
      'Staff'
    );
  end if;
end;
$function$;

-- create_quote_customer_upload_token_admin: owner_admin + staff
CREATE OR REPLACE FUNCTION public.create_quote_customer_upload_token_admin(p_quote_request_id uuid, p_requested_items jsonb DEFAULT '[]'::jsonb, p_expires_in_days integer DEFAULT 14)
 RETURNS TABLE(id uuid, quote_request_id uuid, token text, requested_items jsonb, status text, expires_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
declare
  v_token text;
  v_requested_items jsonb;
  v_expires_in_days integer;
begin
  
  perform public.require_active_admin_role(array['owner_admin', 'staff']);
if not exists (
    select 1
    from public.quote_requests qr
    where qr.id = p_quote_request_id
  ) then
    raise exception 'Quote request not found: %', p_quote_request_id;
  end if;

  v_requested_items := case
    when jsonb_typeof(coalesce(p_requested_items, '[]'::jsonb)) = 'array'
      then coalesce(p_requested_items, '[]'::jsonb)
    else '[]'::jsonb
  end;

  v_expires_in_days := greatest(coalesce(p_expires_in_days, 14), 1);
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  return query
  insert into public.quote_customer_upload_tokens (
    quote_request_id,
    token,
    requested_items,
    expires_at
  )
  values (
    p_quote_request_id,
    v_token,
    v_requested_items,
    now() + make_interval(days => v_expires_in_days)
  )
  returning
    quote_customer_upload_tokens.id,
    quote_customer_upload_tokens.quote_request_id,
    quote_customer_upload_tokens.token,
    quote_customer_upload_tokens.requested_items,
    quote_customer_upload_tokens.status,
    quote_customer_upload_tokens.expires_at,
    quote_customer_upload_tokens.created_at;
end;
$function$;

-- assign_quote_rep_owner_admin: owner_admin only
CREATE OR REPLACE FUNCTION public.assign_quote_rep_owner_admin(quote_id uuid, rep_slug text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
declare
  next_rep_slug text := lower(trim(coalesce(assign_quote_rep_owner_admin.rep_slug, '')));
  next_rep_email text;
  next_assigned_rep_name text;
  previous_assigned_rep_name text;
begin
  
  perform public.require_active_admin_role(array['owner_admin']);
if not exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and au.role = 'owner_admin'
  ) then
    raise exception 'Owner admin access is required.';
  end if;

  select qr.assigned_rep_name
  into previous_assigned_rep_name
  from public.quote_requests qr
  where qr.id = assign_quote_rep_owner_admin.quote_id
  for update;

  if not found then
    raise exception 'Quote request not found: %', assign_quote_rep_owner_admin.quote_id;
  end if;

  if next_rep_slug = '' or next_rep_slug = 'unassigned' then
    update public.quote_requests qr
    set
      rep_slug = null,
      rep_email = null,
      assigned_rep_name = null
    where qr.id = assign_quote_rep_owner_admin.quote_id;

    insert into public.quote_status_events (
      quote_request_id,
      event_type,
      status,
      message
    )
    values (
      assign_quote_rep_owner_admin.quote_id,
      'rep_assignment',
      null,
      case
        when nullif(trim(coalesce(previous_assigned_rep_name, '')), '') is null then 'Quote remained unassigned.'
        else 'Quote unassigned from ' || previous_assigned_rep_name || '.'
      end
    );
  else
    with trusted_roster as (
      select
        'todd'::text as rep_slug,
        'Todd Wheeler'::text as assigned_rep_name,
        'trapstarcustoms@gmail.com'::text as rep_email,
        10 as source_priority
      union all
      select
        'jazzy'::text as rep_slug,
        'Jazzy Automotive'::text as assigned_rep_name,
        'jazzyautoimaging@gmail.com'::text as rep_email,
        10 as source_priority
      union all
      select
        lower(trim(au.rep_slug)) as rep_slug,
        coalesce(nullif(trim(au.display_name), ''), trim(au.email)) as assigned_rep_name,
        trim(au.email) as rep_email,
        20 as source_priority
      from public.admin_users au
      where au.is_active = true
        and au.role in ('owner_admin', 'sales_rep')
        and nullif(trim(coalesce(au.rep_slug, '')), '') is not null
        and nullif(trim(coalesce(au.email, '')), '') is not null
    ),
    ranked_roster as (
      select distinct on (tr.rep_slug)
        tr.rep_slug,
        tr.assigned_rep_name,
        tr.rep_email
      from trusted_roster tr
      order by tr.rep_slug, tr.source_priority
    )
    select
      rr.rep_email,
      rr.assigned_rep_name
    into
      next_rep_email,
      next_assigned_rep_name
    from ranked_roster rr
    where rr.rep_slug = next_rep_slug;

    if next_rep_email is null or next_assigned_rep_name is null then
      raise exception 'Unknown or inactive assignable rep: %', next_rep_slug;
    end if;

    update public.quote_requests qr
    set
      rep_slug = next_rep_slug,
      rep_email = next_rep_email,
      assigned_rep_name = next_assigned_rep_name
    where qr.id = assign_quote_rep_owner_admin.quote_id;

    insert into public.quote_status_events (
      quote_request_id,
      event_type,
      status,
      message
    )
    values (
      assign_quote_rep_owner_admin.quote_id,
      'rep_assignment',
      null,
      case
        when nullif(trim(coalesce(previous_assigned_rep_name, '')), '') is null then 'Quote assigned to ' || next_assigned_rep_name || '.'
        else 'Quote reassigned from ' || previous_assigned_rep_name || ' to ' || next_assigned_rep_name || '.'
      end
    );
  end if;

  return;
end;
$function$;

-- list_assignable_reps_owner_admin: owner_admin only
CREATE OR REPLACE FUNCTION public.list_assignable_reps_owner_admin()
 RETURNS TABLE(rep_slug text, assigned_rep_name text, rep_email text, type text, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
begin
  
  perform public.require_active_admin_role(array['owner_admin']);
if not exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and au.role = 'owner_admin'
  ) then
    raise exception 'Owner admin access is required.';
  end if;

  return query
  with trusted_roster as (
    select
      'todd'::text as rep_slug,
      'Todd Wheeler'::text as assigned_rep_name,
      'trapstarcustoms@gmail.com'::text as rep_email,
      'sales_rep'::text as type,
      'active'::text as status,
      10 as source_priority
    union all
    select
      'jazzy'::text as rep_slug,
      'Jazzy Automotive'::text as assigned_rep_name,
      'jazzyautoimaging@gmail.com'::text as rep_email,
      'partner_install_company'::text as type,
      'active'::text as status,
      10 as source_priority
    union all
    select
      lower(trim(au.rep_slug)) as rep_slug,
      coalesce(nullif(trim(au.display_name), ''), trim(au.email)) as assigned_rep_name,
      trim(au.email) as rep_email,
      case
        when au.role = 'owner_admin' then 'internal_owner_admin'
        else 'sales_rep'
      end as type,
      'active'::text as status,
      20 as source_priority
    from public.admin_users au
    where au.is_active = true
      and au.role in ('owner_admin', 'sales_rep')
      and nullif(trim(coalesce(au.rep_slug, '')), '') is not null
      and nullif(trim(coalesce(au.email, '')), '') is not null
  ),
  ranked_roster as (
    select distinct on (tr.rep_slug)
      tr.rep_slug,
      tr.assigned_rep_name,
      tr.rep_email,
      tr.type,
      tr.status
    from trusted_roster tr
    order by tr.rep_slug, tr.source_priority
  )
  select
    rr.rep_slug,
    rr.assigned_rep_name,
    rr.rep_email,
    rr.type,
    rr.status
  from ranked_roster rr
  order by rr.assigned_rep_name;
end;
$function$;

-- get_rep_assigned_quote_requests_v2: sales_rep only, scoped by caller admin_users.rep_slug
CREATE OR REPLACE FUNCTION public.get_rep_assigned_quote_requests_v2()
 RETURNS TABLE(id uuid, quote_id text, customer_name text, customer_email text, customer_phone text, preferred_contact text, status text, product_type text, rep_slug text, assigned_rep_name text, quote_summary jsonb, file_summary jsonb, status_events jsonb, follow_up_summary jsonb, follow_up_tasks jsonb, customer_action_requests jsonb, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $function$
declare
  current_rep_slug text;
begin
  select lower(trim(au.rep_slug))
  into current_rep_slug
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role = 'sales_rep'
    and nullif(trim(coalesce(au.rep_slug, '')), '') is not null
  limit 1;

  if current_rep_slug is null then
    raise exception 'Active sales rep access is required.';
  end if;

  return query
  with scoped_quotes as (
    select qr.*
    from public.quote_requests qr
    where lower(trim(coalesce(qr.rep_slug, ''))) = current_rep_slug
    order by qr.created_at desc
    limit 100
  )
  select
    sq.id,
    sq.quote_id,
    sq.customer_name,
    sq.customer_email,
    sq.customer_phone,
    sq.preferred_contact,
    sq.status,
    sq.product_type,
    sq.rep_slug,
    sq.assigned_rep_name,
    jsonb_strip_nulls(jsonb_build_object(
      'quoteType', sq.quote_data -> 'quoteType',
      'intakeType', sq.quote_data -> 'intakeType',
      'selectedService', sq.quote_data -> 'selectedService',
      'productType', sq.quote_data -> 'productType',
      'companyName', sq.quote_data -> 'companyName',
      'vehicleType', sq.quote_data -> 'vehicleType',
      'vehicleYear', sq.quote_data -> 'vehicleYear',
      'vehicleMake', sq.quote_data -> 'vehicleMake',
      'vehicleModel', sq.quote_data -> 'vehicleModel',
      'vehicle', sq.quote_data -> 'vehicle',
      'manualVehicleDescription', sq.quote_data -> 'manualVehicleDescription',
      'customVehicleDescription', sq.quote_data -> 'customVehicleDescription',
      'otherVehicleDescription', sq.quote_data -> 'otherVehicleDescription',
      'wrapType', sq.quote_data -> 'wrapType',
      'coverageAreas', sq.quote_data -> 'coverageAreas',
      'useType', sq.quote_data -> 'useType',
      'designNeeds', sq.quote_data -> 'designNeeds',
      'finishPreference', sq.quote_data -> 'finishPreference',
      'timeline', sq.quote_data -> 'timeline',
      'budget', sq.quote_data -> 'budget',
      'goal', sq.quote_data -> 'goal',
      'notes', sq.quote_data -> 'notes',
      'projectNotes', sq.quote_data -> 'projectNotes',
      'hasArtwork', sq.quote_data -> 'hasArtwork',
      'artworkStatus', sq.quote_data -> 'artworkStatus',
      'uploadedFileCount', sq.quote_data -> 'uploadedFileCount',
      'banner', sq.quote_data -> 'banner'
    )) as quote_summary,
    coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', uploaded_file -> 'id',
        'name', uploaded_file -> 'name',
        'url', uploaded_file -> 'url',
        'type', uploaded_file -> 'type',
        'size', uploaded_file -> 'size',
        'tags', uploaded_file -> 'tags'
      )))
      from jsonb_array_elements(
        case
          when jsonb_typeof(sq.uploaded_files) = 'array' then sq.uploaded_files
          else '[]'::jsonb
        end
      ) as files(uploaded_file)
    ), '[]'::jsonb) as file_summary,
    coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', event_rows.id,
        'event_type', event_rows.event_type,
        'status', event_rows.status,
        'message', event_rows.message,
        'created_at', event_rows.created_at
      )) order by event_rows.created_at desc)
      from (
        select qse.id, qse.event_type, qse.status, qse.message, qse.created_at
        from public.quote_status_events qse
        where qse.quote_request_id = sq.id
          and qse.event_type <> 'rep_assignment'
        order by qse.created_at desc
        limit 25
      ) event_rows
    ), '[]'::jsonb) as status_events,
    jsonb_strip_nulls(jsonb_build_object(
      'next_follow_up_task', (
        select jsonb_strip_nulls(jsonb_build_object(
          'id', next_task.id,
          'task_text', next_task.task_text,
          'due_date', next_task.due_date,
          'status', next_task.status,
          'created_at', next_task.created_at
        ))
        from public.quote_follow_up_tasks next_task
        where next_task.quote_request_id = sq.id
          and next_task.status = 'open'
        order by next_task.due_date asc, next_task.created_at asc
        limit 1
      ),
      'open_follow_up_count', (
        select count(*)::integer
        from public.quote_follow_up_tasks qfut
        where qfut.quote_request_id = sq.id
          and qfut.status = 'open'
      ),
      'overdue_follow_up_count', (
        select count(*)::integer
        from public.quote_follow_up_tasks qfut
        where qfut.quote_request_id = sq.id
          and qfut.status = 'open'
          and qfut.due_date < current_date
      ),
      'due_today_follow_up_count', (
        select count(*)::integer
        from public.quote_follow_up_tasks qfut
        where qfut.quote_request_id = sq.id
          and qfut.status = 'open'
          and qfut.due_date = current_date
      )
    )) as follow_up_summary,
    coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', task_rows.id,
        'task_text', task_rows.task_text,
        'due_date', task_rows.due_date,
        'status', task_rows.status,
        'created_by', task_rows.created_by,
        'created_at', task_rows.created_at,
        'completed_at', task_rows.completed_at
      )) order by
        case when task_rows.status = 'open' then 0 else 1 end,
        task_rows.due_date asc,
        task_rows.created_at desc)
      from (
        select qfut.id, qfut.task_text, qfut.due_date, qfut.status, qfut.created_by, qfut.created_at, qfut.completed_at
        from public.quote_follow_up_tasks qfut
        where qfut.quote_request_id = sq.id
        order by
          case when qfut.status = 'open' then 0 else 1 end,
          qfut.due_date asc,
          qfut.created_at desc
        limit 25
      ) task_rows
    ), '[]'::jsonb) as follow_up_tasks,
    coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', action_rows.id,
        'request_type', action_rows.request_type,
        'request_types', action_rows.request_types,
        'message', action_rows.message,
        'customer_email', action_rows.customer_email,
        'status', action_rows.status,
        'created_by', action_rows.created_by,
        'created_at', action_rows.created_at,
        'sent_at', action_rows.sent_at
      )) order by action_rows.created_at desc)
      from (
        select qcar.id, qcar.request_type, qcar.request_types, qcar.message, qcar.customer_email, qcar.status, qcar.created_by, qcar.created_at, qcar.sent_at
        from public.quote_customer_action_requests qcar
        where qcar.quote_request_id = sq.id
        order by qcar.created_at desc
        limit 25
      ) action_rows
    ), '[]'::jsonb) as customer_action_requests,
    sq.created_at
  from scoped_quotes sq
  order by sq.created_at desc;
end;
$function$;

-- =========================================================
-- Execute permission hardening
-- =========================================================
revoke execute on function public.get_admin_quote_requests() from public;
revoke execute on function public.get_admin_quote_requests() from anon;
grant execute on function public.get_admin_quote_requests() to authenticated;
revoke execute on function public.get_admin_quote_request_detail(uuid) from public;
revoke execute on function public.get_admin_quote_request_detail(uuid) from anon;
grant execute on function public.get_admin_quote_request_detail(uuid) to authenticated;
revoke execute on function public.get_admin_quote_follow_up_summaries() from public;
revoke execute on function public.get_admin_quote_follow_up_summaries() from anon;
grant execute on function public.get_admin_quote_follow_up_summaries() to authenticated;
revoke execute on function public.get_quote_status_events_admin(uuid) from public;
revoke execute on function public.get_quote_status_events_admin(uuid) from anon;
grant execute on function public.get_quote_status_events_admin(uuid) to authenticated;
revoke execute on function public.get_quote_follow_up_tasks_admin(uuid) from public;
revoke execute on function public.get_quote_follow_up_tasks_admin(uuid) from anon;
grant execute on function public.get_quote_follow_up_tasks_admin(uuid) to authenticated;
revoke execute on function public.get_quote_internal_notes_admin(uuid) from public;
revoke execute on function public.get_quote_internal_notes_admin(uuid) from anon;
grant execute on function public.get_quote_internal_notes_admin(uuid) to authenticated;
revoke execute on function public.get_quote_customer_action_requests_admin(uuid) from public;
revoke execute on function public.get_quote_customer_action_requests_admin(uuid) from anon;
grant execute on function public.get_quote_customer_action_requests_admin(uuid) to authenticated;
revoke execute on function public.update_quote_status_admin(uuid,text) from public;
revoke execute on function public.update_quote_status_admin(uuid,text) from anon;
grant execute on function public.update_quote_status_admin(uuid,text) to authenticated;
revoke execute on function public.add_quote_follow_up_task_admin(uuid,text,date) from public;
revoke execute on function public.add_quote_follow_up_task_admin(uuid,text,date) from anon;
grant execute on function public.add_quote_follow_up_task_admin(uuid,text,date) to authenticated;
revoke execute on function public.complete_quote_follow_up_task_admin(uuid) from public;
revoke execute on function public.complete_quote_follow_up_task_admin(uuid) from anon;
grant execute on function public.complete_quote_follow_up_task_admin(uuid) to authenticated;
revoke execute on function public.add_quote_internal_note_admin(uuid,text) from public;
revoke execute on function public.add_quote_internal_note_admin(uuid,text) from anon;
grant execute on function public.add_quote_internal_note_admin(uuid,text) to authenticated;
revoke execute on function public.create_quote_customer_action_request_admin(uuid,text,text,text,boolean,jsonb) from public;
revoke execute on function public.create_quote_customer_action_request_admin(uuid,text,text,text,boolean,jsonb) from anon;
grant execute on function public.create_quote_customer_action_request_admin(uuid,text,text,text,boolean,jsonb) to authenticated;
revoke execute on function public.create_quote_customer_upload_token_admin(uuid,jsonb,integer) from public;
revoke execute on function public.create_quote_customer_upload_token_admin(uuid,jsonb,integer) from anon;
grant execute on function public.create_quote_customer_upload_token_admin(uuid,jsonb,integer) to authenticated;
revoke execute on function public.assign_quote_rep_owner_admin(uuid,text) from public;
revoke execute on function public.assign_quote_rep_owner_admin(uuid,text) from anon;
grant execute on function public.assign_quote_rep_owner_admin(uuid,text) to authenticated;
revoke execute on function public.list_assignable_reps_owner_admin() from public;
revoke execute on function public.list_assignable_reps_owner_admin() from anon;
grant execute on function public.list_assignable_reps_owner_admin() to authenticated;
revoke execute on function public.get_rep_assigned_quote_requests_v2() from public;
revoke execute on function public.get_rep_assigned_quote_requests_v2() from anon;
grant execute on function public.get_rep_assigned_quote_requests_v2() to authenticated;

commit;
