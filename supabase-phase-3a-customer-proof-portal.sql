-- SlapWrapz CRM
-- Phase 3A - Customer Proof Portal MVP
--
-- Adds a narrow customer proof surface tied to the existing quote/admin system.
-- Admin remains source of truth. Public functions expose only proof-safe fields.

begin;

create extension if not exists pgcrypto;

alter table public.quote_requests
  add column if not exists customer_proof_image_url text,
  add column if not exists customer_proof_payment_url text,
  add column if not exists customer_proof_status text not null default 'pending'
    check (customer_proof_status in ('pending', 'approved', 'changes_requested')),
  add column if not exists customer_proof_approved_at timestamptz,
  add column if not exists customer_proof_revision_requested_at timestamptz,
  add column if not exists customer_proof_revision_message text;

create table if not exists public.quote_customer_proof_tokens (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  token text not null unique,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create unique index if not exists quote_customer_proof_tokens_quote_request_id_idx
  on public.quote_customer_proof_tokens (quote_request_id);

create index if not exists quote_customer_proof_tokens_token_idx
  on public.quote_customer_proof_tokens (token);

alter table public.quote_customer_proof_tokens enable row level security;

drop function if exists public.upsert_customer_proof_portal_admin(uuid, text, text);
create or replace function public.upsert_customer_proof_portal_admin(
  p_quote_request_id uuid,
  p_proof_image_url text,
  p_payment_url text
)
returns table (
  quote_request_id uuid,
  customer_proof_token text,
  customer_proof_image_url text,
  customer_proof_payment_url text,
  customer_proof_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quote_id uuid;
  v_token text;
begin
  perform public.require_active_admin_role(array['owner_admin', 'staff']);

  select qr.id
    into v_quote_id
  from public.quote_requests qr
  where qr.id = p_quote_request_id
  for update;

  if v_quote_id is null then
    raise exception 'Quote request not found.';
  end if;

  update public.quote_requests qr
  set
    customer_proof_image_url = nullif(trim(coalesce(p_proof_image_url, '')), ''),
    customer_proof_payment_url = nullif(trim(coalesce(p_payment_url, '')), '')
  where qr.id = p_quote_request_id;

  select qcpt.token
    into v_token
  from public.quote_customer_proof_tokens qcpt
  where qcpt.quote_request_id = p_quote_request_id
  limit 1;

  if v_token is null then
    v_token := encode(gen_random_bytes(24), 'hex');

    insert into public.quote_customer_proof_tokens (
      quote_request_id,
      token,
      status
    )
    values (
      p_quote_request_id,
      v_token,
      'active'
    );
  else
    update public.quote_customer_proof_tokens qcpt
    set status = 'active'
    where qcpt.quote_request_id = p_quote_request_id;
  end if;

  insert into public.quote_status_events (
    quote_request_id,
    event_type,
    status,
    message
  )
  values (
    p_quote_request_id,
    'customer_proof_portal_updated',
    (select qr.status from public.quote_requests qr where qr.id = p_quote_request_id),
    'Phase 3A customer proof portal updated.'
  );

  return query
  select
    qr.id,
    v_token,
    qr.customer_proof_image_url,
    qr.customer_proof_payment_url,
    qr.customer_proof_status
  from public.quote_requests qr
  where qr.id = p_quote_request_id;
end;
$$;

drop function if exists public.get_customer_proof_portal_public(text);
create or replace function public.get_customer_proof_portal_public(p_token text)
returns table (
  valid boolean,
  quote_id text,
  customer_first_name text,
  customer_phase text,
  proof_image_url text,
  payment_url text,
  proof_status text,
  approved_at timestamptz,
  revision_requested_at timestamptz,
  revision_message text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if trim(coalesce(p_token, '')) = '' then
    return query
    select false, null::text, null::text, null::text, null::text, null::text, null::text, null::timestamptz, null::timestamptz, null::text;
    return;
  end if;

  update public.quote_customer_proof_tokens qcpt
  set last_used_at = now()
  where qcpt.token = trim(p_token)
    and qcpt.status = 'active';

  return query
  select
    true,
    qr.quote_id,
    nullif(split_part(trim(qr.customer_name), ' ', 1), ''),
    qr.status,
    qr.customer_proof_image_url,
    qr.customer_proof_payment_url,
    qr.customer_proof_status,
    qr.customer_proof_approved_at,
    qr.customer_proof_revision_requested_at,
    qr.customer_proof_revision_message
  from public.quote_customer_proof_tokens qcpt
  join public.quote_requests qr on qr.id = qcpt.quote_request_id
  where qcpt.token = trim(p_token)
    and qcpt.status = 'active'
  limit 1;

  if not found then
    return query
    select false, null::text, null::text, null::text, null::text, null::text, null::text, null::timestamptz, null::timestamptz, null::text;
  end if;
end;
$$;

drop function if exists public.submit_customer_proof_action_public(text, text, text);
create or replace function public.submit_customer_proof_action_public(
  p_token text,
  p_action text,
  p_revision_message text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quote_request_id uuid;
  v_current_status text;
  v_revision_message text;
begin
  if p_action not in ('approved', 'changes_requested') then
    raise exception 'Invalid proof action.';
  end if;

  select qr.id, qr.status
    into v_quote_request_id, v_current_status
  from public.quote_customer_proof_tokens qcpt
  join public.quote_requests qr on qr.id = qcpt.quote_request_id
  where qcpt.token = trim(coalesce(p_token, ''))
    and qcpt.status = 'active'
  limit 1
  for update of qr;

  if v_quote_request_id is null then
    raise exception 'Proof link is invalid or no longer available.';
  end if;

  if p_action = 'approved' then
    update public.quote_requests qr
    set
      customer_proof_status = 'approved',
      customer_proof_approved_at = now(),
      customer_proof_revision_requested_at = null,
      customer_proof_revision_message = null
    where qr.id = v_quote_request_id;

    insert into public.quote_status_events (
      quote_request_id,
      event_type,
      status,
      message
    )
    values (
      v_quote_request_id,
      'customer_proof_approved',
      'approved',
      'Customer approved proof from private proof link.'
    );

    return;
  end if;

  v_revision_message := trim(coalesce(p_revision_message, ''));

  if v_revision_message = '' then
    raise exception 'Revision request message is required.';
  end if;

  if length(v_revision_message) > 2000 then
    raise exception 'Revision request message is too long.';
  end if;

  update public.quote_requests qr
  set
    customer_proof_status = 'changes_requested',
    customer_proof_revision_requested_at = now(),
    customer_proof_revision_message = v_revision_message
  where qr.id = v_quote_request_id;

  insert into public.quote_status_events (
    quote_request_id,
    event_type,
    status,
    message
  )
  values (
    v_quote_request_id,
    'customer_proof_revision_requested',
    v_current_status,
    'Customer requested proof changes: ' || v_revision_message
  );
end;
$$;

drop function if exists public.get_admin_quote_request_detail(uuid);
create or replace function public.get_admin_quote_request_detail(quote_request_id uuid)
 returns table(
  id uuid,
  quote_id text,
  customer_name text,
  customer_email text,
  customer_phone text,
  preferred_contact text,
  rep_slug text,
  rep_email text,
  assigned_rep_name text,
  status text,
  product_type text,
  quote_data jsonb,
  uploaded_files jsonb,
  customer_proof_token text,
  customer_proof_image_url text,
  customer_proof_payment_url text,
  customer_proof_status text,
  customer_proof_approved_at timestamp with time zone,
  customer_proof_revision_requested_at timestamp with time zone,
  customer_proof_revision_message text,
  created_at timestamp with time zone
 )
 language plpgsql
 security definer
 set search_path to public, pg_temp
as $function$
begin
  perform public.require_active_admin_role(array['owner_admin', 'staff']);

  return query
  select
    qr.id,
    qr.quote_id,
    qr.customer_name,
    qr.customer_email,
    qr.customer_phone,
    qr.preferred_contact,
    qr.rep_slug,
    qr.rep_email,
    qr.assigned_rep_name,
    qr.status,
    qr.product_type,
    qr.quote_data,
    qr.uploaded_files,
    qcpt.token as customer_proof_token,
    qr.customer_proof_image_url,
    qr.customer_proof_payment_url,
    qr.customer_proof_status,
    qr.customer_proof_approved_at,
    qr.customer_proof_revision_requested_at,
    qr.customer_proof_revision_message,
    qr.created_at
  from public.quote_requests qr
  left join public.quote_customer_proof_tokens qcpt
    on qcpt.quote_request_id = qr.id
   and qcpt.status = 'active'
  where qr.id = get_admin_quote_request_detail.quote_request_id
  limit 1;
end;
$function$;

revoke all on function public.upsert_customer_proof_portal_admin(uuid, text, text) from public;
revoke all on function public.upsert_customer_proof_portal_admin(uuid, text, text) from anon;
grant execute on function public.upsert_customer_proof_portal_admin(uuid, text, text) to authenticated;

revoke all on function public.get_customer_proof_portal_public(text) from public;
grant execute on function public.get_customer_proof_portal_public(text) to anon, authenticated;

revoke all on function public.submit_customer_proof_action_public(text, text, text) from public;
grant execute on function public.submit_customer_proof_action_public(text, text, text) to anon, authenticated;

revoke all on function public.get_admin_quote_request_detail(uuid) from public;
revoke all on function public.get_admin_quote_request_detail(uuid) from anon;
grant execute on function public.get_admin_quote_request_detail(uuid) to authenticated;

commit;
