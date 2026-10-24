-- Visitor intake is server-only. BWB owners can review all sites; other admins
-- need an explicit site membership. Public visitors never SELECT these tables.
create schema if not exists bwb_private;
revoke all on schema bwb_private from public, anon;
grant usage on schema bwb_private to authenticated;

create table public.bwb_conversation_sites (
  id text primary key,
  brand_key text not null,
  partner_key text not null,
  display_name text not null,
  origins text[] not null,
  enabled boolean not null default false,
  crm_enabled boolean not null default false,
  check (not crm_enabled or (brand_key = 'slapwrapz' and partner_key = 'bwb'))
);
insert into public.bwb_conversation_sites values (
  'slapwrapz', 'slapwrapz', 'bwb', 'SlapWrapz',
  array['https://www.slapwrapz.com','https://slapwrapz.com'], false, true
);
create table public.bwb_conversation_members (
  site_id text references public.bwb_conversation_sites(id) on delete cascade,
  admin_user_id uuid references public.admin_users(id) on delete cascade,
  primary key (site_id, admin_user_id)
);
create function bwb_private.can_access_conversation_site(p_site text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users a
    where a.auth_user_id = (select auth.uid()) and a.is_active
    and (a.role = 'owner_admin' or (a.role = 'staff' and exists (
      select 1 from public.bwb_conversation_members m where m.site_id = p_site and m.admin_user_id = a.id))));
$$;
revoke all on function bwb_private.can_access_conversation_site(text) from public, anon;
grant execute on function bwb_private.can_access_conversation_site(text) to authenticated;

create table public.bwb_visitor_conversations (
  id uuid primary key,
  site_id text not null references public.bwb_conversation_sites(id),
  token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$'),
  attribution jsonb not null default '{}',
  reported_source text check (length(reported_source) <= 240),
  reported_search text check (length(reported_search) <= 240),
  contact_name text,
  contact_email text,
  follow_up_requested_at timestamptz,
  quote_request_id uuid unique references public.quote_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days',
  unique (id, site_id)
);
create table public.bwb_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  site_id text not null,
  request_id uuid not null,
  visitor_text text not null check (length(visitor_text) between 1 and 2000),
  assistant_text text not null check (length(assistant_text) <= 2000),
  created_at timestamptz not null default now(),
  foreign key (conversation_id, site_id) references public.bwb_visitor_conversations(id, site_id) on delete cascade,
  unique (conversation_id, request_id)
);
create table bwb_private.conversation_rate_limits (
  bucket_key text primary key,
  window_start timestamptz not null,
  requests integer not null
);
create index on public.bwb_visitor_conversations(site_id, created_at desc);
create index on public.bwb_visitor_conversations(expires_at);
create index on public.bwb_conversation_messages(conversation_id, created_at);
alter table public.bwb_conversation_sites enable row level security;
alter table public.bwb_conversation_members enable row level security;
alter table public.bwb_visitor_conversations enable row level security;
alter table public.bwb_conversation_messages enable row level security;
alter table bwb_private.conversation_rate_limits enable row level security;
revoke all on public.bwb_conversation_sites, public.bwb_conversation_members,
  public.bwb_visitor_conversations, public.bwb_conversation_messages from public, anon, authenticated;
grant select on public.bwb_conversation_sites, public.bwb_visitor_conversations,
  public.bwb_conversation_messages to authenticated;
grant all on public.bwb_conversation_sites, public.bwb_conversation_members,
  public.bwb_visitor_conversations, public.bwb_conversation_messages to service_role;
create policy conversation_sites_read on public.bwb_conversation_sites for select to authenticated
  using (bwb_private.can_access_conversation_site(id));
create policy conversations_read on public.bwb_visitor_conversations for select to authenticated
  using (bwb_private.can_access_conversation_site(site_id) and expires_at > now());
create policy conversation_messages_read on public.bwb_conversation_messages for select to authenticated
  using (bwb_private.can_access_conversation_site(site_id) and exists (
    select 1 from public.bwb_visitor_conversations c where c.id = conversation_id and c.expires_at > now()));

