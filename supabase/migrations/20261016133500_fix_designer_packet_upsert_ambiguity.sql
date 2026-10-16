-- Fix ambiguous ON CONFLICT target in designer packet upsert.
-- PL/pgSQL output parameters share names with table columns; prefer column names
-- in SQL statements so the existing unique index is resolved unambiguously.

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
#variable_conflict use_column
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
    quote_request_id, designer_email, designer_name, instructions,
    cloud_folder_url, status, sent_at, created_by_admin_user_id
  )
  values (
    p_quote_request_id, trim(p_designer_email),
    nullif(trim(coalesce(p_designer_name, '')), ''),
    trim(p_instructions), nullif(trim(coalesce(p_cloud_folder_url, '')), ''),
    'sent', now(), v_admin_user_id
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
    designer_packets.id, designer_packets.quote_request_id, designer_packets.token,
    designer_packets.designer_email, designer_packets.designer_name,
    designer_packets.instructions, designer_packets.cloud_folder_url,
    designer_packets.status, designer_packets.sent_at,
    designer_packets.created_at, designer_packets.updated_at
  into
    id, quote_request_id, token, designer_email, designer_name,
    instructions, cloud_folder_url, status, sent_at, created_at, updated_at;

  insert into public.designer_packet_notes (designer_packet_id, author_type, author_email, note_text)
  values (id, 'admin', null, 'Designer packet sent from admin.');

  insert into public.quote_status_events (quote_request_id, event_type, message, status)
  values (p_quote_request_id, 'designer_packet_sent', 'Designer packet sent to ' || trim(p_designer_email), 'design_started');

  return next;
end;
$$;
