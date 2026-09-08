-- Keep each rep's urgent queue limited to leads assigned to that rep.
-- Also correct the known Forbes Entertainment lead that was attributed to Trapstar.

with reassigned_jeff_morris as (
  update public.quote_requests
  set
    rep_slug = 'wesley',
    rep_email = 'WForbesEvents@gmail.com',
    assigned_rep_name = 'Wesley Forbes'
  where lower(trim(customer_name)) = 'jeff morris'
    and lower(trim(coalesce(rep_slug, ''))) = 'trapstar'
  returning id
)
insert into public.quote_status_events (
  quote_request_id,
  event_type,
  status,
  message
)
select
  id,
  'rep_assignment',
  null,
  'Quote reassigned from Trapstar Customs LG to Wesley Forbes (Forbes Entertainment lead correction).'
from reassigned_jeff_morris;

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
      when ula.response_deadline_at <= now() then 'overdue'
      when ula.acknowledged_at is not null then 'acknowledged'
      else 'assigned'
    end,
    true
  from public.urgent_lead_assignments ula
  join public.quote_requests qr on qr.id = ula.quote_request_id
  where ula.contacted_at is null
    and qr.archived_at is null
    and ula.assigned_rep_slug = current_rep_slug
  order by ula.response_deadline_at asc;
end;
$$;

revoke all on function public.get_urgent_lead_queue_v1() from public;
revoke all on function public.get_urgent_lead_queue_v1() from anon;
grant execute on function public.get_urgent_lead_queue_v1() to authenticated;
