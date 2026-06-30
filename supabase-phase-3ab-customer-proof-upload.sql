-- SlapWrapz CRM
-- Phase 3A-B - Admin proof upload and active proof-state cleanup
--
-- Adds a proof-specific storage bucket and keeps proof status separate from
-- the admin-controlled quote/job phase.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-proofs',
  'customer-proofs',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Allow admin customer proof uploads" on storage.objects;
create policy "Allow admin customer proof uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'customer-proofs'
  and exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = auth.uid()
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);

drop policy if exists "Allow public customer proof reads" on storage.objects;
create policy "Allow public customer proof reads"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'customer-proofs');

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
  v_current_status text;
  v_existing_proof_image_url text;
  v_next_proof_image_url text;
  v_proof_image_changed boolean;
begin
  perform public.require_active_admin_role(array['owner_admin', 'staff']);

  select qr.id, qr.status, qr.customer_proof_image_url
    into v_quote_id, v_current_status, v_existing_proof_image_url
  from public.quote_requests qr
  where qr.id = p_quote_request_id
  for update;

  if v_quote_id is null then
    raise exception 'Quote request not found.';
  end if;

  v_next_proof_image_url := nullif(trim(coalesce(p_proof_image_url, '')), '');
  v_proof_image_changed := coalesce(v_existing_proof_image_url, '') <> coalesce(v_next_proof_image_url, '');

  update public.quote_requests qr
  set
    customer_proof_image_url = v_next_proof_image_url,
    customer_proof_payment_url = nullif(trim(coalesce(p_payment_url, '')), ''),
    customer_proof_status = case
      when v_proof_image_changed then 'pending'
      else qr.customer_proof_status
    end,
    customer_proof_approved_at = case
      when v_proof_image_changed then null
      else qr.customer_proof_approved_at
    end,
    customer_proof_revision_requested_at = case
      when v_proof_image_changed then null
      else qr.customer_proof_revision_requested_at
    end,
    customer_proof_revision_message = case
      when v_proof_image_changed then null
      else qr.customer_proof_revision_message
    end
  where qr.id = p_quote_request_id;

  select qcpt.token
    into v_token
  from public.quote_customer_proof_tokens qcpt
  where qcpt.quote_request_id = p_quote_request_id
  limit 1;

  if v_token is null then
    v_token := encode(extensions.gen_random_bytes(24), 'hex');

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
    case
      when v_proof_image_changed then 'customer_proof_uploaded'
      else 'customer_proof_portal_updated'
    end,
    v_current_status,
    case
      when v_proof_image_changed then 'New customer proof uploaded. Proof status reset to pending.'
      else 'Phase 3A customer proof portal updated.'
    end
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
      v_current_status,
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
    customer_proof_approved_at = null,
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

revoke all on function public.upsert_customer_proof_portal_admin(uuid, text, text) from public;
revoke all on function public.upsert_customer_proof_portal_admin(uuid, text, text) from anon;
grant execute on function public.upsert_customer_proof_portal_admin(uuid, text, text) to authenticated;

revoke all on function public.submit_customer_proof_action_public(text, text, text) from public;
grant execute on function public.submit_customer_proof_action_public(text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
