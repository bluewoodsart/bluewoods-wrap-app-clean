create or replace function public.update_customer_contact_details_admin(
  p_quote_request_id uuid,
  p_customer_name text,
  p_company_name text,
  p_customer_email text,
  p_customer_phone text,
  p_preferred_contact text,
  p_customer_address jsonb,
  p_social_links jsonb,
  p_external_links jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user public.admin_users%rowtype;
  v_quote public.quote_requests%rowtype;
  v_quote_data jsonb;
begin
  select * into v_user
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
  limit 1;

  if v_user.id is null or v_user.role not in ('owner_admin', 'staff', 'sales_rep', 'rep_manager') then
    raise exception 'Active CRM access is required.';
  end if;

  select * into v_quote
  from public.quote_requests qr
  where qr.id = p_quote_request_id
  for update;

  if v_quote.id is null then
    raise exception 'Quote request not found.';
  end if;

  if v_user.role = 'sales_rep'
    and lower(trim(coalesce(v_quote.rep_slug, ''))) <> lower(trim(coalesce(v_user.rep_slug, ''))) then
    raise exception 'Sales reps may only edit their assigned customers.';
  end if;

  if v_user.role = 'rep_manager'
    and lower(trim(coalesce(v_quote.rep_slug, ''))) <> lower(trim(coalesce(v_user.rep_slug, '')))
    and not exists (
      select 1
      from public.admin_users child
      where child.manager_admin_user_id = v_user.id
        and child.is_active = true
        and lower(trim(coalesce(child.rep_slug, ''))) = lower(trim(coalesce(v_quote.rep_slug, '')))
    ) then
    raise exception 'Rep managers may only edit their own or assigned team customers.';
  end if;

  if trim(coalesce(p_customer_name, '')) = '' then
    raise exception 'Customer name is required.';
  end if;
  if length(trim(p_customer_name)) > 200 then
    raise exception 'Customer name is too long.';
  end if;
  if length(trim(coalesce(p_company_name, ''))) > 250 then
    raise exception 'Company name is too long.';
  end if;
  if length(trim(coalesce(p_customer_email, ''))) > 320 then
    raise exception 'Email address is too long.';
  end if;
  if trim(coalesce(p_customer_email, '')) <> ''
    and trim(p_customer_email) !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
    raise exception 'Enter a valid customer email address.';
  end if;
  if length(trim(coalesce(p_customer_phone, ''))) > 50 then
    raise exception 'Phone number is too long.';
  end if;
  if length(trim(coalesce(p_preferred_contact, ''))) > 40 then
    raise exception 'Preferred contact value is too long.';
  end if;
  if jsonb_typeof(coalesce(p_customer_address, '{}'::jsonb)) <> 'object' then
    raise exception 'Customer address must be an object.';
  end if;
  if jsonb_typeof(coalesce(p_social_links, '{}'::jsonb)) <> 'object' then
    raise exception 'Social links must be an object.';
  end if;
  if jsonb_typeof(coalesce(p_external_links, '[]'::jsonb)) <> 'array' then
    raise exception 'External links must be an array.';
  end if;
  if jsonb_array_length(coalesce(p_external_links, '[]'::jsonb)) > 30 then
    raise exception 'No more than 30 additional links may be saved.';
  end if;

  v_quote_data := coalesce(v_quote.quote_data, '{}'::jsonb) || jsonb_build_object(
    'companyName', left(trim(coalesce(p_company_name, '')), 250),
    'customerAddress', coalesce(p_customer_address, '{}'::jsonb),
    'socialLinks', coalesce(p_social_links, '{}'::jsonb),
    'externalLinks', coalesce(p_external_links, '[]'::jsonb),
    'customerAccountUpdatedAt', now(),
    'customerAccountUpdatedBy', v_user.id
  );

  update public.quote_requests qr
  set
    customer_name = trim(p_customer_name),
    customer_email = trim(coalesce(p_customer_email, '')),
    customer_phone = nullif(trim(coalesce(p_customer_phone, '')), ''),
    preferred_contact = nullif(trim(coalesce(p_preferred_contact, '')), ''),
    quote_data = v_quote_data
  where qr.id = p_quote_request_id;

  insert into public.quote_status_events (quote_request_id, event_type, status, message)
  values (
    p_quote_request_id,
    'customer_contact_updated',
    v_quote.status,
    'Customer and company information was corrected in the CRM.'
  );

  return jsonb_build_object(
    'customer_name', trim(p_customer_name),
    'customer_email', trim(coalesce(p_customer_email, '')),
    'customer_phone', nullif(trim(coalesce(p_customer_phone, '')), ''),
    'preferred_contact', nullif(trim(coalesce(p_preferred_contact, '')), ''),
    'quote_data', v_quote_data
  );
end;
$$;

revoke all on function public.update_customer_contact_details_admin(uuid, text, text, text, text, text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.update_customer_contact_details_admin(uuid, text, text, text, text, text, jsonb, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
