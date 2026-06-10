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

create table if not exists public.quote_internal_notes (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  note_text text not null,
  created_by text not null default 'Staff',
  created_at timestamptz not null default now()
);

create index if not exists quote_internal_notes_quote_request_id_created_at_idx
  on public.quote_internal_notes (quote_request_id, created_at desc);

create table if not exists public.quote_follow_up_tasks (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  task_text text not null,
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'completed')),
  created_by text not null default 'Staff',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists quote_follow_up_tasks_quote_request_id_status_due_date_idx
  on public.quote_follow_up_tasks (quote_request_id, status, due_date);

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
alter table public.quote_internal_notes enable row level security;
alter table public.quote_follow_up_tasks enable row level security;
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

drop function if exists public.get_quote_internal_notes_admin(uuid);
create or replace function public.get_quote_internal_notes_admin(
  p_quote_request_id uuid
)
returns table (
  id uuid,
  quote_request_id uuid,
  note_text text,
  created_by text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    qin.id,
    qin.quote_request_id,
    qin.note_text,
    qin.created_by,
    qin.created_at
  from public.quote_internal_notes qin
  where qin.quote_request_id = p_quote_request_id
  order by qin.created_at desc;
$$;

grant execute on function public.get_quote_internal_notes_admin(uuid) to anon;

drop function if exists public.add_quote_internal_note_admin(uuid, text);
create or replace function public.add_quote_internal_note_admin(
  p_quote_request_id uuid,
  p_note_text text
)
returns table (
  id uuid,
  quote_request_id uuid,
  note_text text,
  created_by text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if trim(p_note_text) = '' then
    raise exception 'Internal note cannot be empty.';
  end if;

  if not exists (
    select 1
    from public.quote_requests qr
    where qr.id = p_quote_request_id
  ) then
    raise exception 'Quote request not found: %', p_quote_request_id;
  end if;

  return query
  insert into public.quote_internal_notes (
    quote_request_id,
    note_text,
    created_by
  )
  values (
    p_quote_request_id,
    trim(p_note_text),
    'Staff'
  )
  returning
    quote_internal_notes.id,
    quote_internal_notes.quote_request_id,
    quote_internal_notes.note_text,
    quote_internal_notes.created_by,
    quote_internal_notes.created_at;
end;
$$;

grant execute on function public.add_quote_internal_note_admin(uuid, text) to anon;

drop function if exists public.get_quote_follow_up_tasks_admin(uuid);
create or replace function public.get_quote_follow_up_tasks_admin(
  p_quote_request_id uuid
)
returns table (
  id uuid,
  quote_request_id uuid,
  task_text text,
  due_date date,
  status text,
  created_by text,
  created_at timestamptz,
  completed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    qfut.id,
    qfut.quote_request_id,
    qfut.task_text,
    qfut.due_date,
    qfut.status,
    qfut.created_by,
    qfut.created_at,
    qfut.completed_at
  from public.quote_follow_up_tasks qfut
  where qfut.quote_request_id = p_quote_request_id
  order by
    case when qfut.status = 'open' then 0 else 1 end,
    qfut.due_date asc,
    qfut.created_at desc;
$$;

grant execute on function public.get_quote_follow_up_tasks_admin(uuid) to anon;

drop function if exists public.add_quote_follow_up_task_admin(uuid, text, date);
create or replace function public.add_quote_follow_up_task_admin(
  p_quote_request_id uuid,
  p_task_text text,
  p_due_date date
)
returns table (
  id uuid,
  quote_request_id uuid,
  task_text text,
  due_date date,
  status text,
  created_by text,
  created_at timestamptz,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if trim(p_task_text) = '' then
    raise exception 'Follow-up task cannot be empty.';
  end if;

  if p_due_date is null then
    raise exception 'Follow-up due date is required.';
  end if;

  if not exists (
    select 1
    from public.quote_requests qr
    where qr.id = p_quote_request_id
  ) then
    raise exception 'Quote request not found: %', p_quote_request_id;
  end if;

  return query
  insert into public.quote_follow_up_tasks (
    quote_request_id,
    task_text,
    due_date,
    created_by
  )
  values (
    p_quote_request_id,
    trim(p_task_text),
    p_due_date,
    'Staff'
  )
  returning
    quote_follow_up_tasks.id,
    quote_follow_up_tasks.quote_request_id,
    quote_follow_up_tasks.task_text,
    quote_follow_up_tasks.due_date,
    quote_follow_up_tasks.status,
    quote_follow_up_tasks.created_by,
    quote_follow_up_tasks.created_at,
    quote_follow_up_tasks.completed_at;
end;
$$;

grant execute on function public.add_quote_follow_up_task_admin(uuid, text, date) to anon;

drop function if exists public.complete_quote_follow_up_task_admin(uuid);
create or replace function public.complete_quote_follow_up_task_admin(
  p_follow_up_task_id uuid
)
returns table (
  id uuid,
  quote_request_id uuid,
  task_text text,
  due_date date,
  status text,
  created_by text,
  created_at timestamptz,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.quote_follow_up_tasks qfut
    where qfut.id = p_follow_up_task_id
  ) then
    raise exception 'Follow-up task not found: %', p_follow_up_task_id;
  end if;

  return query
  update public.quote_follow_up_tasks
  set
    status = 'completed',
    completed_at = coalesce(completed_at, now())
  where quote_follow_up_tasks.id = p_follow_up_task_id
  returning
    quote_follow_up_tasks.id,
    quote_follow_up_tasks.quote_request_id,
    quote_follow_up_tasks.task_text,
    quote_follow_up_tasks.due_date,
    quote_follow_up_tasks.status,
    quote_follow_up_tasks.created_by,
    quote_follow_up_tasks.created_at,
    quote_follow_up_tasks.completed_at;
end;
$$;

grant execute on function public.complete_quote_follow_up_task_admin(uuid) to anon;

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
