-- Rep portal bug reports and improvement ideas.
-- Run this in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.rep_portal_feedback (
  id uuid primary key default gen_random_uuid(),
  submitted_by_admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  rep_slug text not null,
  rep_email text not null,
  rep_name text,
  feedback_type text not null,
  message text not null,
  page_path text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rep_portal_feedback_type_check
    check (feedback_type in ('bug', 'confusing', 'idea', 'customer')),
  constraint rep_portal_feedback_status_check
    check (status in ('new', 'reviewing', 'planned', 'fixed', 'closed')),
  constraint rep_portal_feedback_message_length_check
    check (length(trim(message)) between 10 and 4000),
  constraint rep_portal_feedback_rep_slug_check
    check (rep_slug ~ '^[a-z0-9-]{1,64}$')
);

create index if not exists rep_portal_feedback_created_at_idx
  on public.rep_portal_feedback (created_at desc);

create index if not exists rep_portal_feedback_status_created_at_idx
  on public.rep_portal_feedback (status, created_at desc);

create index if not exists rep_portal_feedback_rep_slug_created_at_idx
  on public.rep_portal_feedback (rep_slug, created_at desc);

create or replace function public.set_rep_portal_feedback_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_rep_portal_feedback_updated_at on public.rep_portal_feedback;
create trigger set_rep_portal_feedback_updated_at
before update on public.rep_portal_feedback
for each row
execute function public.set_rep_portal_feedback_updated_at();

alter table public.rep_portal_feedback enable row level security;

revoke all on public.rep_portal_feedback from public;
revoke all on public.rep_portal_feedback from anon;
revoke all on public.rep_portal_feedback from authenticated;

drop function if exists public.submit_rep_portal_feedback_v1(text, text, text);

create or replace function public.submit_rep_portal_feedback_v1(
  p_feedback_type text,
  p_message text,
  p_page_path text default null
)
returns table (
  id uuid,
  rep_slug text,
  feedback_type text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  current_rep public.admin_users%rowtype;
  inserted_feedback public.rep_portal_feedback%rowtype;
  normalized_feedback_type text;
begin
  select *
  into current_rep
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role in ('sales_rep', 'rep_manager')
    and nullif(trim(coalesce(au.rep_slug, '')), '') is not null
  limit 1;

  if current_rep.id is null then
    raise exception 'Active rep access is required.';
  end if;

  normalized_feedback_type := lower(trim(coalesce(p_feedback_type, 'bug')));
  if normalized_feedback_type not in ('bug', 'confusing', 'idea', 'customer') then
    normalized_feedback_type := 'bug';
  end if;

  if length(trim(coalesce(p_message, ''))) < 10 then
    raise exception 'Please add more detail before sending.';
  end if;

  insert into public.rep_portal_feedback (
    submitted_by_admin_user_id,
    rep_slug,
    rep_email,
    rep_name,
    feedback_type,
    message,
    page_path
  )
  values (
    current_rep.id,
    lower(trim(current_rep.rep_slug)),
    current_rep.email,
    current_rep.display_name,
    normalized_feedback_type,
    trim(p_message),
    nullif(trim(coalesce(p_page_path, '')), '')
  )
  returning * into inserted_feedback;

  return query
  select
    inserted_feedback.id,
    inserted_feedback.rep_slug,
    inserted_feedback.feedback_type,
    inserted_feedback.status,
    inserted_feedback.created_at;
end;
$$;

revoke all on function public.submit_rep_portal_feedback_v1(text, text, text) from public;
revoke all on function public.submit_rep_portal_feedback_v1(text, text, text) from anon;
grant execute on function public.submit_rep_portal_feedback_v1(text, text, text) to authenticated;

drop function if exists public.list_admin_rep_portal_feedback_v1(text);

create or replace function public.list_admin_rep_portal_feedback_v1(
  p_status text default null
)
returns table (
  id uuid,
  rep_slug text,
  rep_email text,
  rep_name text,
  feedback_type text,
  message text,
  page_path text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  current_admin public.admin_users%rowtype;
begin
  select *
  into current_admin
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role in ('owner_admin', 'staff')
  limit 1;

  if current_admin.id is null then
    raise exception 'Owner or staff admin access is required.';
  end if;

  return query
  select
    rpf.id,
    rpf.rep_slug,
    rpf.rep_email,
    rpf.rep_name,
    rpf.feedback_type,
    rpf.message,
    rpf.page_path,
    rpf.status,
    rpf.created_at
  from public.rep_portal_feedback rpf
  where p_status is null
    or rpf.status = p_status
  order by rpf.created_at desc
  limit 100;
end;
$$;

revoke all on function public.list_admin_rep_portal_feedback_v1(text) from public;
revoke all on function public.list_admin_rep_portal_feedback_v1(text) from anon;
grant execute on function public.list_admin_rep_portal_feedback_v1(text) to authenticated;
