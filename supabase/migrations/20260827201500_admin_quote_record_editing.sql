-- Allow authenticated owner/staff admins to correct an existing quote record.
-- This updates the same CRM quote instead of creating a duplicate request.

create or replace function public.update_quote_record_admin(
  p_quote_request_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_preferred_contact text,
  p_quote_data jsonb
)
returns table (
  id uuid,
  quote_id text,
  customer_name text,
  customer_email text,
  customer_phone text,
  preferred_contact text,
  product_type text,
  quote_data jsonb
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_previous public.quote_requests%rowtype;
  v_customer_name text := trim(coalesce(p_customer_name, ''));
  v_customer_email text := trim(coalesce(p_customer_email, ''));
  v_customer_phone text := trim(coalesce(p_customer_phone, ''));
  v_preferred_contact text := lower(trim(coalesce(p_preferred_contact, '')));
  v_next_quote_data jsonb := coalesce(p_quote_data, '{}'::jsonb);
  v_previous_company text;
  v_next_company text;
  v_changed_fields text[] := array[]::text[];
  v_actor text := 'Admin';
begin
  perform public.require_active_admin_role(array['owner_admin', 'staff']);

  if length(v_customer_name) < 1 or length(v_customer_name) > 200 then
    raise exception 'Customer name is required and must be 200 characters or fewer.';
  end if;

  if length(v_customer_email) < 3 or length(v_customer_email) > 320 or position('@' in v_customer_email) < 2 then
    raise exception 'Enter a valid customer email address.';
  end if;

  if length(v_customer_phone) < 7 or length(v_customer_phone) > 50 then
    raise exception 'Customer phone is required and must be between 7 and 50 characters.';
  end if;

  if v_preferred_contact not in ('email', 'text', 'call') then
    raise exception 'Preferred contact must be email, text, or call.';
  end if;

  if jsonb_typeof(v_next_quote_data) <> 'object' then
    raise exception 'Quote details must be a JSON object.';
  end if;

  if pg_column_size(v_next_quote_data) > 524288 then
    raise exception 'Quote details are too large to save.';
  end if;

  select qr.*
    into v_previous
  from public.quote_requests qr
  where qr.id = p_quote_request_id
  for update;

  if v_previous.id is null then
    raise exception 'Quote request not found: %', p_quote_request_id;
  end if;

  v_previous_company := trim(coalesce(
    v_previous.quote_data ->> 'companyName',
    v_previous.quote_data ->> 'company_name',
    v_previous.quote_data ->> 'businessName',
    v_previous.quote_data ->> 'business_name',
    ''
  ));

  v_next_company := trim(coalesce(
    v_next_quote_data ->> 'companyName',
    v_next_quote_data ->> 'company_name',
    v_next_quote_data ->> 'businessName',
    v_next_quote_data ->> 'business_name',
    ''
  ));

  if length(v_next_company) > 200 then
    raise exception 'Company name must be 200 characters or fewer.';
  end if;

  -- Keep CRM identity fields canonical even if older quote flows used aliases.
  v_next_quote_data := v_next_quote_data
    - 'company_name'
    - 'businessName'
    - 'business_name';
  v_next_quote_data := jsonb_set(v_next_quote_data, '{companyName}', to_jsonb(v_next_company), true);
  v_next_quote_data := jsonb_set(
    v_next_quote_data,
    '{quoteId}',
    to_jsonb(coalesce(v_previous.quote_id, v_next_quote_data ->> 'quoteId', '')),
    true
  );
  v_next_quote_data := jsonb_set(
    v_next_quote_data,
    '{productType}',
    to_jsonb(coalesce(nullif(trim(v_previous.product_type), ''), 'wrap')),
    true
  );

  if v_previous.customer_name is distinct from v_customer_name then
    v_changed_fields := array_append(v_changed_fields, 'customer name');
  end if;
  if v_previous_company is distinct from v_next_company then
    v_changed_fields := array_append(v_changed_fields, 'company');
  end if;
  if v_previous.customer_email is distinct from v_customer_email then
    v_changed_fields := array_append(v_changed_fields, 'email');
  end if;
  if v_previous.customer_phone is distinct from v_customer_phone then
    v_changed_fields := array_append(v_changed_fields, 'phone');
  end if;
  if v_previous.preferred_contact is distinct from v_preferred_contact then
    v_changed_fields := array_append(v_changed_fields, 'preferred contact');
  end if;
  if coalesce(v_previous.quote_data, '{}'::jsonb) is distinct from v_next_quote_data then
    v_changed_fields := array_append(v_changed_fields, 'quote details');
  end if;

  update public.quote_requests qr
  set
    customer_name = v_customer_name,
    customer_email = v_customer_email,
    customer_phone = v_customer_phone,
    preferred_contact = v_preferred_contact,
    quote_data = v_next_quote_data
  where qr.id = p_quote_request_id;

  if v_previous.quote_id is not null then
    update public.customer_files cf
    set
      customer_name = v_customer_name,
      customer_email = v_customer_email,
      customer_phone = v_customer_phone,
      preferred_contact = v_preferred_contact
    where cf.quote_id = v_previous.quote_id;
  end if;

  select coalesce(nullif(trim(au.display_name), ''), nullif(trim(au.email), ''), 'Admin')
    into v_actor
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
  limit 1;

  if coalesce(array_length(v_changed_fields, 1), 0) > 0 then
    insert into public.quote_status_events (
      quote_request_id,
      event_type,
      message
    )
    values (
      p_quote_request_id,
      'quote_record_updated',
      'Quote record updated by ' || coalesce(v_actor, 'Admin') || ': ' || array_to_string(v_changed_fields, ', ')
    );
  end if;

  return query
  select
    qr.id,
    qr.quote_id,
    qr.customer_name,
    qr.customer_email,
    qr.customer_phone,
    qr.preferred_contact,
    qr.product_type,
    qr.quote_data
  from public.quote_requests qr
  where qr.id = p_quote_request_id;
end;
$$;

revoke all on function public.update_quote_record_admin(uuid, text, text, text, text, jsonb) from public;
revoke execute on function public.update_quote_record_admin(uuid, text, text, text, text, jsonb) from anon;
grant execute on function public.update_quote_record_admin(uuid, text, text, text, text, jsonb) to authenticated;

comment on function public.update_quote_record_admin(uuid, text, text, text, text, jsonb)
is 'Owner/staff admin RPC for audited corrections to an existing CRM quote record.';
