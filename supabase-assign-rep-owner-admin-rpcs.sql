-- Blue Woods / SlapWrapz Assign Rep Phase 2 RPCs
-- Run this in Supabase SQL Editor after protected admin auth is configured.
-- This file intentionally does not modify pricing/admin Phase 3 RPCs.

drop function if exists public.list_assignable_reps_owner_admin();
create or replace function public.list_assignable_reps_owner_admin()
returns table (
  rep_slug text,
  assigned_rep_name text,
  rep_email text,
  type text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
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
      'jarrel'::text as rep_slug,
      'Jarrel'::text as assigned_rep_name,
      'flukerjarrel@gmail.com'::text as rep_email,
      'rep_manager'::text as type,
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
      and au.role in ('owner_admin', 'sales_rep', 'rep_manager')
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
$$;

revoke all on function public.list_assignable_reps_owner_admin() from public;
revoke all on function public.list_assignable_reps_owner_admin() from anon;
grant execute on function public.list_assignable_reps_owner_admin() to authenticated;

drop function if exists public.assign_quote_rep_owner_admin(uuid, text);
create or replace function public.assign_quote_rep_owner_admin(
  quote_id uuid,
  rep_slug text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  next_rep_slug text := lower(trim(coalesce(assign_quote_rep_owner_admin.rep_slug, '')));
  next_rep_email text;
  next_assigned_rep_name text;
  previous_assigned_rep_name text;
begin
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
        'jarrel'::text as rep_slug,
        'Jarrel'::text as assigned_rep_name,
        'flukerjarrel@gmail.com'::text as rep_email,
        10 as source_priority
      union all
      select
        lower(trim(au.rep_slug)) as rep_slug,
        coalesce(nullif(trim(au.display_name), ''), trim(au.email)) as assigned_rep_name,
        trim(au.email) as rep_email,
        20 as source_priority
      from public.admin_users au
      where au.is_active = true
        and au.role in ('owner_admin', 'sales_rep', 'rep_manager')
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
$$;

revoke all on function public.assign_quote_rep_owner_admin(uuid, text) from public;
revoke all on function public.assign_quote_rep_owner_admin(uuid, text) from anon;
grant execute on function public.assign_quote_rep_owner_admin(uuid, text) to authenticated;
