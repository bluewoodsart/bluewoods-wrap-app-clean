-- Blue Woods / SlapWrapz protected admin auth setup
-- Run this in Supabase SQL Editor after creating the Supabase Auth users.
-- This file does not change existing quote/admin-status RPCs.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null check (role in ('owner_admin', 'staff', 'sales_rep')),
  rep_slug text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_users_sales_rep_requires_rep_slug_check
    check (role <> 'sales_rep' or nullif(trim(coalesce(rep_slug, '')), '') is not null)
);

create unique index if not exists admin_users_auth_user_id_key
  on public.admin_users (auth_user_id);

create unique index if not exists admin_users_email_key
  on public.admin_users (email);

create index if not exists admin_users_rep_slug_idx
  on public.admin_users (rep_slug);

create or replace function public.set_admin_users_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_admin_users_updated_at on public.admin_users;
create trigger set_admin_users_updated_at
before update on public.admin_users
for each row
execute function public.set_admin_users_updated_at();

alter table public.admin_users enable row level security;

drop policy if exists "Admin users can read own active profile" on public.admin_users;
create policy "Admin users can read own active profile"
on public.admin_users
for select
to authenticated
using (
  auth.uid() = auth_user_id
  and is_active = true
);

create or replace function public.get_current_admin_user()
returns table (
  id uuid,
  auth_user_id uuid,
  email text,
  display_name text,
  role text,
  rep_slug text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    au.id,
    au.auth_user_id,
    au.email,
    au.display_name,
    au.role,
    au.rep_slug,
    au.is_active,
    au.created_at,
    au.updated_at
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
  limit 1;
$$;

revoke all on function public.get_current_admin_user() from public;
revoke all on function public.get_current_admin_user() from anon;
grant execute on function public.get_current_admin_user() to authenticated;

-- Seed examples:
-- 1. Create the users in Supabase Auth first.
-- 2. Replace each AUTH_UUID_FOR_* placeholder with the Auth user ID.
-- 3. Replace ASHLEY_REAL_LOGIN_EMAIL with Ashley's real login email.
--
-- insert into public.admin_users (auth_user_id, email, display_name, role, rep_slug)
-- values
--   ('AUTH_UUID_FOR_ASHLEY', 'ASHLEY_REAL_LOGIN_EMAIL', 'Ashley / Blue Woods Admin', 'owner_admin', null),
--   ('AUTH_UUID_FOR_TODD', 'trapstarcustoms@gmail.com', 'Todd Wheeler / Trapstar Customs', 'sales_rep', 'todd'),
--   ('AUTH_UUID_FOR_PRESS_PLAY_TEST', 'pressplayadvertising@gmail.com', 'Press Play Test Rep', 'sales_rep', 'test');
