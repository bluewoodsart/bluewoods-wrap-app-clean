-- SlapWrapz CRM
-- Admin quote archive / hide support.
--
-- DRAFT ONLY. Do not run until reviewed and approved.
-- Purpose: hide junk quote jobs from normal admin and rep views without deleting customer data.
-- No Phase 3 pricing changes.

begin;

alter table public.quote_requests
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid,
  add column if not exists archive_reason text;

create index if not exists quote_requests_active_created_at_idx
  on public.quote_requests (created_at desc)
  where archived_at is null;

create index if not exists quote_requests_active_rep_slug_idx
  on public.quote_requests (rep_slug, created_at desc)
  where archived_at is null;

create or replace function public.archive_quote_requests_owner_admin(
  p_quote_request_ids uuid[],
  p_archive_reason text default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  archived_count integer := 0;
begin
  perform public.require_active_admin_role(array['owner_admin']);

  if p_quote_request_ids is null or array_length(p_quote_request_ids, 1) is null then
    return 0;
  end if;

  with target_quotes as (
    select qr.id
    from public.quote_requests qr
    where qr.id = any(p_quote_request_ids)
      and qr.archived_at is null
    for update
  ),
  updated_quotes as (
    update public.quote_requests qr
    set
      archived_at = now(),
      archived_by = auth.uid(),
      archive_reason = nullif(trim(coalesce(p_archive_reason, '')), '')
    from target_quotes tq
    where qr.id = tq.id
    returning qr.id, qr.status, qr.quote_id, qr.customer_name
  ),
  archive_events as (
    insert into public.quote_status_events (
      quote_request_id,
      event_type,
      status,
      message
    )
    select
      uq.id,
      'quote_archived',
      uq.status,
      'Quote archived from admin cleanup' ||
        case
          when nullif(trim(coalesce(p_archive_reason, '')), '') is not null
            then ': ' || nullif(trim(coalesce(p_archive_reason, '')), '')
          else '.'
        end
    from updated_quotes uq
    returning quote_request_id
  )
  select count(*)::integer
  into archived_count
  from archive_events;

  return archived_count;
end;
$function$;

create or replace function public.restore_quote_requests_owner_admin(
  p_quote_request_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  restored_count integer := 0;
begin
  perform public.require_active_admin_role(array['owner_admin']);

  if p_quote_request_ids is null or array_length(p_quote_request_ids, 1) is null then
    return 0;
  end if;

  with target_quotes as (
    select qr.id
    from public.quote_requests qr
    where qr.id = any(p_quote_request_ids)
      and qr.archived_at is not null
    for update
  ),
  updated_quotes as (
    update public.quote_requests qr
    set
      archived_at = null,
      archived_by = null,
      archive_reason = null
    from target_quotes tq
    where qr.id = tq.id
    returning qr.id, qr.status
  ),
  restore_events as (
    insert into public.quote_status_events (
      quote_request_id,
      event_type,
      status,
      message
    )
    select
      uq.id,
      'quote_restored',
      uq.status,
      'Quote restored from archive.'
    from updated_quotes uq
    returning quote_request_id
  )
  select count(*)::integer
  into restored_count
  from restore_events;

  return restored_count;
end;
$function$;

create or replace function public.get_admin_quote_requests()
returns table (
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
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
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
    qr.created_at
  from public.quote_requests qr
  where qr.archived_at is null
  order by qr.created_at desc
  limit 50;
end;
$function$;

create or replace function public.get_archived_quote_requests_owner_admin()
returns table (
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
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  perform public.require_active_admin_role(array['owner_admin']);

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
  where qr.archived_at is not null
  order by qr.archived_at desc, qr.created_at desc
  limit 100;
end;
$function$;

create or replace function public.get_admin_quote_follow_up_summaries()
returns table (
  quote_request_id uuid,
  next_follow_up_task_id uuid,
  next_follow_up_task_text text,
  next_follow_up_due_date date,
  open_follow_up_count integer,
  overdue_follow_up_count integer,
  due_today_follow_up_count integer,
  upcoming_follow_up_count integer,
  follow_up_bucket text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  perform public.require_active_admin_role(array['owner_admin', 'staff']);

  return query
  with recent_quotes as (
    select qr.id
    from public.quote_requests qr
    where qr.archived_at is null
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
      ) as rn
    from open_tasks ot
  ),
  task_counts as (
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
    coalesce(tc.open_follow_up_count, 0) as open_follow_up_count,
    coalesce(tc.overdue_follow_up_count, 0) as overdue_follow_up_count,
    coalesce(tc.due_today_follow_up_count, 0) as due_today_follow_up_count,
    coalesce(tc.upcoming_follow_up_count, 0) as upcoming_follow_up_count,
    case
      when coalesce(tc.overdue_follow_up_count, 0) > 0 then 'overdue'
      when coalesce(tc.due_today_follow_up_count, 0) > 0 then 'due_today'
      when coalesce(tc.open_follow_up_count, 0) > 0 then 'upcoming'
      else 'none'
    end as follow_up_bucket
  from recent_quotes rq
  left join ranked_tasks rt on rt.quote_request_id = rq.id and rt.rn = 1
  left join task_counts tc on tc.quote_request_id = rq.id;
end;
$function$;

create or replace function public.get_rep_assigned_quote_requests_v2()
returns table (
  id uuid,
  quote_id text,
  customer_name text,
  customer_email text,
  customer_phone text,
  preferred_contact text,
  status text,
  product_type text,
  rep_slug text,
  assigned_rep_name text,
  quote_summary jsonb,
  file_summary jsonb,
  status_events jsonb,
  follow_up_summary jsonb,
  follow_up_tasks jsonb,
  customer_action_requests jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
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
      and qr.archived_at is null
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

revoke execute on function public.archive_quote_requests_owner_admin(uuid[], text) from public;
revoke execute on function public.archive_quote_requests_owner_admin(uuid[], text) from anon;
grant execute on function public.archive_quote_requests_owner_admin(uuid[], text) to authenticated;

revoke execute on function public.restore_quote_requests_owner_admin(uuid[]) from public;
revoke execute on function public.restore_quote_requests_owner_admin(uuid[]) from anon;
grant execute on function public.restore_quote_requests_owner_admin(uuid[]) to authenticated;

revoke execute on function public.get_archived_quote_requests_owner_admin() from public;
revoke execute on function public.get_archived_quote_requests_owner_admin() from anon;
grant execute on function public.get_archived_quote_requests_owner_admin() to authenticated;

revoke execute on function public.get_admin_quote_requests() from public;
revoke execute on function public.get_admin_quote_requests() from anon;
grant execute on function public.get_admin_quote_requests() to authenticated;

revoke execute on function public.get_admin_quote_follow_up_summaries() from public;
revoke execute on function public.get_admin_quote_follow_up_summaries() from anon;
grant execute on function public.get_admin_quote_follow_up_summaries() to authenticated;

revoke execute on function public.get_rep_assigned_quote_requests_v2() from public;
revoke execute on function public.get_rep_assigned_quote_requests_v2() from anon;
grant execute on function public.get_rep_assigned_quote_requests_v2() to authenticated;

commit;
