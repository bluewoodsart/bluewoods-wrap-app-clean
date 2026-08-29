create table if not exists public.bwb_social_channels (
  id uuid primary key default gen_random_uuid(),
  brand_key text not null default 'slapwrapz'
    check (length(brand_key) between 2 and 80 and brand_key ~ '^[a-z0-9][a-z0-9-]*$'),
  platform_key text not null
    check (length(platform_key) between 2 and 80 and platform_key ~ '^[a-z0-9][a-z0-9-]*$'),
  status text not null default 'not_started'
    check (status in ('not_started', 'planned', 'active', 'paused')),
  publishing_status text not null default 'manual'
    check (publishing_status in ('manual', 'planned', 'connected')),
  priority text not null default 'standard'
    check (priority in ('high', 'standard', 'watch')),
  profile_name text not null default ''
    check (length(profile_name) <= 200),
  handle text not null default ''
    check (length(handle) <= 200),
  profile_url text not null default ''
    check (length(profile_url) <= 1000),
  content_focus text not null default ''
    check (length(content_focus) <= 1000),
  notes text not null default ''
    check (length(notes) <= 2000),
  updated_by_admin_user_id uuid not null references public.admin_users(id),
  updated_at timestamptz not null default now(),
  unique (brand_key, platform_key)
);

alter table public.bwb_social_channels enable row level security;

revoke all on table public.bwb_social_channels from anon, authenticated;
grant select, insert, update on table public.bwb_social_channels to authenticated;

drop policy if exists "Active BWB admins read social channels" on public.bwb_social_channels;
create policy "Active BWB admins read social channels"
on public.bwb_social_channels
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);

drop policy if exists "Active BWB admins add social channels" on public.bwb_social_channels;
create policy "Active BWB admins add social channels"
on public.bwb_social_channels
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users au
    where au.id = updated_by_admin_user_id
      and au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);

drop policy if exists "Active BWB admins update social channels" on public.bwb_social_channels;
create policy "Active BWB admins update social channels"
on public.bwb_social_channels
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
)
with check (
  exists (
    select 1
    from public.admin_users au
    where au.id = updated_by_admin_user_id
      and au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);

comment on table public.bwb_social_channels is
  'Shared Blue Woods Brands inventory of social, local-discovery, community, and portfolio channels.';

comment on column public.bwb_social_channels.publishing_status is
  'Tracks whether posting remains manual, is planned for integration, or is connected to a publishing service.';
