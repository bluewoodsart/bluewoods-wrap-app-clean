-- SlapWrapz CRM Phase 2B - Limited sales rep portal RPCs
-- Read-only assigned quote access for active sales_rep users.
-- This file intentionally does not modify Phase 3 pricing, assignment RPCs, or admin write RPCs.

drop function if exists public.get_rep_assigned_quote_requests();
create or replace function public.get_rep_assigned_quote_requests()
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
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
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
  select
    qr.id,
    qr.quote_id,
    qr.customer_name,
    qr.customer_email,
    qr.customer_phone,
    qr.preferred_contact,
    qr.status,
    qr.product_type,
    qr.rep_slug,
    qr.assigned_rep_name,
    jsonb_strip_nulls(jsonb_build_object(
      'quoteType', qr.quote_data -> 'quoteType',
      'intakeType', qr.quote_data -> 'intakeType',
      'selectedService', qr.quote_data -> 'selectedService',
      'productType', qr.quote_data -> 'productType',
      'companyName', qr.quote_data -> 'companyName',
      'vehicleType', qr.quote_data -> 'vehicleType',
      'manualVehicleDescription', qr.quote_data -> 'manualVehicleDescription',
      'customVehicleDescription', qr.quote_data -> 'customVehicleDescription',
      'vehicle', qr.quote_data -> 'vehicle',
      'wrapType', qr.quote_data -> 'wrapType',
      'coverageAreas', qr.quote_data -> 'coverageAreas',
      'useType', qr.quote_data -> 'useType',
      'designNeeds', qr.quote_data -> 'designNeeds',
      'finishPreference', qr.quote_data -> 'finishPreference',
      'timeline', qr.quote_data -> 'timeline',
      'budget', qr.quote_data -> 'budget',
      'goal', qr.quote_data -> 'goal',
      'hasArtwork', qr.quote_data -> 'hasArtwork',
      'artworkStatus', qr.quote_data -> 'artworkStatus',
      'uploadedFileCount', qr.quote_data -> 'uploadedFileCount',
      'banner', qr.quote_data -> 'banner'
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
          when jsonb_typeof(qr.uploaded_files) = 'array' then qr.uploaded_files
          else '[]'::jsonb
        end
      ) as files(uploaded_file)
    ), '[]'::jsonb) as file_summary,
    qr.created_at
  from public.quote_requests qr
  where lower(trim(coalesce(qr.rep_slug, ''))) = current_rep_slug
  order by qr.created_at desc
  limit 100;
end;
$$;

revoke all on function public.get_rep_assigned_quote_requests() from public;
revoke all on function public.get_rep_assigned_quote_requests() from anon;
grant execute on function public.get_rep_assigned_quote_requests() to authenticated;

drop function if exists public.get_rep_assigned_quote_requests_v2();
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
set search_path = public
as $$
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
$$;

revoke all on function public.get_rep_assigned_quote_requests_v2() from public;
revoke all on function public.get_rep_assigned_quote_requests_v2() from anon;
grant execute on function public.get_rep_assigned_quote_requests_v2() to authenticated;

notify pgrst, 'reload schema';
