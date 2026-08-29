create table if not exists public.bwb_seo_action_progress (
  action_key text primary key
    check (length(action_key) between 3 and 120 and action_key ~ '^[a-z0-9][a-z0-9-]*$'),
  completed boolean not null default false,
  verified boolean not null default false,
  evidence text not null default ''
    check (length(evidence) <= 2000),
  updated_by_admin_user_id uuid not null references public.admin_users(id),
  updated_at timestamptz not null default now(),
  constraint bwb_seo_verified_requires_completed check (not verified or completed)
);

alter table public.bwb_seo_action_progress enable row level security;

revoke all on table public.bwb_seo_action_progress from anon, authenticated;
grant select, insert, update on table public.bwb_seo_action_progress to authenticated;

drop policy if exists "Active BWB admins read SEO progress" on public.bwb_seo_action_progress;
create policy "Active BWB admins read SEO progress"
on public.bwb_seo_action_progress
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

drop policy if exists "Active BWB admins add SEO progress" on public.bwb_seo_action_progress;
create policy "Active BWB admins add SEO progress"
on public.bwb_seo_action_progress
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

drop policy if exists "Active BWB admins update SEO progress" on public.bwb_seo_action_progress;
create policy "Active BWB admins update SEO progress"
on public.bwb_seo_action_progress
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

comment on table public.bwb_seo_action_progress is
  'Shared Blue Woods Admin execution and verification state for the SlapWrapz Fayetteville SEO plan.';

comment on column public.bwb_seo_action_progress.verified is
  'True only after the completed action has been compared, tested, or otherwise validated.';
