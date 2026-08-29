create or replace function public.get_crm_clients()
returns table (
  client_key text,
  quote_request_id uuid,
  customer_name text,
  company_name text,
  customer_email text,
  customer_phone text,
  preferred_contact text,
  latest_quote_id text,
  latest_status text,
  latest_product_type text,
  assigned_rep_name text,
  rep_slug text,
  latest_activity_at timestamptz,
  first_seen_at timestamptz,
  quote_count bigint,
  active_quote_count bigint,
  archived_quote_count bigint,
  quote_data jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  perform public.require_active_admin_role(array['owner_admin', 'staff']);

  return query
  with normalized as (
    select
      qr.*,
      trim(coalesce(
        qr.quote_data ->> 'companyName',
        qr.quote_data ->> 'company_name',
        qr.quote_data ->> 'businessName',
        qr.quote_data ->> 'business_name',
        ''
      )) as crm_company_name,
      coalesce(
        nullif('phone:' || regexp_replace(coalesce(qr.customer_phone, ''), '[^0-9]', '', 'g'), 'phone:'),
        nullif('email:' || lower(trim(coalesce(qr.customer_email, ''))), 'email:'),
        'name:' || lower(trim(coalesce(qr.customer_name, '')))
          || '|company:' || lower(trim(coalesce(
            qr.quote_data ->> 'companyName',
            qr.quote_data ->> 'company_name',
            qr.quote_data ->> 'businessName',
            qr.quote_data ->> 'business_name',
            ''
          )))
      ) as crm_client_key
    from public.quote_requests qr
  ),
  grouped as (
    select
      n.crm_client_key,
      (array_agg(n.id order by n.created_at desc))[1] as latest_quote_request_id,
      (array_agg(nullif(trim(n.customer_name), '') order by n.created_at desc)
        filter (where nullif(trim(n.customer_name), '') is not null))[1] as latest_customer_name,
      (array_agg(nullif(n.crm_company_name, '') order by n.created_at desc)
        filter (where nullif(n.crm_company_name, '') is not null))[1] as latest_company_name,
      (array_agg(nullif(trim(n.customer_email), '') order by n.created_at desc)
        filter (where nullif(trim(n.customer_email), '') is not null))[1] as latest_customer_email,
      (array_agg(nullif(trim(n.customer_phone), '') order by n.created_at desc)
        filter (where nullif(trim(n.customer_phone), '') is not null))[1] as latest_customer_phone,
      (array_agg(nullif(trim(n.preferred_contact), '') order by n.created_at desc)
        filter (where nullif(trim(n.preferred_contact), '') is not null))[1] as latest_preferred_contact,
      (array_agg(n.quote_id order by n.created_at desc))[1] as latest_quote_id_value,
      (array_agg(n.status order by n.created_at desc))[1] as latest_status_value,
      (array_agg(coalesce(nullif(trim(n.product_type), ''), nullif(trim(n.quote_data ->> 'productType'), ''), 'wrap')
        order by n.created_at desc))[1] as latest_product_type_value,
      (array_agg(nullif(trim(n.assigned_rep_name), '') order by n.created_at desc)
        filter (where nullif(trim(n.assigned_rep_name), '') is not null))[1] as latest_assigned_rep_name,
      (array_agg(nullif(trim(n.rep_slug), '') order by n.created_at desc)
        filter (where nullif(trim(n.rep_slug), '') is not null))[1] as latest_rep_slug,
      max(n.created_at) as latest_activity,
      min(n.created_at) as first_seen,
      count(*) as total_quotes,
      count(*) filter (where n.archived_at is null) as active_quotes,
      count(*) filter (where n.archived_at is not null) as archived_quotes,
      (array_agg(n.quote_data order by n.created_at desc))[1] as latest_quote_data
    from normalized n
    group by n.crm_client_key
  )
  select
    g.crm_client_key,
    g.latest_quote_request_id,
    coalesce(g.latest_customer_name, 'Unnamed customer'),
    coalesce(g.latest_company_name, ''),
    coalesce(g.latest_customer_email, ''),
    g.latest_customer_phone,
    g.latest_preferred_contact,
    g.latest_quote_id_value,
    coalesce(g.latest_status_value, 'new'),
    coalesce(g.latest_product_type_value, 'wrap'),
    g.latest_assigned_rep_name,
    g.latest_rep_slug,
    g.latest_activity,
    g.first_seen,
    g.total_quotes,
    g.active_quotes,
    g.archived_quotes,
    coalesce(g.latest_quote_data, '{}'::jsonb)
  from grouped g
  order by g.latest_activity desc;
end;
$function$;

revoke all on function public.get_crm_clients() from public;
revoke all on function public.get_crm_clients() from anon;
grant execute on function public.get_crm_clients() to authenticated;

comment on function public.get_crm_clients() is
  'Returns one CRM row per normalized customer across active and archived quote/job records for approved owner and staff accounts.';
