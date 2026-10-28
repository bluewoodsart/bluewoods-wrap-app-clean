
create table public.bwb_service_media (
 service_slug text primary key check (service_slug in ('vehicle-wraps','custom-banners','vehicle-magnets','stickers-decals','business-signs','window-graphics')),
 video_path text, image_path text, captions_path text,
 updated_at timestamptz not null default now(),
 check(video_path is null or video_path like service_slug || '/%'),
 check(image_path is null or image_path like service_slug || '/%'),
 check(captions_path is null or captions_path like service_slug || '/%')
);
alter table public.bwb_service_media enable row level security;
grant select on public.bwb_service_media to anon, authenticated;
grant update on public.bwb_service_media to authenticated;
create policy "Public service media read" on public.bwb_service_media for select to anon,authenticated using (true);
create policy "BWB admins update service media" on public.bwb_service_media for update to authenticated using (exists (select 1 from public.admin_users au where au.auth_user_id = (select auth.uid()) and au.is_active = true and au.role in ('owner_admin','staff'))) with check (exists (select 1 from public.admin_users au where au.auth_user_id = (select auth.uid()) and au.is_active = true and au.role in ('owner_admin','staff')));
insert into public.bwb_service_media(service_slug) values ('vehicle-wraps'),('custom-banners'),('vehicle-magnets'),('stickers-decals'),('business-signs'),('window-graphics');
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('bwb-service-media','bwb-service-media',true,52428800,array['video/mp4','video/webm','image/jpeg','image/png','image/webp','text/vtt']);
create policy "BWB service media upload" on storage.objects for insert to authenticated with check (bucket_id='bwb-service-media' and exists (select 1 from public.admin_users au where au.auth_user_id = (select auth.uid()) and au.is_active = true and au.role in ('owner_admin','staff')));
create policy "BWB service media admin read" on storage.objects for select to authenticated using (bucket_id='bwb-service-media' and exists (select 1 from public.admin_users au where au.auth_user_id = (select auth.uid()) and au.is_active = true and au.role in ('owner_admin','staff')));

create or replace function public.submit_service_quote(
 p_submission_id uuid,p_service_slug text,p_contact jsonb,p_details jsonb,
 p_rep_slug text default null,p_rep_email text default null,p_assigned_rep_name text default null
) returns text language plpgsql security definer set search_path=public as $$
declare v_id text; v_type text; v_name text;
begin
 if p_submission_id is null then raise exception 'Submission ID is required'; end if;
 select product_type,service_name into v_type,v_name from (values
 ('vehicle-wraps','wrap','Vehicle wraps & fleet graphics'),('custom-banners','banner','Custom banners'),('vehicle-magnets','sign','Vehicle magnets'),('stickers-decals','decal','Custom stickers & decals'),('business-signs','sign','Business signs'),('window-graphics','sign','Window graphics & lettering')
 ) as services(slug,product_type,service_name) where slug=p_service_slug;
 if v_type is null then raise exception 'Choose a valid service'; end if;
 if coalesce(p_contact->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Enter a valid email'; end if;
 if length(trim(coalesce(p_details->>'notes',''))) < 5 or length(coalesce(p_details->>'notes','')) > 10000 then raise exception 'Add project details (5–10000 characters)'; end if;
 v_id := 'WEB-' || p_submission_id::text;
 perform pg_advisory_xact_lock(hashtextextended(v_id,0));
 if exists(select 1 from public.quote_requests where quote_id=v_id) then return v_id; end if;
 perform public.finalize_quote_request_public(v_id,p_contact->>'name',p_contact->>'email',p_contact->>'phone',
 coalesce(p_contact->>'preferredContact','email'),p_rep_slug,p_rep_email,p_assigned_rep_name,
 jsonb_build_object('intakeType','service_page','selectedService',v_name,'productType',v_type,'sourcePage','/services/'||p_service_slug,
 'companyName',left(coalesce(p_contact->>'company',''),200),'notes',p_details->>'notes','goal',p_details->>'notes'),
 '[]'::jsonb,v_type);
 return v_id;
end; $$;
revoke all on function public.submit_service_quote(uuid,text,jsonb,jsonb,text,text,text) from public;
grant execute on function public.submit_service_quote(uuid,text,jsonb,jsonb,text,text,text) to anon,authenticated;
