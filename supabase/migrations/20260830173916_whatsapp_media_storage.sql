insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'whatsapp-media',
  'whatsapp-media',
  false,
  26214400,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "active admins read whatsapp media"
on storage.objects for select to authenticated
using (
  bucket_id = 'whatsapp-media'
  and exists (
    select 1 from public.admin_users a
    where a.auth_user_id = (select auth.uid()) and a.is_active
  )
);
