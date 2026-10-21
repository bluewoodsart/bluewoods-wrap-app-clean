-- Allow staff to publish quotes before a payment link is available.
-- Existing staff scope, confirmation, and positive-total checks remain unchanged.

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

