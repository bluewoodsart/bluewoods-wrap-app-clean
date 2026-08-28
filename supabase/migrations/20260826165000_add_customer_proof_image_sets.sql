create table if not exists public.customer_proof_images (
  id uuid primary key default extensions.gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  image_url text not null,
  original_filename text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_proof_images_nonnegative_sort check (sort_order >= 0)
);

create index if not exists customer_proof_images_quote_order_idx
  on public.customer_proof_images (quote_request_id, is_active, sort_order, created_at);

alter table public.customer_proof_images enable row level security;
revoke all on public.customer_proof_images from anon, authenticated;

create or replace function public.get_customer_proof_images_json(p_quote_request_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', cpi.id,
        'image_url', cpi.image_url,
        'original_filename', cpi.original_filename,
        'sort_order', cpi.sort_order,
        'created_at', cpi.created_at
      )
      order by cpi.sort_order, cpi.created_at
    ),
    '[]'::jsonb
  )
  from public.customer_proof_images cpi
  where cpi.quote_request_id = p_quote_request_id
    and cpi.is_active = true;
$$;

revoke execute on function public.get_customer_proof_images_json(uuid) from public, anon, authenticated;

create or replace function public.list_customer_proof_images_admin(p_quote_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_active_admin_role(array['owner_admin', 'staff']);

  if not exists (
    select 1 from public.quote_requests qr where qr.id = p_quote_request_id
  ) then
    raise exception 'Quote request not found.';
  end if;

  return public.get_customer_proof_images_json(p_quote_request_id);
end;
$$;

revoke execute on function public.list_customer_proof_images_admin(uuid) from public, anon;
grant execute on function public.list_customer_proof_images_admin(uuid) to authenticated;

create or replace function public.add_customer_proof_image_admin(
  p_quote_request_id uuid,
  p_image_url text,
  p_original_filename text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sort_order integer;
  v_image_url text;
begin
  perform public.require_active_admin_role(array['owner_admin', 'staff']);

  v_image_url := nullif(trim(coalesce(p_image_url, '')), '');
  if v_image_url is null then
    raise exception 'Proof image URL is required.';
  end if;

  if not exists (
    select 1 from public.quote_requests qr where qr.id = p_quote_request_id for update
  ) then
    raise exception 'Quote request not found.';
  end if;

  select coalesce(max(cpi.sort_order), -1) + 1
    into v_sort_order
  from public.customer_proof_images cpi
  where cpi.quote_request_id = p_quote_request_id
    and cpi.is_active = true;

  if v_sort_order >= 50 then
    raise exception 'A proof set can include up to 50 images.';
  end if;

  insert into public.customer_proof_images (
    quote_request_id,
    image_url,
    original_filename,
    sort_order,
    created_by
  )
  values (
    p_quote_request_id,
    v_image_url,
    nullif(trim(coalesce(p_original_filename, '')), ''),
    v_sort_order,
    auth.uid()
  );

  update public.quote_requests qr
  set
    customer_proof_image_url = coalesce(qr.customer_proof_image_url, v_image_url),
    customer_proof_status = 'pending',
    customer_proof_approved_at = null,
    customer_proof_revision_requested_at = null,
    customer_proof_revision_message = null
  where qr.id = p_quote_request_id;

  insert into public.quote_status_events (
    quote_request_id,
    event_type,
    status,
    message
  )
  values (
    p_quote_request_id,
    'customer_proof_image_added',
    (select qr.status from public.quote_requests qr where qr.id = p_quote_request_id),
    'Proof image added to the current proof set. Approval reset to pending.'
  );

  return public.get_customer_proof_images_json(p_quote_request_id);
end;
$$;

revoke execute on function public.add_customer_proof_image_admin(uuid, text, text) from public, anon;
grant execute on function public.add_customer_proof_image_admin(uuid, text, text) to authenticated;

create or replace function public.remove_customer_proof_image_admin(
  p_quote_request_id uuid,
  p_proof_image_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_active_admin_role(array['owner_admin', 'staff']);

  update public.customer_proof_images cpi
  set is_active = false, updated_at = now()
  where cpi.id = p_proof_image_id
    and cpi.quote_request_id = p_quote_request_id
    and cpi.is_active = true;

  if not found then
    raise exception 'Proof image not found.';
  end if;

  update public.quote_requests qr
  set
    customer_proof_status = 'pending',
    customer_proof_approved_at = null
  where qr.id = p_quote_request_id;

  return public.get_customer_proof_images_json(p_quote_request_id);
end;
$$;

revoke execute on function public.remove_customer_proof_image_admin(uuid, uuid) from public, anon;
grant execute on function public.remove_customer_proof_image_admin(uuid, uuid) to authenticated;

create or replace function public.get_customer_proof_images_public(p_token text)
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

  return public.get_customer_proof_images_json(v_quote_request_id);
end;
$$;

revoke execute on function public.get_customer_proof_images_public(text) from public;
grant execute on function public.get_customer_proof_images_public(text) to anon, authenticated;

insert into public.customer_proof_images (
  quote_request_id,
  image_url,
  original_filename,
  sort_order,
  created_by
)
select
  qr.id,
  qr.customer_proof_image_url,
  null,
  0,
  null
from public.quote_requests qr
where nullif(trim(coalesce(qr.customer_proof_image_url, '')), '') is not null
  and not exists (
    select 1
    from public.customer_proof_images cpi
    where cpi.quote_request_id = qr.id
      and cpi.image_url = qr.customer_proof_image_url
  );