-- One transaction saves the exchange and (only on explicit request) the CRM inquiry.
-- The server hashes the opaque browser token and IP; neither raw value is stored.
create function public.ingest_bwb_conversation(
  p_site text, p_token_hash text, p_rate_key text, p_payload jsonb, p_reply text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c public.bwb_visitor_conversations;
  s public.bwb_conversation_sites;
  prior public.bwb_conversation_messages;
  v_id uuid := (p_payload->>'conversationId')::uuid;
  v_request uuid := (p_payload->>'requestId')::uuid;
  v_count integer;
  v_quote uuid;
  v_transcript text;
begin
  select * into s from public.bwb_conversation_sites where id = p_site and enabled;
  if not found then raise exception 'Intake unavailable' using errcode = 'P0001'; end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_rate_key !~ '^[a-f0-9]{64}$'
    or length(coalesce(p_payload->>'message','')) not between 1 and 2000
    or pg_column_size(p_payload) > 16000 then raise exception 'Invalid intake'; end if;

  -- Serialize per conversation and per hourly rate bucket across server instances.
  perform pg_advisory_xact_lock(hashtextextended(v_id::text, 0));
  select * into c from public.bwb_visitor_conversations where id = v_id;
  if found then
    if c.site_id <> p_site or c.token_hash <> p_token_hash or c.expires_at <= now() then
      raise exception 'Conversation unavailable' using errcode = '42501';
    end if;
    select * into prior from public.bwb_conversation_messages
      where conversation_id = v_id and request_id = v_request;
    if found then return jsonb_build_object('reply', prior.assistant_text, 'followUpSaved', c.follow_up_requested_at is not null); end if;
  end if;
  insert into bwb_private.conversation_rate_limits values (p_rate_key, now(), 1)
    on conflict (bucket_key) do update set
      requests = case when conversation_rate_limits.window_start < now() - interval '1 hour' then 1 else conversation_rate_limits.requests + 1 end,
      window_start = case when conversation_rate_limits.window_start < now() - interval '1 hour' then now() else conversation_rate_limits.window_start end
    returning requests into v_count;
  if v_count > 100 then raise exception 'Please try again later' using errcode = 'P0002'; end if;
  if c.id is null then
    insert into public.bwb_visitor_conversations(id, site_id, token_hash, attribution)
      values (v_id, p_site, p_token_hash, coalesce(p_payload->'attribution','{}')) returning * into c;
  end if;
  if (select count(*) from public.bwb_conversation_messages where conversation_id = v_id) >= 50 then
    raise exception 'Conversation limit reached' using errcode = 'P0002';
  end if;
  insert into public.bwb_conversation_messages(conversation_id, site_id, request_id, visitor_text, assistant_text)
    values (v_id, p_site, v_request, p_payload->>'message', p_reply);
  update public.bwb_visitor_conversations set
    reported_source = coalesce(nullif(p_payload->>'reportedSource',''), reported_source),
    reported_search = coalesce(nullif(p_payload->>'reportedSearch',''), reported_search),
    updated_at = now()
    where id = v_id returning * into c;
  if p_payload ? 'contact' and c.follow_up_requested_at is null then
    if not s.crm_enabled then raise exception 'Follow-up is not enabled for this site'; end if;
    if coalesce(p_payload#>>'{contact,requestFollowUp}','') <> 'true'
      or length(trim(coalesce(p_payload#>>'{contact,name}',''))) not between 1 and 120
      or length(coalesce(p_payload#>>'{contact,email}','')) > 254
      or coalesce(p_payload#>>'{contact,email}','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      then raise exception 'Contact details and follow-up request required'; end if;
    select string_agg('Visitor: ' || visitor_text || E'\nGuide: ' || assistant_text, E'\n\n' order by created_at, id)
      into v_transcript from public.bwb_conversation_messages where conversation_id = v_id;
    -- Never attach an anonymous visitor to someone else's existing job by a claimed email.
    -- One inquiry per conversation; the existing CRM groups customer history for staff.
    insert into public.quote_requests(customer_name, customer_email, customer_phone, preferred_contact,
      product_type, source, quote_data, status)
      values (trim(p_payload#>>'{contact,name}'), lower(trim(p_payload#>>'{contact,email}')), '', 'email',
        'consultation', 'website_conversation', jsonb_build_object(
          'conversationId', v_id, 'brandKey', s.brand_key, 'partnerKey', s.partner_key,
          'visitorRequest', p_payload->>'message', 'conversationTranscript', v_transcript,
          'reportedSource', c.reported_source, 'reportedSearch', c.reported_search,
          'attribution', c.attribution, 'marketingConsent', false), 'new') returning id into v_quote;
    update public.bwb_visitor_conversations set contact_name = trim(p_payload#>>'{contact,name}'),
      contact_email = lower(trim(p_payload#>>'{contact,email}')), follow_up_requested_at = now(),
      quote_request_id = v_quote where id = v_id returning * into c;
  end if;
  return jsonb_build_object('reply', p_reply, 'followUpSaved', c.follow_up_requested_at is not null);
end;
$$;
revoke all on function public.ingest_bwb_conversation(text,text,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.ingest_bwb_conversation(text,text,text,jsonb,text) to service_role;

create function public.purge_expired_bwb_conversations() returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- Remove transcript copies from linked CRM inquiries too; retain requested contact/job history.
  update public.quote_requests q set quote_data = q.quote_data - 'conversationTranscript' - 'visitorRequest' - 'reportedSearch' - 'reportedSource' - 'attribution'
    from public.bwb_visitor_conversations c where c.quote_request_id = q.id and c.expires_at <= now();
  delete from public.bwb_visitor_conversations where expires_at <= now();
  delete from bwb_private.conversation_rate_limits where window_start < now() - interval '2 days';
end;
$$;
revoke all on function public.purge_expired_bwb_conversations() from public, anon, authenticated;
grant execute on function public.purge_expired_bwb_conversations() to service_role;

-- Existing quote tables intentionally have no direct owner/staff SELECT policy.
-- Expose only outcomes for conversations this admin is permitted to read.
create function public.get_bwb_conversation_outcomes(p_ids uuid[])
returns table (conversation_id uuid, status text, assigned_rep_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if coalesce(array_length(p_ids,1),0) > 50 then raise exception 'Request up to 50 conversations'; end if;
  return query select c.id, q.status, q.assigned_rep_name
    from public.bwb_visitor_conversations c join public.quote_requests q on q.id = c.quote_request_id
    where c.id = any(p_ids) and c.expires_at > now() and bwb_private.can_access_conversation_site(c.site_id);
end;
$$;
revoke all on function public.get_bwb_conversation_outcomes(uuid[]) from public, anon;
grant execute on function public.get_bwb_conversation_outcomes(uuid[]) to authenticated;
