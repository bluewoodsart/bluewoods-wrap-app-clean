-- Persistent, token-protected customer quote/invoice workflow.
-- Rep access is assignment-scoped. Public access requires an unguessable token.

create table if not exists public.quote_invoices (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null unique references public.quote_requests(id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  invoice_data jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  tested_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quote_invoices_token_idx on public.quote_invoices(token);
alter table public.quote_invoices enable row level security;

revoke all on table public.quote_invoices from public, anon, authenticated;

create or replace function public.get_quote_invoice_rep_v1(p_quote_request_id uuid)
returns table (
  token text,
  invoice_data jsonb,
  status text,
  tested_at timestamptz,
  approved_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.admin_users%rowtype;
begin
  select * into v_user
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role in ('owner_admin', 'staff', 'sales_rep', 'rep_manager')
  limit 1;

  if v_user.id is null then
    raise exception 'Active staff access is required.';
  end if;

  if not exists (
    select 1
    from public.quote_requests qr
    where qr.id = p_quote_request_id
      and (
        v_user.role in ('owner_admin', 'staff')
        or lower(trim(coalesce(qr.rep_slug, ''))) = lower(trim(coalesce(v_user.rep_slug, '')))
        or (
          v_user.role = 'rep_manager'
          and exists (
            select 1
            from public.admin_users child
            where child.manager_admin_user_id = v_user.id
              and child.is_active = true
              and lower(trim(coalesce(child.rep_slug, ''))) = lower(trim(coalesce(qr.rep_slug, '')))
          )
        )
      )
  ) then
    raise exception 'This quote is not available to your account.';
  end if;

  return query
  select qi.token, qi.invoice_data, qi.status, qi.tested_at, qi.approved_at
  from public.quote_invoices qi
  where qi.quote_request_id = p_quote_request_id;
end;
$$;

create or replace function public.upsert_quote_invoice_rep_v1(
  p_quote_request_id uuid,
  p_invoice_data jsonb
)
returns table (
  token text,
  invoice_data jsonb,
  status text,
  tested_at timestamptz,
  approved_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.admin_users%rowtype;
  v_deposit numeric;
  v_paypal_url text;
begin
  if p_invoice_data is null or jsonb_typeof(p_invoice_data) <> 'object' then
    raise exception 'Invoice data must be an object.';
  end if;

  if jsonb_typeof(coalesce(p_invoice_data->'lineItems', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_invoice_data->'lineItems', '[]'::jsonb)) < 1
     or jsonb_array_length(coalesce(p_invoice_data->'lineItems', '[]'::jsonb)) > 20 then
    raise exception 'Add between 1 and 20 invoice line items.';
  end if;

  v_deposit := coalesce(nullif(p_invoice_data->>'depositPercent', '')::numeric, 50);
  if v_deposit < 0 or v_deposit > 100 then
    raise exception 'Deposit percentage must be between 0 and 100.';
  end if;

  v_paypal_url := trim(coalesce(p_invoice_data->>'paypalUrl', ''));
  if v_paypal_url <> '' and v_paypal_url !~* '^https://(www\.)?paypal\.com/' and v_paypal_url !~* '^https://paypal\.me/' then
    raise exception 'Use a complete PayPal or PayPal.Me https link.';
  end if;

  if length(coalesce(p_invoice_data->>'notes', '')) > 5000
     or length(coalesce(p_invoice_data->>'terms', '')) > 5000 then
    raise exception 'Notes and terms must each be 5,000 characters or fewer.';
  end if;

  select * into v_user
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role in ('owner_admin', 'staff', 'sales_rep', 'rep_manager')
  limit 1;

  if v_user.id is null then
    raise exception 'Active staff access is required.';
  end if;

  if not exists (
    select 1
    from public.quote_requests qr
    where qr.id = p_quote_request_id
      and (
        v_user.role in ('owner_admin', 'staff')
        or lower(trim(coalesce(qr.rep_slug, ''))) = lower(trim(coalesce(v_user.rep_slug, '')))
        or (
          v_user.role = 'rep_manager'
          and exists (
            select 1
            from public.admin_users child
            where child.manager_admin_user_id = v_user.id
              and child.is_active = true
              and lower(trim(coalesce(child.rep_slug, ''))) = lower(trim(coalesce(qr.rep_slug, '')))
          )
        )
      )
  ) then
    raise exception 'This quote is not available to your account.';
  end if;

  insert into public.quote_invoices (
    quote_request_id,
    invoice_data,
    status,
    tested_at,
    approved_at,
    approved_by,
    updated_at
  )
  values (
    p_quote_request_id,
    p_invoice_data,
    'draft',
    null,
    null,
    null,
    now()
  )
  on conflict (quote_request_id) do update
  set invoice_data = excluded.invoice_data,
      status = 'draft',
      tested_at = null,
      approved_at = null,
      approved_by = null,
      updated_at = now();

  return query
  select qi.token, qi.invoice_data, qi.status, qi.tested_at, qi.approved_at
  from public.quote_invoices qi
  where qi.quote_request_id = p_quote_request_id;
end;
$$;

create or replace function public.approve_quote_invoice_rep_v1(
  p_quote_request_id uuid,
  p_confirm_tested boolean
)
returns table (
  token text,
  status text,
  tested_at timestamptz,
  approved_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.admin_users%rowtype;
  v_invoice public.quote_invoices%rowtype;
  v_line_total numeric;
begin
  if p_confirm_tested is not true then
    raise exception 'Confirm desktop and phone testing before approval.';
  end if;

  select * into v_user
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role in ('owner_admin', 'staff', 'sales_rep', 'rep_manager')
  limit 1;

  if v_user.id is null then
    raise exception 'Active staff access is required.';
  end if;

  select qi.* into v_invoice
  from public.quote_invoices qi
  join public.quote_requests qr on qr.id = qi.quote_request_id
  where qi.quote_request_id = p_quote_request_id
    and (
      v_user.role in ('owner_admin', 'staff')
      or lower(trim(coalesce(qr.rep_slug, ''))) = lower(trim(coalesce(v_user.rep_slug, '')))
      or (
        v_user.role = 'rep_manager'
        and exists (
          select 1
          from public.admin_users child
          where child.manager_admin_user_id = v_user.id
            and child.is_active = true
            and lower(trim(coalesce(child.rep_slug, ''))) = lower(trim(coalesce(qr.rep_slug, '')))
        )
      )
    );

  if v_invoice.id is null then
    raise exception 'Save the invoice draft before approval.';
  end if;

  if trim(coalesce(v_invoice.invoice_data->>'paypalUrl', '')) = '' then
    raise exception 'Add the PayPal payment link before approval.';
  end if;

  select coalesce(sum(
    greatest(coalesce(nullif(item->>'quantity', '')::numeric, 0), 0)
    * greatest(coalesce(nullif(item->>'rate', '')::numeric, 0), 0)
  ), 0)
  into v_line_total
  from jsonb_array_elements(coalesce(v_invoice.invoice_data->'lineItems', '[]'::jsonb)) item;

  if v_line_total <= 0 then
    raise exception 'Add valid quantities and rates before approval.';
  end if;

  return query
  update public.quote_invoices qi
  set status = 'approved',
      tested_at = now(),
      approved_at = now(),
      approved_by = v_user.id,
      updated_at = now()
  where qi.id = v_invoice.id
  returning qi.token, qi.status, qi.tested_at, qi.approved_at;
end;
$$;

create or replace function public.get_quote_invoice_public_v1(p_token text)
returns table (
  valid boolean,
  invoice_data jsonb,
  status text,
  order_number text,
  customer_name text,
  customer_company text,
  project_description text,
  approved_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    true,
    qi.invoice_data,
    qi.status,
    qr.quote_id,
    qr.customer_name,
    nullif(trim(coalesce(qr.quote_data->>'companyName', '')), ''),
    coalesce(
      nullif(trim(coalesce(qi.invoice_data->>'projectDescription', '')), ''),
      nullif(trim(coalesce(qr.quote_data->>'manualVehicleDescription', '')), ''),
      nullif(trim(coalesce(qr.quote_data->>'selectedService', '')), ''),
      'Custom vehicle wrap project'
    ),
    qi.approved_at
  from public.quote_invoices qi
  join public.quote_requests qr on qr.id = qi.quote_request_id
  where qi.token = trim(p_token)
  limit 1;
$$;

revoke all on function public.get_quote_invoice_rep_v1(uuid) from public, anon;
revoke all on function public.upsert_quote_invoice_rep_v1(uuid, jsonb) from public, anon;
revoke all on function public.approve_quote_invoice_rep_v1(uuid, boolean) from public, anon;
revoke all on function public.get_quote_invoice_public_v1(text) from public;

grant execute on function public.get_quote_invoice_rep_v1(uuid) to authenticated;
grant execute on function public.upsert_quote_invoice_rep_v1(uuid, jsonb) to authenticated;
grant execute on function public.approve_quote_invoice_rep_v1(uuid, boolean) to authenticated;
grant execute on function public.get_quote_invoice_public_v1(text) to anon, authenticated;
