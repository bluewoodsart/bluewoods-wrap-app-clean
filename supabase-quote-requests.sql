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
  quote_data jsonb not null default '{}'::jsonb,
  uploaded_files jsonb not null default '[]'::jsonb,
  status text not null default 'new',
  source text not null default 'bluewoods-wrap-app',
  created_at timestamptz not null default now()
);

create index if not exists quote_requests_created_at_idx
  on public.quote_requests (created_at desc);

create index if not exists quote_requests_status_idx
  on public.quote_requests (status);

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
