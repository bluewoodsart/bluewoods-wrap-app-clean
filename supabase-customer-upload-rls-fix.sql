-- Customer upload portal RLS fix
-- Allows customer upload metadata/storage writes from both anonymous visitors
-- and authenticated staff browsers testing a customer upload link.

drop policy if exists "Allow public customer file inserts" on public.customer_files;
create policy "Allow public customer file inserts"
on public.customer_files
for insert
to anon, authenticated
with check (
  file_size > 0
  and file_size <= 52428800
  and length(file_name) between 1 and 255
);

drop policy if exists "Allow public customer uploads" on storage.objects;
create policy "Allow public customer uploads"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'customer-uploads'
);

drop policy if exists "Allow public customer upload reads" on storage.objects;
create policy "Allow public customer upload reads"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'customer-uploads');

notify pgrst, 'reload schema';
