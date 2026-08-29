-- Private BWB intake for local-networking contacts and product discovery.
-- These records are leads, never quote requests, until an admin deliberately
-- advances them into another workflow.

create table if not exists public.business_network_leads (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'Business Card / Local Networking',
  business_name text not null check (length(trim(business_name)) between 2 and 180),
  contact_name text,
  phone text,
  email text,
  website text,
  social_links text,
  business_category text,
  where_met text,
  date_met date,
  product_summary text,
  notes text,
  card_image_path text,
  original_file_name text,
  tiktok_opportunity boolean not null default false,
  can_ship boolean,
  status text not null default 'discovered'
    check (status in ('discovered', 'contacted', 'interviewed', 'product_featured', 'tiktok_ready', 'selling', 'parked')),
  verification_status text not null default 'needs_review'
    check (verification_status in ('needs_review', 'verified', 'rejected')),
  episode_name text,
  created_by_admin_user_id uuid not null references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_network_leads_status_idx
  on public.business_network_leads (status, updated_at desc);
create index if not exists business_network_leads_verification_idx
  on public.business_network_leads (verification_status, created_at desc);
create index if not exists business_network_leads_creator_idx
  on public.business_network_leads (created_by_admin_user_id);

alter table public.business_network_leads enable row level security;
revoke all on table public.business_network_leads from anon, authenticated;
grant select, insert, update, delete on table public.business_network_leads to authenticated;

drop policy if exists "Active BWB admins read networking leads" on public.business_network_leads;
create policy "Active BWB admins read networking leads"
on public.business_network_leads
for select
to authenticated
using (
  exists (
    select 1 from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);

drop policy if exists "Active BWB admins add networking leads" on public.business_network_leads;
create policy "Active BWB admins add networking leads"
on public.business_network_leads
for insert
to authenticated
with check (
  exists (
    select 1 from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
  and exists (
    select 1 from public.admin_users creator
    where creator.id = created_by_admin_user_id
      and creator.auth_user_id = (select auth.uid())
      and creator.is_active = true
  )
);

drop policy if exists "Active BWB admins update networking leads" on public.business_network_leads;
create policy "Active BWB admins update networking leads"
on public.business_network_leads
for update
to authenticated
using (
  exists (
    select 1 from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
)
with check (
  exists (
    select 1 from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);

drop policy if exists "Active BWB admins delete networking leads" on public.business_network_leads;
create policy "Active BWB admins delete networking leads"
on public.business_network_leads
for delete
to authenticated
using (
  exists (
    select 1 from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-card-networking',
  'business-card-networking',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Active BWB admins upload networking cards" on storage.objects;
create policy "Active BWB admins upload networking cards"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'business-card-networking'
  and exists (
    select 1 from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);

drop policy if exists "Active BWB admins read networking cards" on storage.objects;
create policy "Active BWB admins read networking cards"
on storage.objects for select to authenticated
using (
  bucket_id = 'business-card-networking'
  and exists (
    select 1 from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);

drop policy if exists "Active BWB admins delete networking cards" on storage.objects;
create policy "Active BWB admins delete networking cards"
on storage.objects for delete to authenticated
using (
  bucket_id = 'business-card-networking'
  and exists (
    select 1 from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);

comment on table public.business_network_leads is
  'Private BWB CRM leads collected from business cards, local networking, markets, festivals, and product discovery.';
