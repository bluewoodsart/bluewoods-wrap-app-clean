-- BWB F.A.T.E. Staff Social personal profiles and controlled video model

create table if not exists public.staff_social_profiles (
  admin_user_id uuid primary key references public.admin_users(id) on delete cascade,
  header_path text,
  header_name text,
  bio text check (bio is null or length(bio) <= 500),
  accent_color text not null default '#4f46e5'
    check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.staff_social_profiles enable row level security;
revoke all on table public.staff_social_profiles from anon, authenticated;

create or replace function public.staff_feed_can_read_media_object_v1(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage, pg_temp
as $$
  select exists (
    select 1
    from public.admin_users viewer
    where viewer.auth_user_id = auth.uid()
      and viewer.is_active = true
      and (
        exists (
          select 1
          from public.staff_social_profiles profile
          where profile.header_path = p_object_name
        )
        or exists (
          select 1
          from public.staff_feed_posts post
          where post.attachment_path = p_object_name
            and public.staff_feed_can_view_post_v1(post.id, viewer.id)
        )
      )
  );
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'staff-feed',
  'staff-feed',
  false,
  52428800,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Active staff can read staff feed images" on storage.objects;
drop policy if exists "Active staff can read visible staff feed media" on storage.objects;
create policy "Active staff can read visible staff feed media"
on storage.objects for select to authenticated
using (
  bucket_id = 'staff-feed'
  and public.staff_feed_can_read_media_object_v1(storage.objects.name)
);

drop policy if exists "Active staff can upload staff feed images" on storage.objects;
drop policy if exists "Active staff can upload staff feed media" on storage.objects;
create policy "Active staff can upload staff feed media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'staff-feed'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'heif', 'mp4', 'webm', 'mov')
  and exists (
    select 1 from public.admin_users au
    where au.auth_user_id = (select auth.uid()) and au.is_active = true
  )
);

create or replace function public.get_staff_social_profile_v1(p_admin_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_viewer public.admin_users%rowtype;
  v_target public.admin_users%rowtype;
  v_profile public.staff_social_profiles%rowtype;
begin
  v_viewer := public.staff_feed_current_user_v1();
  if v_viewer.id is null then raise exception 'Staff access required'; end if;

  select * into v_target
  from public.admin_users
  where id = coalesce(p_admin_user_id, v_viewer.id)
    and is_active = true;

  if v_target.id is null then raise exception 'Staff profile not available'; end if;

  select * into v_profile
  from public.staff_social_profiles
  where admin_user_id = v_target.id;

  return jsonb_build_object(
    'admin_user_id', v_target.id,
    'display_name', coalesce(v_target.display_name, v_target.email),
    'email', v_target.email,
    'role', v_target.role,
    'is_mine', v_target.id = v_viewer.id,
    'header_path', v_profile.header_path,
    'header_name', v_profile.header_name,
    'bio', coalesce(v_profile.bio, ''),
    'accent_color', coalesce(v_profile.accent_color, '#4f46e5')
  );
end;
$$;

create or replace function public.update_staff_social_profile_v1(
  p_header_path text default null,
  p_header_name text default null,
  p_bio text default '',
  p_accent_color text default '#4f46e5'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user public.admin_users%rowtype;
  v_header_path text := nullif(trim(coalesce(p_header_path, '')), '');
  v_accent text := coalesce(nullif(trim(p_accent_color), ''), '#4f46e5');
begin
  v_user := public.staff_feed_current_user_v1();
  if v_user.id is null then raise exception 'Staff access required'; end if;
  if length(coalesce(p_bio, '')) > 500 then raise exception 'Profile bio must be 500 characters or fewer'; end if;
  if v_accent !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'Choose a valid profile color'; end if;

  if v_header_path is not null then
    if v_header_path not like v_user.auth_user_id::text || '/profile-headers/%' then
      raise exception 'Invalid profile header folder';
    end if;
    if not exists (
      select 1 from storage.objects object
      where object.bucket_id = 'staff-feed'
        and object.name = v_header_path
        and object.owner_id = v_user.auth_user_id::text
    ) then
      raise exception 'Uploaded profile header was not found';
    end if;
  end if;

  insert into public.staff_social_profiles (
    admin_user_id, header_path, header_name, bio, accent_color, updated_at
  )
  values (
    v_user.id,
    v_header_path,
    left(nullif(trim(coalesce(p_header_name, '')), ''), 255),
    nullif(trim(coalesce(p_bio, '')), ''),
    v_accent,
    now()
  )
  on conflict (admin_user_id) do update set
    header_path = excluded.header_path,
    header_name = excluded.header_name,
    bio = excluded.bio,
    accent_color = excluded.accent_color,
    updated_at = now();

  return public.get_staff_social_profile_v1(v_user.id);
end;
$$;

revoke all on function public.get_staff_social_profile_v1(uuid) from public, anon;
revoke all on function public.update_staff_social_profile_v1(text, text, text, text) from public, anon;
revoke all on function public.staff_feed_can_read_media_object_v1(text) from public, anon;
grant execute on function public.get_staff_social_profile_v1(uuid) to authenticated;
grant execute on function public.update_staff_social_profile_v1(text, text, text, text) to authenticated;
grant execute on function public.staff_feed_can_read_media_object_v1(text) to authenticated;

comment on table public.staff_social_profiles is
  'Private staff social homepage customization. Media remains in the private staff-feed bucket.';
