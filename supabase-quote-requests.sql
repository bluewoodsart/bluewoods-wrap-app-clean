-- Blue Woods quote request setup
-- Run this in Supabase SQL Editor for the project connected to the website.

create extension if not exists pgcrypto;

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  quote_id text,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  preferred_contact text not null check (preferred_contact in ('email', 'text', 'call')),
  rep_slug text,
  rep_email text,
  assigned_rep_name text,
  quote_data jsonb not null default '{}'::jsonb,
  uploaded_files jsonb not null default '[]'::jsonb,
  status text not null default 'new',
  status_updated_at timestamptz,
  last_status_email_sent_at timestamptz,
  source text not null default 'bluewoods-wrap-app',
  created_at timestamptz not null default now()
);

create index if not exists quote_requests_created_at_idx
  on public.quote_requests (created_at desc);

create index if not exists quote_requests_status_idx
  on public.quote_requests (status);

alter table public.quote_requests
  add column if not exists rep_slug text,
  add column if not exists rep_email text,
  add column if not exists assigned_rep_name text,
  add column if not exists status_updated_at timestamptz,
  add column if not exists last_status_email_sent_at timestamptz;

create index if not exists quote_requests_rep_slug_idx
  on public.quote_requests (rep_slug);

create table if not exists public.quote_status_events (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  event_type text not null,
  status text,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists quote_status_events_quote_request_id_created_at_idx
  on public.quote_status_events (quote_request_id, created_at desc);

create table if not exists public.customer_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  quote_id text,
  customer_name text,
  customer_email text,
  customer_phone text,
  preferred_contact text check (preferred_contact is null or preferred_contact in ('email', 'text', 'call')),
  file_url text not null,
  file_name text not null,
  file_type text not null,
  file_size bigint not null,
  tags text[] not null default array['general']::text[],
  created_at timestamptz not null default now()
);

alter table public.customer_files
  add column if not exists quote_id text,
  add column if not exists customer_name text,
  add column if not exists customer_email text,
  add column if not exists customer_phone text,
  add column if not exists preferred_contact text;

create index if not exists customer_files_project_id_idx
  on public.customer_files (project_id);

create index if not exists customer_files_quote_id_idx
  on public.customer_files (quote_id);

create index if not exists customer_files_created_at_idx
  on public.customer_files (created_at desc);

alter table public.quote_requests enable row level security;
alter table public.quote_status_events enable row level security;
alter table public.customer_files enable row level security;

drop policy if exists "Allow public quote request inserts" on public.quote_requests;
create policy "Allow public quote request inserts"
on public.quote_requests
for insert
to anon
with check (
  source = 'bluewoods-wrap-app'
  and length(customer_name) between 1 and 200
  and length(customer_email) between 3 and 320
  and length(customer_phone) between 7 and 50
);

drop function if exists public.get_admin_quote_requests();
create or replace function public.get_admin_quote_requests()
returns table (
  id uuid,
  quote_id text,
  customer_name text,
  customer_email text,
  customer_phone text,
  preferred_contact text,
  rep_slug text,
  assigned_rep_name text,
  status text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    qr.id,
    qr.quote_id,
    qr.customer_name,
    qr.customer_email,
    qr.customer_phone,
    qr.preferred_contact,
    qr.rep_slug,
    qr.assigned_rep_name,
    qr.status,
    qr.created_at
  from public.quote_requests qr
  order by qr.created_at desc
  limit 50;
$$;

grant execute on function public.get_admin_quote_requests() to anon;

drop function if exists public.get_admin_quote_request_detail(uuid);
create or replace function public.get_admin_quote_request_detail(
  quote_request_id uuid
)
returns table (
  id uuid,
  quote_id text,
  customer_name text,
  customer_email text,
  customer_phone text,
  preferred_contact text,
  rep_slug text,
  assigned_rep_name text,
  status text,
  quote_data jsonb,
  uploaded_files jsonb,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    qr.id,
    qr.quote_id,
    qr.customer_name,
    qr.customer_email,
    qr.customer_phone,
    qr.preferred_contact,
    qr.rep_slug,
    qr.assigned_rep_name,
    qr.status,
    qr.quote_data,
    qr.uploaded_files,
    qr.created_at
  from public.quote_requests qr
  where qr.id = get_admin_quote_request_detail.quote_request_id
  limit 1;
$$;

grant execute on function public.get_admin_quote_request_detail(uuid) to anon;

drop function if exists public.update_quote_status_admin(uuid, text);
create or replace function public.update_quote_status_admin(
  quote_request_id uuid,
  next_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_status text;
begin
  if next_status not in (
    'new',
    'contacted',
    'quote_sent',
    'deposit_received',
    'design_started',
    'proof_sent',
    'approved',
    'printing',
    'install_scheduled',
    'completed',
    'lost'
  ) then
    raise exception 'Invalid quote status: %', next_status;
  end if;

  select status
  into previous_status
  from public.quote_requests
  where id = quote_request_id
  for update;

  if previous_status is null then
    raise exception 'Quote request not found: %', quote_request_id;
  end if;

  if previous_status = next_status then
    return;
  end if;

  update public.quote_requests
  set
    status = next_status,
    status_updated_at = now()
  where id = quote_request_id;

  insert into public.quote_status_events (
    quote_request_id,
    event_type,
    status,
    message
  )
  values (
    quote_request_id,
    'status_changed',
    next_status,
    'Status changed from ' || previous_status || ' to ' || next_status
  );
end;
$$;

grant execute on function public.update_quote_status_admin(uuid, text) to anon;

drop function if exists public.get_quote_status_events_admin(uuid);
create or replace function public.get_quote_status_events_admin(
  quote_request_id uuid
)
returns table (
  id uuid,
  event_type text,
  status text,
  message text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    qse.id,
    qse.event_type,
    qse.status,
    qse.message,
    qse.created_at
  from public.quote_status_events qse
  where qse.quote_request_id = get_quote_status_events_admin.quote_request_id
  order by qse.created_at desc;
$$;

grant execute on function public.get_quote_status_events_admin(uuid) to anon;

drop policy if exists "Allow public customer file inserts" on public.customer_files;
create policy "Allow public customer file inserts"
on public.customer_files
for insert
to anon
with check (
  file_size > 0
  and file_size <= 52428800
  and length(file_name) between 1 and 255
);

create or replace function public.attach_contact_to_customer_files(
  file_ids uuid[],
  submitted_quote_id text,
  submitted_customer_name text,
  submitted_customer_email text,
  submitted_customer_phone text,
  submitted_preferred_contact text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.customer_files
  set
    quote_id = submitted_quote_id,
    customer_name = submitted_customer_name,
    customer_email = submitted_customer_email,
    customer_phone = submitted_customer_phone,
    preferred_contact = submitted_preferred_contact
  where id = any(file_ids);
end;
$$;

grant execute on function public.attach_contact_to_customer_files(
  uuid[],
  text,
  text,
  text,
  text,
  text
) to anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-uploads',
  'customer-uploads',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'application/pdf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Allow public customer uploads" on storage.objects;
create policy "Allow public customer uploads"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'customer-uploads'
  and owner is null
);

drop policy if exists "Allow public customer upload reads" on storage.objects;
create policy "Allow public customer upload reads"
on storage.objects
for select
to anon
using (bucket_id = 'customer-uploads');
