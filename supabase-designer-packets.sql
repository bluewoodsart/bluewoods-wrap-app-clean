-- Designer packet handoff for SlapWrapz quote production.
-- Run this in Supabase SQL editor before using the Designer Packet buttons live.

create extension if not exists pgcrypto;

create table if not exists public.designer_packets (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  designer_email text not null,
  designer_name text,
  instructions text not null,
  cloud_folder_url text,
  status text not null default 'sent'
    check (status in ('sent', 'in_design', 'proof_ready', 'needs_info', 'completed')),
  sent_at timestamptz default now(),
  created_by_admin_user_id uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.designer_packet_notes (
  id uuid primary key default gen_random_uuid(),
  designer_packet_id uuid not null references public.designer_packets(id) on delete cascade,
  author_type text not null check (author_type in ('admin', 'designer')),
  author_email text,
  note_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.designer_packet_files (
  id uuid primary key default gen_random_uuid(),
  designer_packet_id uuid not null references public.designer_packets(id) on delete cascade,
  customer_file_id uuid references public.customer_files(id) on delete set null,
  file_name text not null,
  file_url text not null,
  file_type text,
  file_size bigint,
  tags text[] not null default array['designer_proof']::text[],
  created_at timestamptz not null default now()
);

alter table public.designer_packets enable row level security;
alter table public.designer_packet_notes enable row level security;
alter table public.designer_packet_files enable row level security;

revoke all on public.designer_packets from anon, authenticated;
revoke all on public.designer_packet_notes from anon, authenticated;
revoke all on public.designer_packet_files from anon, authenticated;

create index if not exists designer_packets_quote_request_id_idx
  on public.designer_packets(quote_request_id);

create unique index if not exists designer_packets_quote_request_id_unique
  on public.designer_packets(quote_request_id);

create index if not exists designer_packets_token_idx
  on public.designer_packets(token);

create index if not exists designer_packet_notes_packet_idx
  on public.designer_packet_notes(designer_packet_id, created_at desc);

create index if not exists designer_packet_files_packet_idx
  on public.designer_packet_files(designer_packet_id, created_at desc);

create or replace function public.touch_designer_packets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_designer_packets_updated_at on public.designer_packets;
create trigger touch_designer_packets_updated_at
before update on public.designer_packets
for each row execute function public.touch_designer_packets_updated_at();

create or replace function public.is_current_user_owner_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = auth.uid()
      and au.role = 'owner_admin'
      and au.is_active = true
  );
$$;

revoke all on function public.is_current_user_owner_admin() from public;
grant execute on function public.is_current_user_owner_admin() to authenticated;

create or replace function public.get_designer_packet_admin(p_quote_request_id uuid)
returns table (
  id uuid,
  quote_request_id uuid,
  token text,
  designer_email text,
  designer_name text,
  instructions text,
  cloud_folder_url text,
  status text,
  sent_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  notes jsonb,
  files jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_owner_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  select
    dp.id,
    dp.quote_request_id,
    dp.token,
    dp.designer_email,
    dp.designer_name,
    dp.instructions,
    dp.cloud_folder_url,
    dp.status,
    dp.sent_at,
    dp.created_at,
    dp.updated_at,
    coalesce((
      select jsonb_agg(to_jsonb(dpn) order by dpn.created_at desc)
      from public.designer_packet_notes dpn
      where dpn.designer_packet_id = dp.id
    ), '[]'::jsonb) as notes,
    coalesce((
      select jsonb_agg(to_jsonb(dpf) order by dpf.created_at desc)
      from public.designer_packet_files dpf
      where dpf.designer_packet_id = dp.id
    ), '[]'::jsonb) as files
  from public.designer_packets dp
  where dp.quote_request_id = p_quote_request_id
  order by dp.created_at desc
  limit 1;
end;
$$;

create or replace function public.upsert_designer_packet_admin(
  p_quote_request_id uuid,
  p_designer_email text,
  p_designer_name text,
  p_instructions text,
  p_cloud_folder_url text default null
)
returns table (
  id uuid,
  quote_request_id uuid,
  token text,
  designer_email text,
  designer_name text,
  instructions text,
  cloud_folder_url text,
  status text,
  sent_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_user_id uuid;
begin
  if not public.is_current_user_owner_admin() then
    raise exception 'Not authorized';
  end if;

  select au.id into v_admin_user_id
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.role = 'owner_admin'
    and au.is_active = true
  limit 1;

  if nullif(trim(p_designer_email), '') is null then
    raise exception 'Designer email is required';
  end if;

  if nullif(trim(p_instructions), '') is null then
    raise exception 'Designer instructions are required';
  end if;

  insert into public.designer_packets (
    quote_request_id,
    designer_email,
    designer_name,
    instructions,
    cloud_folder_url,
    status,
    sent_at,
    created_by_admin_user_id
  )
  values (
    p_quote_request_id,
    trim(p_designer_email),
    nullif(trim(coalesce(p_designer_name, '')), ''),
    trim(p_instructions),
    nullif(trim(coalesce(p_cloud_folder_url, '')), ''),
    'sent',
    now(),
    v_admin_user_id
  )
  on conflict (quote_request_id)
  do update set
    designer_email = excluded.designer_email,
    designer_name = excluded.designer_name,
    instructions = excluded.instructions,
    cloud_folder_url = excluded.cloud_folder_url,
    status = 'sent',
    sent_at = now()
  returning
    designer_packets.id,
    designer_packets.quote_request_id,
    designer_packets.token,
    designer_packets.designer_email,
    designer_packets.designer_name,
    designer_packets.instructions,
    designer_packets.cloud_folder_url,
    designer_packets.status,
    designer_packets.sent_at,
    designer_packets.created_at,
    designer_packets.updated_at
  into
    id,
    quote_request_id,
    token,
    designer_email,
    designer_name,
    instructions,
    cloud_folder_url,
    status,
    sent_at,
    created_at,
    updated_at;

  insert into public.designer_packet_notes (designer_packet_id, author_type, author_email, note_text)
  values (id, 'admin', null, 'Designer packet sent from admin.');

  insert into public.quote_status_events (quote_request_id, event_type, message, status)
  values (p_quote_request_id, 'designer_packet_sent', 'Designer packet sent to ' || trim(p_designer_email), 'design_started');

  return next;
end;
$$;

create or replace function public.get_designer_packet_public(p_token text)
returns table (
  valid boolean,
  id uuid,
  quote_request_id uuid,
  token text,
  designer_email text,
  designer_name text,
  instructions text,
  cloud_folder_url text,
  status text,
  sent_at timestamptz,
  customer_name text,
  customer_email text,
  customer_phone text,
  quote_id text,
  product_type text,
  quote_data jsonb,
  uploaded_files jsonb,
  notes jsonb,
  files jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    true,
    dp.id,
    dp.quote_request_id,
    dp.token,
    dp.designer_email,
    dp.designer_name,
    dp.instructions,
    dp.cloud_folder_url,
    dp.status,
    dp.sent_at,
    qr.customer_name,
    qr.customer_email,
    qr.customer_phone,
    qr.quote_id,
    qr.product_type,
    qr.quote_data,
    qr.uploaded_files,
    coalesce((
      select jsonb_agg(to_jsonb(dpn) order by dpn.created_at desc)
      from public.designer_packet_notes dpn
      where dpn.designer_packet_id = dp.id
    ), '[]'::jsonb) as notes,
    coalesce((
      select jsonb_agg(to_jsonb(dpf) order by dpf.created_at desc)
      from public.designer_packet_files dpf
      where dpf.designer_packet_id = dp.id
    ), '[]'::jsonb) as files
  from public.designer_packets dp
  join public.quote_requests qr on qr.id = dp.quote_request_id
  where dp.token = p_token
  limit 1;

  if not found then
    return query select
      false,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::timestamptz,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::jsonb,
      null::jsonb,
      '[]'::jsonb,
      '[]'::jsonb;
  end if;
end;
$$;

create or replace function public.submit_designer_packet_update_public(
  p_token text,
  p_status text,
  p_note_text text,
  p_uploaded_files jsonb default '[]'::jsonb
)
returns table (
  ok boolean,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_packet public.designer_packets%rowtype;
  v_file jsonb;
begin
  select * into v_packet
  from public.designer_packets
  where token = p_token
  limit 1;

  if v_packet.id is null then
    raise exception 'Designer packet not found';
  end if;

  if p_status not in ('sent', 'in_design', 'proof_ready', 'needs_info', 'completed') then
    raise exception 'Invalid designer packet status';
  end if;

  update public.designer_packets
  set status = p_status
  where id = v_packet.id;

  if nullif(trim(coalesce(p_note_text, '')), '') is not null then
    insert into public.designer_packet_notes (designer_packet_id, author_type, author_email, note_text)
    values (v_packet.id, 'designer', v_packet.designer_email, trim(p_note_text));
  end if;

  for v_file in select * from jsonb_array_elements(coalesce(p_uploaded_files, '[]'::jsonb))
  loop
    insert into public.designer_packet_files (
      designer_packet_id,
      customer_file_id,
      file_name,
      file_url,
      file_type,
      file_size,
      tags
    )
    values (
      v_packet.id,
      nullif(v_file->>'id', '')::uuid,
      coalesce(v_file->>'name', 'Designer proof'),
      coalesce(v_file->>'url', ''),
      nullif(v_file->>'type', ''),
      nullif(v_file->>'size', '')::bigint,
      array['designer_proof']::text[]
    );
  end loop;

  insert into public.quote_status_events (quote_request_id, event_type, message, status)
  values (
    v_packet.quote_request_id,
    'designer_packet_update',
    'Designer packet updated: ' || replace(p_status, '_', ' '),
    case when p_status = 'proof_ready' then 'proof_sent' else null end
  );

  return query select true, p_status;
end;
$$;

revoke all on function public.get_designer_packet_admin(uuid) from public;
revoke all on function public.upsert_designer_packet_admin(uuid, text, text, text, text) from public;
revoke all on function public.get_designer_packet_public(text) from public;
revoke all on function public.submit_designer_packet_update_public(text, text, text, jsonb) from public;

grant execute on function public.get_designer_packet_admin(uuid) to authenticated;
grant execute on function public.upsert_designer_packet_admin(uuid, text, text, text, text) to authenticated;
grant execute on function public.get_designer_packet_public(text) to anon, authenticated;
grant execute on function public.submit_designer_packet_update_public(text, text, text, jsonb) to anon, authenticated;
