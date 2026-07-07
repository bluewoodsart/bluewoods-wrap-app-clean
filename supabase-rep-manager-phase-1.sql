-- SlapWrapz CRM - Rep Manager Phase 1
-- Adds a staged rep-manager model without changing normal sales rep portal access.
-- Run after supabase-admin-auth.sql and supabase-rep-portal-rpcs.sql are installed.

alter table public.admin_users
  drop constraint if exists admin_users_role_check;

alter table public.admin_users
  add constraint admin_users_role_check
  check (role in ('owner_admin', 'staff', 'sales_rep', 'rep_manager'));

alter table public.admin_users
  drop constraint if exists admin_users_sales_rep_requires_rep_slug_check;

alter table public.admin_users
  add constraint admin_users_rep_roles_require_rep_slug_check
  check (role not in ('sales_rep', 'rep_manager') or nullif(trim(coalesce(rep_slug, '')), '') is not null);

alter table public.admin_users
  add column if not exists manager_admin_user_id uuid references public.admin_users(id) on delete set null,
  add column if not exists rep_manager_status text not null default 'starter',
  add column if not exists max_child_reps integer not null default 0;

alter table public.admin_users
  drop constraint if exists admin_users_rep_manager_status_check;

alter table public.admin_users
  add constraint admin_users_rep_manager_status_check
  check (rep_manager_status in ('starter', 'qualified'));

alter table public.admin_users
  drop constraint if exists admin_users_max_child_reps_check;

alter table public.admin_users
  add constraint admin_users_max_child_reps_check
  check (
    max_child_reps >= 0
    and max_child_reps <= 22
    and (role = 'rep_manager' or max_child_reps = 0)
    and (
      role <> 'rep_manager'
      or (
        (rep_manager_status = 'starter' and max_child_reps between 1 and 5)
        or (rep_manager_status = 'qualified' and max_child_reps between 1 and 22)
      )
    )
  );

alter table public.admin_users
  drop constraint if exists admin_users_no_self_manager_check;

alter table public.admin_users
  add constraint admin_users_no_self_manager_check
  check (manager_admin_user_id is null or manager_admin_user_id <> id);

alter table public.admin_users
  drop constraint if exists admin_users_manager_child_role_check;

alter table public.admin_users
  add constraint admin_users_manager_child_role_check
  check (manager_admin_user_id is null or role = 'sales_rep');

create index if not exists admin_users_manager_admin_user_id_idx
  on public.admin_users (manager_admin_user_id);

update public.admin_users
set
  rep_manager_status = 'starter',
  max_child_reps = 5
where role = 'rep_manager'
  and max_child_reps = 0;

create or replace function public.validate_rep_manager_assignment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  manager_record record;
  active_child_count integer;
begin
  if new.role = 'rep_manager' then
    select count(*)::integer
    into active_child_count
    from public.admin_users child
    where child.manager_admin_user_id = new.id
      and child.is_active = true
      and child.role = 'sales_rep';

    if active_child_count > new.max_child_reps then
      raise exception 'Rep manager cap is below current active child reps. Cap: %, active child reps: %.',
        new.max_child_reps,
        active_child_count;
    end if;
  end if;

  if new.manager_admin_user_id is null then
    return new;
  end if;

  if new.role <> 'sales_rep' then
    raise exception 'Only sales reps can be attached under a rep manager.';
  end if;

  select
    au.id,
    au.role,
    au.is_active,
    au.max_child_reps
  into manager_record
  from public.admin_users au
  where au.id = new.manager_admin_user_id;

  if manager_record.id is null or manager_record.role <> 'rep_manager' or manager_record.is_active is not true then
    raise exception 'Child reps must be assigned to an active rep manager.';
  end if;

  if new.is_active is not true then
    return new;
  end if;

  select count(*)::integer
  into active_child_count
  from public.admin_users child
  where child.manager_admin_user_id = new.manager_admin_user_id
    and child.is_active = true
    and child.role = 'sales_rep'
    and child.id <> new.id;

  if active_child_count + 1 > manager_record.max_child_reps then
    raise exception 'Rep manager child limit exceeded. Limit: %, current active child reps: %.',
      manager_record.max_child_reps,
      active_child_count;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_rep_manager_assignment on public.admin_users;
