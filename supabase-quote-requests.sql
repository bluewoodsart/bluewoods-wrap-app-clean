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

create table if not exists public.quote_customer_action_requests (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  request_type text not null check (
    request_type in (
      'vehicle_photos',
      'logo_artwork',
      'better_quality_artwork',
      'measurements',
      'other'
    )
  ),
  request_types jsonb not null default '[]'::jsonb,
  message text not null,
  customer_email text not null,
  status text not null default 'sent' check (status in ('sent', 'completed', 'canceled')),
  created_by text not null default 'Staff',
  created_at timestamptz not null default now(),
  sent_at timestamptz not null default now()
);

create index if not exists quote_customer_action_requests_quote_request_id_created_at_idx
  on public.quote_customer_action_requests (quote_request_id, created_at desc);

alter table public.quote_customer_action_requests
  add column if not exists request_types jsonb not null default '[]'::jsonb;

create table if not exists public.quote_customer_upload_tokens (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  token text not null unique,
  requested_items jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'used', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create index if not exists quote_customer_upload_tokens_token_idx
  on public.quote_customer_upload_tokens (token);

create index if not exists quote_customer_upload_tokens_quote_request_id_idx
  on public.quote_customer_upload_tokens (quote_request_id);

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
alter table public.quote_customer_action_requests enable row level security;
alter table public.quote_customer_upload_tokens enable row level security;
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

drop function if exists public.finalize_quote_request_public(text, text, text, text, text, text, text, text, jsonb, jsonb);
create or replace function public.finalize_quote_request_public(
  p_quote_id text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_preferred_contact text,
  p_rep_slug text,
  p_rep_email text,
  p_assigned_rep_name text,
  p_quote_data jsonb,
  p_uploaded_files jsonb
)
returns table (
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
  quote_data jsonb,
  uploaded_files jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partial_quote_request_id uuid;
begin
  if trim(coalesce(p_quote_id, '')) = '' then
    raise exception 'Quote ID is required.';
  end if;

  if length(trim(coalesce(p_customer_name, ''))) < 1 or length(trim(coalesce(p_customer_name, ''))) > 200 then
    raise exception 'Customer name is required.';
  end if;

  if length(trim(coalesce(p_customer_email, ''))) < 3 or length(trim(coalesce(p_customer_email, ''))) > 320 then
    raise exception 'Customer email is required.';
  end if;

  if length(trim(coalesce(p_customer_phone, ''))) < 7 or length(trim(coalesce(p_customer_phone, ''))) > 50 then
    raise exception 'Customer phone is required.';
  end if;

  if p_preferred_contact not in ('email', 'text', 'call') then
    raise exception 'Invalid preferred contact: %', p_preferred_contact;
  end if;

  select qr.id
  into v_partial_quote_request_id
  from public.quote_requests qr
  where qr.quote_id = trim(p_quote_id)
    and qr.status = 'partial_lead'
    and qr.source = 'bluewoods-wrap-app'
  order by qr.created_at desc
  limit 1
  for update;

  if v_partial_quote_request_id is not null then
    return query
    update public.quote_requests qr
    set
      customer_name = trim(p_customer_name),
      customer_email = trim(p_customer_email),
      customer_phone = trim(p_customer_phone),
      preferred_contact = p_preferred_contact,
      rep_slug = nullif(trim(coalesce(p_rep_slug, '')), ''),
      rep_email = nullif(trim(coalesce(p_rep_email, '')), ''),
      assigned_rep_name = nullif(trim(coalesce(p_assigned_rep_name, '')), ''),
      quote_data = coalesce(p_quote_data, '{}'::jsonb),
      uploaded_files = coalesce(p_uploaded_files, '[]'::jsonb),
      status = 'new',
      source = 'bluewoods-wrap-app'
    where qr.id = v_partial_quote_request_id
    returning
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
      qr.quote_data,
      qr.uploaded_files,
      qr.created_at;

    return;
  end if;

  return query
  insert into public.quote_requests (
    quote_id,
    customer_name,
    customer_email,
    customer_phone,
    preferred_contact,
    rep_slug,
    rep_email,
    assigned_rep_name,
    quote_data,
    uploaded_files,
    status,
    source
  )
  values (
    trim(p_quote_id),
    trim(p_customer_name),
    trim(p_customer_email),
    trim(p_customer_phone),
    p_preferred_contact,
    nullif(trim(coalesce(p_rep_slug, '')), ''),
    nullif(trim(coalesce(p_rep_email, '')), ''),
    nullif(trim(coalesce(p_assigned_rep_name, '')), ''),
    coalesce(p_quote_data, '{}'::jsonb),
    coalesce(p_uploaded_files, '[]'::jsonb),
    'new',
    'bluewoods-wrap-app'
  )
  returning
    quote_requests.id,
    quote_requests.quote_id,
    quote_requests.customer_name,
    quote_requests.customer_email,
    quote_requests.customer_phone,
    quote_requests.preferred_contact,
    quote_requests.rep_slug,
    quote_requests.rep_email,
    quote_requests.assigned_rep_name,
    quote_requests.status,
    quote_requests.quote_data,
    quote_requests.uploaded_files,
    quote_requests.created_at;
end;
$$;

grant execute on function public.finalize_quote_request_public(text, text, text, text, text, text, text, text, jsonb, jsonb) to anon;

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
  rep_email text,
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
    qr.rep_email,
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
  rep_email text,
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
    qr.rep_email,
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

drop function if exists public.get_admin_quote_follow_up_summaries();
create or replace function public.get_admin_quote_follow_up_summaries()
returns table (
  quote_request_id uuid,
  next_follow_up_task_id uuid,
  next_follow_up_task_text text,
  next_follow_up_due_date date,
  open_follow_up_count integer,
  overdue_follow_up_count integer,
  due_today_follow_up_count integer,
  upcoming_follow_up_count integer,
  follow_up_bucket text
)
language sql
security definer
set search_path = public
as $$
  with recent_quotes as (
    select qr.id
    from public.quote_requests qr
    order by qr.created_at desc
    limit 50
  ),
  open_tasks as (
    select
      qfut.id,
      qfut.quote_request_id,
      qfut.task_text,
      qfut.due_date,
      qfut.created_at
    from public.quote_follow_up_tasks qfut
    join recent_quotes rq on rq.id = qfut.quote_request_id
    where qfut.status = 'open'
  ),
  ranked_tasks as (
    select
      ot.*,
      row_number() over (
        partition by ot.quote_request_id
        order by ot.due_date asc, ot.created_at asc
      ) as task_rank
    from open_tasks ot
  ),
  counts as (
    select
      ot.quote_request_id,
      count(*)::integer as open_follow_up_count,
      count(*) filter (where ot.due_date < current_date)::integer as overdue_follow_up_count,
      count(*) filter (where ot.due_date = current_date)::integer as due_today_follow_up_count,
      count(*) filter (where ot.due_date > current_date)::integer as upcoming_follow_up_count
    from open_tasks ot
    group by ot.quote_request_id
  )
  select
    rq.id as quote_request_id,
    rt.id as next_follow_up_task_id,
    rt.task_text as next_follow_up_task_text,
    rt.due_date as next_follow_up_due_date,
    coalesce(c.open_follow_up_count, 0) as open_follow_up_count,
    coalesce(c.overdue_follow_up_count, 0) as overdue_follow_up_count,
    coalesce(c.due_today_follow_up_count, 0) as due_today_follow_up_count,
    coalesce(c.upcoming_follow_up_count, 0) as upcoming_follow_up_count,
    case
      when coalesce(c.overdue_follow_up_count, 0) > 0 then 'overdue'
      when coalesce(c.due_today_follow_up_count, 0) > 0 then 'due_today'
      when coalesce(c.open_follow_up_count, 0) > 0 then 'upcoming'
      else 'none'
    end as follow_up_bucket
  from recent_quotes rq
  left join ranked_tasks rt
    on rt.quote_request_id = rq.id
   and rt.task_rank = 1
  left join counts c
    on c.quote_request_id = rq.id;
$$;

grant execute on function public.get_admin_quote_follow_up_summaries() to anon;

drop function if exists public.create_quote_customer_upload_token_admin(uuid, jsonb, integer);
create or replace function public.create_quote_customer_upload_token_admin(
  p_quote_request_id uuid,
  p_requested_items jsonb default '[]'::jsonb,
  p_expires_in_days integer default 14
)
returns table (
  id uuid,
  quote_request_id uuid,
  token text,
  requested_items jsonb,
  status text,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_requested_items jsonb;
  v_expires_in_days integer;
begin
  if not exists (
    select 1
    from public.quote_requests qr
    where qr.id = p_quote_request_id
  ) then
    raise exception 'Quote request not found: %', p_quote_request_id;
  end if;

  v_requested_items := case
    when jsonb_typeof(coalesce(p_requested_items, '[]'::jsonb)) = 'array'
      then coalesce(p_requested_items, '[]'::jsonb)
    else '[]'::jsonb
  end;
  v_expires_in_days := greatest(coalesce(p_expires_in_days, 14), 1);
  v_token := encode(gen_random_bytes(32), 'hex');

  return query
  insert into public.quote_customer_upload_tokens (
    quote_request_id,
    token,
    requested_items,
    expires_at
  )
  values (
    p_quote_request_id,
    v_token,
    v_requested_items,
    now() + make_interval(days => v_expires_in_days)
  )
  returning
    quote_customer_upload_tokens.id,
    quote_customer_upload_tokens.quote_request_id,
    quote_customer_upload_tokens.token,
    quote_customer_upload_tokens.requested_items,
    quote_customer_upload_tokens.status,
    quote_customer_upload_tokens.expires_at,
    quote_customer_upload_tokens.created_at;
end;
$$;

grant execute on function public.create_quote_customer_upload_token_admin(uuid, jsonb, integer) to anon;

drop function if exists public.get_quote_upload_token_public(text);
create or replace function public.get_quote_upload_token_public(
  p_token text
)
returns table (
  valid boolean,
  status text,
  requested_items jsonb,
  expires_at timestamptz,
  customer_first_name text
)
language sql
security definer
set search_path = public
as $$
  select
    qcut.status = 'active' and qcut.expires_at > now() as valid,
    case
      when qcut.expires_at <= now() then 'expired'
      else qcut.status
    end as status,
    qcut.requested_items,
    qcut.expires_at,
    nullif(split_part(trim(qr.customer_name), ' ', 1), '') as customer_first_name
  from public.quote_customer_upload_tokens qcut
  join public.quote_requests qr
    on qr.id = qcut.quote_request_id
  where qcut.token = trim(coalesce(p_token, ''))
  limit 1;
$$;

grant execute on function public.get_quote_upload_token_public(text) to anon;

drop function if exists public.attach_uploaded_files_to_quote_public(text, uuid[]);
create or replace function public.attach_uploaded_files_to_quote_public(
  p_token text,
  p_file_ids uuid[]
)
returns table (
  attached_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote_request record;
  v_file_summaries jsonb;
  v_attached_count integer;
begin
  if trim(coalesce(p_token, '')) = '' then
    raise exception 'Upload token is required.';
  end if;

  if p_file_ids is null or cardinality(p_file_ids) = 0 then
    raise exception 'At least one uploaded file is required.';
  end if;

  select
    qcut.id as upload_token_id,
    qcut.status as upload_token_status,
    qcut.expires_at,
    qr.id as quote_request_id,
    qr.quote_id,
    qr.customer_name,
    qr.customer_email,
    qr.customer_phone,
    qr.preferred_contact
  into v_quote_request
  from public.quote_customer_upload_tokens qcut
  join public.quote_requests qr
    on qr.id = qcut.quote_request_id
  where qcut.token = trim(p_token)
  limit 1
  for update;

  if v_quote_request.quote_request_id is null then
    raise exception 'Upload link is invalid.';
  end if;

  if v_quote_request.upload_token_status <> 'active' then
    raise exception 'Upload link is not active.';
  end if;

  if v_quote_request.expires_at <= now() then
    update public.quote_customer_upload_tokens
    set status = 'expired'
    where id = v_quote_request.upload_token_id;

    raise exception 'Upload link has expired.';
  end if;

  update public.customer_files cf
  set
    quote_id = v_quote_request.quote_id,
    customer_name = v_quote_request.customer_name,
    customer_email = v_quote_request.customer_email,
    customer_phone = v_quote_request.customer_phone,
    preferred_contact = v_quote_request.preferred_contact
  where cf.id = any(p_file_ids);

  select count(*)::integer
  into v_attached_count
  from public.customer_files cf
  where cf.id = any(p_file_ids);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', cf.id,
        'name', cf.file_name,
        'url', cf.file_url,
        'type', cf.file_type,
        'size', cf.file_size,
        'tags', to_jsonb(cf.tags)
      )
      order by cf.created_at asc
    ),
    '[]'::jsonb
  )
  into v_file_summaries
  from public.customer_files cf
  where cf.id = any(p_file_ids);

  update public.quote_requests qr
  set uploaded_files = (
    select coalesce(jsonb_agg(file_summary), '[]'::jsonb)
    from (
      select distinct on (file_summary->>'id') file_summary
      from jsonb_array_elements(coalesce(qr.uploaded_files, '[]'::jsonb) || v_file_summaries) as files(file_summary)
      order by file_summary->>'id'
    ) deduped_files
  )
  where qr.id = v_quote_request.quote_request_id;

  update public.quote_customer_upload_tokens
  set used_at = coalesce(used_at, now())
  where id = v_quote_request.upload_token_id;

  return query select v_attached_count;
end;
$$;

grant execute on function public.attach_uploaded_files_to_quote_public(text, uuid[]) to anon;

drop function if exists public.get_quote_customer_action_requests_admin(uuid);
create or replace function public.get_quote_customer_action_requests_admin(
  p_quote_request_id uuid
)
returns table (
  id uuid,
  quote_request_id uuid,
  request_type text,
  request_types jsonb,
  message text,
  customer_email text,
  status text,
  created_by text,
  created_at timestamptz,
  sent_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    qcar.id,
    qcar.quote_request_id,
    qcar.request_type,
    case
      when jsonb_typeof(qcar.request_types) = 'array' and jsonb_array_length(qcar.request_types) > 0
        then qcar.request_types
      else jsonb_build_array(qcar.request_type)
    end as request_types,
    qcar.message,
    qcar.customer_email,
    qcar.status,
    qcar.created_by,
    qcar.created_at,
    qcar.sent_at
  from public.quote_customer_action_requests qcar
  where qcar.quote_request_id = p_quote_request_id
  order by qcar.created_at desc;
$$;

grant execute on function public.get_quote_customer_action_requests_admin(uuid) to anon;

drop function if exists public.create_quote_customer_action_request_admin(uuid, text, text, text, boolean);
drop function if exists public.create_quote_customer_action_request_admin(uuid, text, text, text, boolean, jsonb);
create or replace function public.create_quote_customer_action_request_admin(
  p_quote_request_id uuid,
  p_request_type text,
  p_message text,
  p_customer_email text,
  p_create_follow_up boolean default true,
  p_request_types jsonb default '[]'::jsonb
)
returns table (
  id uuid,
  quote_request_id uuid,
  request_type text,
  request_types jsonb,
  message text,
  customer_email text,
  status text,
  created_by text,
  created_at timestamptz,
  sent_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote_status text;
  v_request_label text;
  v_request_types jsonb;
  v_primary_request_type text;
begin
  v_request_types := case
    when jsonb_typeof(coalesce(p_request_types, '[]'::jsonb)) = 'array'
      then coalesce(p_request_types, '[]'::jsonb)
    else '[]'::jsonb
  end;

  if jsonb_array_length(v_request_types) = 0 and trim(coalesce(p_request_type, '')) <> '' then
    v_request_types := jsonb_build_array(p_request_type);
  end if;

  if jsonb_array_length(v_request_types) = 0 then
    raise exception 'At least one customer action request type is required.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(v_request_types) as selected_request_type(request_type)
    where selected_request_type.request_type not in (
      'vehicle_photos',
      'logo_artwork',
      'better_quality_artwork',
      'measurements',
      'other'
    )
  ) then
    raise exception 'Invalid customer action request type.';
  end if;

  if trim(coalesce(p_message, '')) = '' then
    raise exception 'Customer action request message cannot be empty.';
  end if;

  if trim(coalesce(p_customer_email, '')) = '' then
    raise exception 'Customer email is required.';
  end if;

  select qr.status
  into v_quote_status
  from public.quote_requests qr
  where qr.id = p_quote_request_id;

  if v_quote_status is null then
    raise exception 'Quote request not found: %', p_quote_request_id;
  end if;

  select selected_request_type.request_type
  into v_primary_request_type
  from jsonb_array_elements_text(v_request_types) with ordinality as selected_request_type(request_type, sort_order)
  order by selected_request_type.sort_order
  limit 1;

  select string_agg(
    case selected_request_type.request_type
      when 'vehicle_photos' then 'Vehicle photos'
      when 'logo_artwork' then 'Logo / artwork'
      when 'better_quality_artwork' then 'Better quality artwork'
      when 'measurements' then 'Measurements'
      else 'Other'
    end,
    ', '
    order by selected_request_type.sort_order
  )
  into v_request_label
  from jsonb_array_elements_text(v_request_types) with ordinality as selected_request_type(request_type, sort_order);

  return query
  insert into public.quote_customer_action_requests (
    quote_request_id,
    request_type,
    request_types,
    message,
    customer_email,
    created_by
  )
  values (
    p_quote_request_id,
    v_primary_request_type,
    v_request_types,
    trim(p_message),
    trim(p_customer_email),
    'Staff'
  )
  returning
    quote_customer_action_requests.id,
    quote_customer_action_requests.quote_request_id,
    quote_customer_action_requests.request_type,
    quote_customer_action_requests.request_types,
    quote_customer_action_requests.message,
    quote_customer_action_requests.customer_email,
    quote_customer_action_requests.status,
    quote_customer_action_requests.created_by,
    quote_customer_action_requests.created_at,
    quote_customer_action_requests.sent_at;

  insert into public.quote_status_events (
    quote_request_id,
    event_type,
    status,
    message
  )
  values (
    p_quote_request_id,
    'customer_action_requested',
    v_quote_status,
    'Customer action requested: ' || v_request_label
  );

  if p_create_follow_up then
    insert into public.quote_follow_up_tasks (
      quote_request_id,
      task_text,
      due_date,
      created_by
    )
    values (
      p_quote_request_id,
      'Check whether customer replied with requested items: ' || v_request_label,
      current_date + 3,
      'Staff'
    );
  end if;
end;
$$;

grant execute on function public.create_quote_customer_action_request_admin(uuid, text, text, text, boolean, jsonb) to anon;

notify pgrst, 'reload schema';

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
    'application/pdf',
    'application/postscript',
    'application/illustrator',
    'image/vnd.adobe.photoshop',
    'application/octet-stream'
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
