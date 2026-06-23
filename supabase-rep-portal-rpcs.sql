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
