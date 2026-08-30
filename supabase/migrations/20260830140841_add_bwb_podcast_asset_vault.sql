insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bwb-podcast-assets',
  'bwb-podcast-assets',
  false,
  26214400,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Active BWB admins read podcast assets" on storage.objects;
create policy "Active BWB admins read podcast assets"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'bwb-podcast-assets'
  and exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);

drop policy if exists "Active BWB admins upload podcast assets" on storage.objects;
create policy "Active BWB admins upload podcast assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'bwb-podcast-assets'
  and (storage.foldername(name))[1] in ('breakout', 'press-play', 'aw', 'slapwrapz')
  and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp', 'svg', 'pdf')
  and exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);

drop policy if exists "Active BWB admins update podcast assets" on storage.objects;
create policy "Active BWB admins update podcast assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'bwb-podcast-assets'
  and exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
)
with check (
  bucket_id = 'bwb-podcast-assets'
  and (storage.foldername(name))[1] in ('breakout', 'press-play', 'aw', 'slapwrapz')
  and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp', 'svg', 'pdf')
  and exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);

drop policy if exists "Active BWB admins delete podcast assets" on storage.objects;
create policy "Active BWB admins delete podcast assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'bwb-podcast-assets'
  and exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);

create table if not exists public.bwb_podcast_ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null unique check (length(title) between 2 and 160),
  concept text not null default '' check (length(concept) <= 4000),
  show_key text check (show_key is null or (length(show_key) between 2 and 80 and show_key ~ '^[a-z0-9][a-z0-9-]*$')),
  related_initiatives text[] not null default '{}',
  status text not null default 'idea' check (status in ('idea', 'developing', 'ready', 'producing', 'launched')),
  priority text not null default 'standard' check (priority in ('flagship', 'high', 'standard')),
  target_date date,
  created_by_admin_user_id uuid not null references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bwb_podcast_ideas enable row level security;

revoke all on table public.bwb_podcast_ideas from anon, authenticated;
grant select, insert, update, delete on table public.bwb_podcast_ideas to authenticated;

drop policy if exists "Active BWB admins read podcast ideas" on public.bwb_podcast_ideas;
create policy "Active BWB admins read podcast ideas"
on public.bwb_podcast_ideas for select to authenticated
using (
  exists (
    select 1 from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);

drop policy if exists "Active BWB admins add podcast ideas" on public.bwb_podcast_ideas;
create policy "Active BWB admins add podcast ideas"
on public.bwb_podcast_ideas for insert to authenticated
with check (
  exists (
    select 1 from public.admin_users au
    where au.id = created_by_admin_user_id
      and au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);

drop policy if exists "Active BWB admins update podcast ideas" on public.bwb_podcast_ideas;
create policy "Active BWB admins update podcast ideas"
on public.bwb_podcast_ideas for update to authenticated
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

drop policy if exists "Active BWB admins delete podcast ideas" on public.bwb_podcast_ideas;
create policy "Active BWB admins delete podcast ideas"
on public.bwb_podcast_ideas for delete to authenticated
using (
  exists (
    select 1 from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);

insert into public.bwb_podcast_ideas (
  title, concept, show_key, related_initiatives, status, priority, target_date, created_by_admin_user_id
)
select seed.title, seed.concept, seed.show_key, seed.related_initiatives, seed.status, seed.priority, seed.target_date, owner_admin.id
from (
  values
    (
      'The Breakout',
      'The flagship Blue Woods Brands show about breaking out, building brands, creating opportunities, and documenting the work in public.',
      'breakout',
      array['Blue Woods Brands', 'DJ West', 'service companies', 'Neighborhood Domination Plan'],
      'ready',
      'flagship',
      null::date
    ),
    (
      'Fayetteville Originals',
      'Visit Fayetteville''s longtime restaurants, shops, buildings, churches, entertainment spots, and family businesses to preserve the stories of the people and places that made the city.',
      'breakout',
      array['Fayetteville local history', 'community relationships', 'local SEO'],
      'developing',
      'high',
      null::date
    ),
    (
      'The Golden Years',
      'Record the stories, wisdom, memories, and turning points of older adults, creating a human storytelling lane that can lead naturally into the future Boomer app.',
      'golden-years',
      array['Boomer app', 'family history', 'senior community'],
      'developing',
      'high',
      null::date
    ),
    (
      'The Breakout at Starr''s Mill: Night Light-Up',
      'Create a cinematic nighttime Breakout field episode at Starr''s Mill using temporary lighting to make the location visually unforgettable. Confirm site permission, hours, power, environmental limits, traffic, and crew safety before scheduling or installing any lighting.',
      'breakout',
      array['Fayetteville Originals', 'field production', 'DJ West', 'Neighborhood Domination Plan'],
      'developing',
      'high',
      date '2026-09-06'
    ),
    (
      'Fayetteville Restaurant Scavenger Hunt',
      'Run a pre-Labor Day scavenger hunt through participating Fayetteville restaurants with clues, check-ins, prizes, short videos, and a Breakout finale that moves attention and customers through the local business network.',
      'breakout',
      array['participating restaurants', 'Neighborhood Domination Plan', 'DJ West', 'local business network'],
      'developing',
      'high',
      date '2026-09-06'
    ),
    (
      'The Breakout Easter Egg Hunt',
      'A future seasonal community hunt that connects families, participating businesses, clues, sponsor prizes, and Breakout content into one local activation.',
      'breakout',
      array['family event', 'participating businesses', 'sponsors', 'community content'],
      'idea',
      'standard',
      null::date
    )
) as seed(title, concept, show_key, related_initiatives, status, priority, target_date)
cross join lateral (
  select au.id
  from public.admin_users au
  where au.role = 'owner_admin' and au.is_active = true
  order by au.created_at asc
  limit 1
) owner_admin
on conflict (title) do update
set concept = excluded.concept,
    show_key = excluded.show_key,
    related_initiatives = excluded.related_initiatives,
    status = excluded.status,
    priority = excluded.priority,
    target_date = excluded.target_date,
    updated_at = now();

comment on table public.bwb_podcast_ideas is
  'Blue Woods Podcast Central idea bank for shows, recurring series, and connected business initiatives.';
