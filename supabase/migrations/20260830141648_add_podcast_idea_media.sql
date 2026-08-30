update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/svg+xml',
      'image/heic',
      'image/heif',
      'application/pdf',
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'video/x-m4v'
    ]
where id = 'bwb-podcast-assets';

drop policy if exists "Active BWB admins upload podcast assets" on storage.objects;
create policy "Active BWB admins upload podcast assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'bwb-podcast-assets'
  and (
    (storage.foldername(name))[1] in ('breakout', 'press-play', 'aw', 'slapwrapz')
    or (
      (storage.foldername(name))[1] = 'ideas'
      and (storage.foldername(name))[2] is not null
      and (storage.foldername(name))[3] in ('photos', 'videos')
    )
  )
  and lower(storage.extension(name)) in (
    'png', 'jpg', 'jpeg', 'webp', 'svg', 'heic', 'heif', 'pdf',
    'mp4', 'mov', 'webm', 'm4v'
  )
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
  and (
    (storage.foldername(name))[1] in ('breakout', 'press-play', 'aw', 'slapwrapz')
    or (
      (storage.foldername(name))[1] = 'ideas'
      and (storage.foldername(name))[2] is not null
      and (storage.foldername(name))[3] in ('photos', 'videos')
    )
  )
  and lower(storage.extension(name)) in (
    'png', 'jpg', 'jpeg', 'webp', 'svg', 'heic', 'heif', 'pdf',
    'mp4', 'mov', 'webm', 'm4v'
  )
  and exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);

insert into public.bwb_podcast_ideas (
  title,
  concept,
  show_key,
  related_initiatives,
  status,
  priority,
  created_by_admin_user_id
)
select
  'The Old Guys',
  'Visit the two longtime farm-fresh sellers everyone knows as “the old guys,” record their corner-side story, capture the friendship and routine people recognize, and preserve the photos and video already taken as the beginning of the episode.',
  'breakout',
  array['Fayetteville Originals', 'local history', 'farm-fresh food', 'community characters'],
  'developing',
  'high',
  au.id
from public.admin_users au
where au.role = 'owner_admin'
  and au.is_active = true
order by au.created_at asc
limit 1
on conflict (title) do update
set concept = excluded.concept,
    show_key = excluded.show_key,
    related_initiatives = excluded.related_initiatives,
    status = excluded.status,
    priority = excluded.priority,
    updated_at = now();
