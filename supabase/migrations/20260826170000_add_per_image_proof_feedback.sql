create table if not exists public.customer_proof_feedback (
  id uuid primary key default extensions.gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  proof_image_id uuid references public.customer_proof_images(id) on delete set null,
  message text not null,
  created_at timestamptz not null default now(),
  constraint customer_proof_feedback_message_length check (
    length(trim(message)) between 1 and 2000
  )
);

create index if not exists customer_proof_feedback_quote_created_idx
  on public.customer_proof_feedback (quote_request_id, created_at);

alter table public.customer_proof_feedback enable row level security;
revoke all on public.customer_proof_feedback from anon, authenticated;

create or replace function public.get_customer_proof_feedback_json(p_quote_request_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', cpf.id,
        'proof_image_id', cpf.proof_image_id,
        'image_url', cpi.image_url,
        'original_filename', cpi.original_filename,
        'message', cpf.message,
        'created_at', cpf.created_at
      )
      order by cpf.created_at
    ),
    '[]'::jsonb
  )
  from public.customer_proof_feedback cpf
  left join public.customer_proof_images cpi on cpi.id = cpf.proof_image_id
  where cpf.quote_request_id = p_quote_request_id;
$$;

revoke execute on function public.get_customer_proof_feedback_json(uuid) from public, anon, authenticated;

create or replace function public.list_customer_proof_feedback_admin(p_quote_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_active_admin_role(array['owner_admin', 'staff']);

  if not exists (select 1 from public.quote_requests qr where qr.id = p_quote_request_id) then
    raise exception 'Quote request not found.';
  end if;

  return public.get_customer_proof_feedback_json(p_quote_request_id);
end;
$$;

revoke execute on function public.list_customer_proof_feedback_admin(uuid) from public, anon;
grant execute on function public.list_customer_proof_feedback_admin(uuid) to authenticated;

create or replace function public.get_customer_proof_feedback_public(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quote_request_id uuid;
begin
  select qcpt.quote_request_id
    into v_quote_request_id
  from public.quote_customer_proof_tokens qcpt
  where qcpt.token = trim(coalesce(p_token, ''))
    and qcpt.status = 'active'
  limit 1;

  if v_quote_request_id is null then
    return '[]'::jsonb;
  end if;

  return public.get_customer_proof_feedback_json(v_quote_request_id);
end;
$$;

revoke execute on function public.get_customer_proof_feedback_public(text) from public;
grant execute on function public.get_customer_proof_feedback_public(text) to anon, authenticated;

create or replace function public.submit_customer_proof_image_feedback_public(
  p_token text,
  p_proof_image_id uuid,
  p_revision_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quote_request_id uuid;
  v_current_status text;
  v_revision_message text;
  v_image_name text;
begin
  v_revision_message := trim(coalesce(p_revision_message, ''));
  if v_revision_message = '' then
    raise exception 'Revision request message is required.';
  end if;
  if length(v_revision_message) > 2000 then
    raise exception 'Revision request message is too long.';
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

  select coalesce(cpi.original_filename, 'Proof image ' || (cpi.sort_order + 1)::text)
    into v_image_name
  from public.customer_proof_images cpi
  where cpi.id = p_proof_image_id
    and cpi.quote_request_id = v_quote_request_id
    and cpi.is_active = true;

  if v_image_name is null then
    raise exception 'Selected proof image is not available.';
  end if;

  insert into public.customer_proof_feedback (
    quote_request_id,
    proof_image_id,
    message
  )
  values (
    v_quote_request_id,
    p_proof_image_id,
    v_revision_message
  );

  update public.quote_requests qr
  set
    customer_proof_status = 'changes_requested',
    customer_proof_approved_at = null,
    customer_proof_revision_requested_at = now(),
    customer_proof_revision_message = v_revision_message
  where qr.id = v_quote_request_id;

  insert into public.quote_status_events (quote_request_id, event_type, status, message)
  values (
    v_quote_request_id,
    'customer_proof_image_revision_requested',
    v_current_status,
    'Customer requested changes for ' || v_image_name || ': ' || v_revision_message
  );

  return public.get_customer_proof_feedback_json(v_quote_request_id);
end;
$$;

revoke execute on function public.submit_customer_proof_image_feedback_public(text, uuid, text) from public;
grant execute on function public.submit_customer_proof_image_feedback_public(text, uuid, text) to anon, authenticated;