create trigger validate_rep_manager_assignment
before insert or update of manager_admin_user_id, role, is_active, max_child_reps
on public.admin_users
for each row
execute function public.validate_rep_manager_assignment();

drop function if exists public.list_rep_manager_child_reps();
create or replace function public.list_rep_manager_child_reps()
returns table (
  id uuid,
  email text,
  display_name text,
  role text,
  rep_slug text,
  is_active boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_manager_id uuid;
begin
  select au.id
  into current_manager_id
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role = 'rep_manager'
  limit 1;

  if current_manager_id is null then
    raise exception 'Active rep manager access is required.';
  end if;

  return query
  select
    au.id,
    au.email,
    au.display_name,
    au.role,
    au.rep_slug,
    au.is_active,
    au.created_at
  from public.admin_users au
  where au.manager_admin_user_id = current_manager_id
    and au.is_active = true
    and au.role = 'sales_rep'
  order by au.display_name nulls last, au.email;
end;
$$;

revoke all on function public.list_rep_manager_child_reps() from public;
revoke all on function public.list_rep_manager_child_reps() from anon;
grant execute on function public.list_rep_manager_child_reps() to authenticated;

drop function if exists public.get_rep_manager_quote_requests_v1();
create or replace function public.get_rep_manager_quote_requests_v1()
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
  current_manager_id uuid;
  current_manager_slug text;
begin
  select
    au.id,
    lower(trim(au.rep_slug))
  into
    current_manager_id,
    current_manager_slug
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role = 'rep_manager'
    and nullif(trim(coalesce(au.rep_slug, '')), '') is not null
  limit 1;

  if current_manager_id is null then
    raise exception 'Active rep manager access is required.';
  end if;

  return query
  with managed_rep_slugs as (
    select current_manager_slug as rep_slug
    union
    select lower(trim(child.rep_slug)) as rep_slug
    from public.admin_users child
    where child.manager_admin_user_id = current_manager_id
      and child.is_active = true
      and child.role = 'sales_rep'
      and nullif(trim(coalesce(child.rep_slug, '')), '') is not null
  ),
  scoped_quotes as (
    select qr.*
    from public.quote_requests qr
    where lower(trim(coalesce(qr.rep_slug, ''))) in (
      select managed_rep_slugs.rep_slug from managed_rep_slugs
    )
    order by qr.created_at desc
    limit 250
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
      'banner', sq.quote_data -> 'banner',
      'signage', sq.quote_data -> 'signage',
      'sign', sq.quote_data -> 'sign'
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

revoke all on function public.get_rep_manager_quote_requests_v1() from public;
revoke all on function public.get_rep_manager_quote_requests_v1() from anon;
grant execute on function public.get_rep_manager_quote_requests_v1() to authenticated;

notify pgrst, 'reload schema';

-- Onboarding pattern after creating the Supabase Auth user in the dashboard:
--
-- insert into public.admin_users (
--   auth_user_id,
--   email,
--   display_name,
--   role,
--   rep_slug,
--   manager_admin_user_id
-- )
-- values (
--   'AUTH_USER_ID_FROM_SUPABASE',
--   'rep@example.com',
--   'Rep Name',
--   'sales_rep',
--   'rep-slug',
--   null
-- );
--
-- Make a starter rep manager:
--
-- update public.admin_users
-- set role = 'rep_manager',
--     rep_manager_status = 'starter',
--     max_child_reps = 5
-- where rep_slug = 'manager-slug';
--
-- Attach a child rep to a manager:
--
-- update public.admin_users child
-- set manager_admin_user_id = manager.id
-- from public.admin_users manager
-- where child.rep_slug = 'child-rep-slug'
--   and manager.rep_slug = 'manager-slug'
--   and manager.role = 'rep_manager';
