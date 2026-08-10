-- Five-minute rep response SLA for newly assigned quote leads.
create table if not exists public.urgent_lead_assignments (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null unique references public.quote_requests(id) on delete cascade,
  assigned_rep_slug text not null,
  assigned_rep_email text,
  assigned_rep_name text,
  assigned_at timestamptz not null default now(),
  response_deadline_at timestamptz not null default (now() + interval '5 minutes'),
  acknowledged_at timestamptz,
  contacted_at timestamptz,
  contact_method text check (contact_method is null or contact_method in ('call', 'text', 'email')),
  claimed_at timestamptz,
  claimed_from_rep_slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists urgent_lead_assignments_rep_deadline_idx
  on public.urgent_lead_assignments (assigned_rep_slug, response_deadline_at)
  where contacted_at is null;

create index if not exists urgent_lead_assignments_available_idx
  on public.urgent_lead_assignments (response_deadline_at)
  where contacted_at is null;

alter table public.urgent_lead_assignments enable row level security;
revoke all on table public.urgent_lead_assignments from public, anon, authenticated;
drop policy if exists "Urgent lead assignments require RPC access" on public.urgent_lead_assignments;
create policy "Urgent lead assignments require RPC access"
  on public.urgent_lead_assignments
  as restrictive
  for all
  to authenticated
  using (false)
  with check (false);

create or replace function public.sync_urgent_lead_assignment_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if nullif(trim(coalesce(new.rep_slug, '')), '') is null
     or lower(coalesce(new.status, '')) not in ('new', 'partial_lead') then
    delete from public.urgent_lead_assignments
    where quote_request_id = new.id
      and contacted_at is null;
    return new;
  end if;

  insert into public.urgent_lead_assignments (
    quote_request_id,
    assigned_rep_slug,
    assigned_rep_email,
    assigned_rep_name,
    assigned_at,
    response_deadline_at,
    acknowledged_at,
    contacted_at,
    contact_method,
    claimed_at,
    claimed_from_rep_slug,
    updated_at
  ) values (
    new.id,
    lower(trim(new.rep_slug)),
    new.rep_email,
    new.assigned_rep_name,
    now(),
    now() + interval '5 minutes',
    null,
    null,
    null,
    null,
    null,
    now()
  )
  on conflict (quote_request_id) do update set
    assigned_rep_slug = excluded.assigned_rep_slug,
    assigned_rep_email = excluded.assigned_rep_email,
    assigned_rep_name = excluded.assigned_rep_name,
    assigned_at = excluded.assigned_at,
    response_deadline_at = excluded.response_deadline_at,
    acknowledged_at = null,
    contacted_at = null,
    contact_method = null,
    claimed_at = null,
    claimed_from_rep_slug = null,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_urgent_lead_assignment_v1 on public.quote_requests;
create trigger sync_urgent_lead_assignment_v1
after insert or update of rep_slug on public.quote_requests
for each row execute function public.sync_urgent_lead_assignment_v1();

revoke all on function public.sync_urgent_lead_assignment_v1() from public, anon, authenticated;

create or replace function public.get_urgent_lead_queue_v1()
returns table (
  tracking_id uuid,
  quote_request_id uuid,
  quote_id text,
  customer_name text,
  customer_email text,
  customer_phone text,
  preferred_contact text,
  status text,
  product_type text,
  source text,
  quote_summary jsonb,
  lead_created_at timestamptz,
  assigned_at timestamptz,
  response_deadline_at timestamptz,
  acknowledged_at timestamptz,
  contacted_at timestamptz,
  contact_method text,
  assigned_rep_slug text,
  assigned_rep_name text,
  queue_state text,
  is_mine boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_rep_slug text;
begin
  select lower(trim(au.rep_slug))
  into current_rep_slug
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role in ('sales_rep', 'rep_manager')
    and nullif(trim(coalesce(au.rep_slug, '')), '') is not null
  limit 1;

  if current_rep_slug is null then
    raise exception 'Active rep access is required.';
  end if;

  return query
  select
    ula.id,
    qr.id,
    qr.quote_id,
    qr.customer_name,
    qr.customer_email,
    qr.customer_phone,
    qr.preferred_contact,
    qr.status,
    qr.product_type,
    qr.source,
    jsonb_strip_nulls(jsonb_build_object(
      'selectedService', qr.quote_data -> 'selectedService',
      'quoteType', qr.quote_data -> 'quoteType',
      'intakeType', qr.quote_data -> 'intakeType',
      'companyName', qr.quote_data -> 'companyName',
      'vehicleType', qr.quote_data -> 'vehicleType',
      'vehicle', qr.quote_data -> 'vehicle',
      'manualVehicleDescription', qr.quote_data -> 'manualVehicleDescription',
      'goal', qr.quote_data -> 'goal',
      'budget', qr.quote_data -> 'budget'
    )),
    qr.created_at,
    ula.assigned_at,
    ula.response_deadline_at,
    ula.acknowledged_at,
    ula.contacted_at,
    ula.contact_method,
    ula.assigned_rep_slug,
    ula.assigned_rep_name,
    case
      when ula.assigned_rep_slug = current_rep_slug and ula.response_deadline_at > now() and ula.acknowledged_at is not null then 'acknowledged'
      when ula.assigned_rep_slug = current_rep_slug and ula.response_deadline_at > now() then 'assigned'
      when ula.response_deadline_at <= now() then 'available'
      else 'assigned'
    end,
    ula.assigned_rep_slug = current_rep_slug
  from public.urgent_lead_assignments ula
  join public.quote_requests qr on qr.id = ula.quote_request_id
  where ula.contacted_at is null
    and qr.archived_at is null
    and (
      ula.assigned_rep_slug = current_rep_slug
      or ula.response_deadline_at <= now()
    )
  order by
    case when ula.assigned_rep_slug = current_rep_slug and ula.response_deadline_at > now() then 0 else 1 end,
    ula.response_deadline_at asc;
end;
$$;

create or replace function public.acknowledge_urgent_lead_v1(p_quote_request_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_rep_slug text;
  acknowledged_time timestamptz;
begin
  select lower(trim(au.rep_slug)) into current_rep_slug
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role in ('sales_rep', 'rep_manager')
  limit 1;

  update public.urgent_lead_assignments
  set acknowledged_at = coalesce(acknowledged_at, now()), updated_at = now()
  where quote_request_id = p_quote_request_id
    and assigned_rep_slug = current_rep_slug
    and contacted_at is null
  returning acknowledged_at into acknowledged_time;

  if acknowledged_time is null then
    raise exception 'This lead is not assigned to your rep account.';
  end if;

  return acknowledged_time;
end;
$$;

create or replace function public.mark_urgent_lead_contacted_v1(
  p_quote_request_id uuid,
  p_contact_method text
)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_rep_slug text;
  contacted_time timestamptz;
begin
  if lower(coalesce(p_contact_method, '')) not in ('call', 'text', 'email') then
    raise exception 'Contact method must be call, text, or email.';
  end if;

  select lower(trim(au.rep_slug)) into current_rep_slug
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role in ('sales_rep', 'rep_manager')
  limit 1;

  update public.urgent_lead_assignments
  set
    acknowledged_at = coalesce(acknowledged_at, now()),
    contacted_at = now(),
    contact_method = lower(p_contact_method),
    updated_at = now()
  where quote_request_id = p_quote_request_id
    and assigned_rep_slug = current_rep_slug
    and contacted_at is null
  returning contacted_at into contacted_time;

  if contacted_time is null then
    raise exception 'Claim this lead before contacting it.';
  end if;

  return contacted_time;
end;
$$;

create or replace function public.claim_expired_urgent_lead_v1(p_quote_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_rep public.admin_users%rowtype;
  claimed_tracking_id uuid;
  previous_rep_slug text;
begin
  select au.* into current_rep
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role in ('sales_rep', 'rep_manager')
    and nullif(trim(coalesce(au.rep_slug, '')), '') is not null
  limit 1;

  if current_rep.id is null then
    raise exception 'Active rep access is required.';
  end if;

  update public.urgent_lead_assignments
  set
    claimed_from_rep_slug = assigned_rep_slug,
    assigned_rep_slug = lower(trim(current_rep.rep_slug)),
    assigned_rep_email = current_rep.email,
    assigned_rep_name = coalesce(current_rep.display_name, current_rep.email),
    assigned_at = now(),
    response_deadline_at = now() + interval '5 minutes',
    acknowledged_at = now(),
    claimed_at = now(),
    updated_at = now()
  where quote_request_id = p_quote_request_id
    and contacted_at is null
    and response_deadline_at <= now()
    and assigned_rep_slug <> lower(trim(current_rep.rep_slug))
  returning id, claimed_from_rep_slug into claimed_tracking_id, previous_rep_slug;

  if claimed_tracking_id is null then
    raise exception 'This lead was already claimed or is not available yet.';
  end if;

  update public.quote_requests
  set
    rep_slug = lower(trim(current_rep.rep_slug)),
    rep_email = current_rep.email,
    assigned_rep_name = coalesce(current_rep.display_name, current_rep.email)
  where id = p_quote_request_id;

  -- The quote update trigger restarts the timer; restore the atomic claim stamp.
  update public.urgent_lead_assignments
  set
    claimed_at = now(),
    claimed_from_rep_slug = previous_rep_slug,
    acknowledged_at = now(),
    updated_at = now()
  where id = claimed_tracking_id;

  return claimed_tracking_id;
end;
$$;

revoke all on function public.get_urgent_lead_queue_v1() from public, anon;
revoke all on function public.acknowledge_urgent_lead_v1(uuid) from public, anon;
revoke all on function public.mark_urgent_lead_contacted_v1(uuid, text) from public, anon;
revoke all on function public.claim_expired_urgent_lead_v1(uuid) from public, anon;
grant execute on function public.get_urgent_lead_queue_v1() to authenticated;
grant execute on function public.acknowledge_urgent_lead_v1(uuid) to authenticated;
grant execute on function public.mark_urgent_lead_contacted_v1(uuid, text) to authenticated;
grant execute on function public.claim_expired_urgent_lead_v1(uuid) to authenticated;

notify pgrst, 'reload schema';
