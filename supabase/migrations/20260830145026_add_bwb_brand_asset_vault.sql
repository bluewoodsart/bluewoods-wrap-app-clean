insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bwb-brand-assets',
  'bwb-brand-assets',
  false,
  26214400,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Active BWB admins read brand assets" on storage.objects;
create policy "Active BWB admins read brand assets"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'bwb-brand-assets'
  and exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);

drop policy if exists "Active BWB admins upload brand assets" on storage.objects;
create policy "Active BWB admins upload brand assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'bwb-brand-assets'
  and (storage.foldername(name))[1] in ('blue-woods-brands', 'slapwrapz', 'client-brands', 'new-concepts')
  and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp', 'svg', 'pdf')
  and exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);

drop policy if exists "Active BWB admins update brand assets" on storage.objects;
create policy "Active BWB admins update brand assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'bwb-brand-assets'
  and exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
)
with check (
  bucket_id = 'bwb-brand-assets'
  and (storage.foldername(name))[1] in ('blue-woods-brands', 'slapwrapz', 'client-brands', 'new-concepts')
  and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp', 'svg', 'pdf')
  and exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);

drop policy if exists "Active BWB admins delete brand assets" on storage.objects;
create policy "Active BWB admins delete brand assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'bwb-brand-assets'
  and exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role in ('owner_admin', 'staff')
  )
);
