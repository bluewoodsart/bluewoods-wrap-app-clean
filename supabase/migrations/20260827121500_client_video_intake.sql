-- Secure, reusable client video intake for BWB-managed portals.
-- Public visitors can upload only through an active unguessable token.
-- Video objects remain private and are readable only by approved BWB admins.

create table if not exists public.client_video_upload_links (
  id uuid primary key default gen_random_uuid(),
  client_slug text not null check (client_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  client_name text not null check (length(trim(client_name)) between 2 and 180),
  token uuid not null default gen_random_uuid() unique,
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '90 days'),
  created_by_admin_user_id uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_video_upload_links_client_status_idx
  on public.client_video_upload_links (client_slug, status, expires_at desc);

create table if not exists public.client_video_submissions (
  id uuid primary key default gen_random_uuid(),
  upload_link_id uuid not null references public.client_video_upload_links(id) on delete restrict,
  client_slug text not null,
  uploader_name text not null check (length(trim(uploader_name)) between 2 and 160),
  uploader_email text,
  title text,
  notes text,
  external_url text,
  video_bucket text,
  video_path text,
  video_name text,
  video_type text,
  video_size bigint check (video_size is null or video_size >= 0),
  status text not null default 'received'
    check (status in ('received', 'reviewing', 'editing', 'ready_for_approval', 'distributed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (nullif(trim(coalesce(external_url, '')), '') is not null or nullif(trim(coalesce(video_path, '')), '') is not null)
);

create index if not exists client_video_submissions_client_created_idx
  on public.client_video_submissions (client_slug, created_at desc);

alter table public.client_video_upload_links enable row level security;
alter table public.client_video_submissions enable row level security;
revoke all on table public.client_video_upload_links from anon, authenticated;
revoke all on table public.client_video_submissions from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-video-intake',
  'client-video-intake',
  false,
  262144000,
  array[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-m4v',
    'video/mpeg'
  ]::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.client_video_admin_user_v1()
returns public.admin_users
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select au.*
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role in ('owner_admin', 'staff')
  limit 1;
$$;

create or replace function public.client_video_upload_path_valid_v1(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage, pg_temp
as $$
  select exists (
    select 1
    from public.client_video_upload_links link
    where link.token::text = split_part(p_object_name, '/', 1)
      and link.status = 'active'
      and link.expires_at > now()
  );
$$;

create or replace function public.get_client_video_upload_link_public(p_token uuid)
returns table (
  valid boolean,
  client_slug text,
  client_name text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    true,
    link.client_slug,
    link.client_name,
    link.expires_at
  from public.client_video_upload_links link
  where link.token = p_token
    and link.status = 'active'
    and link.expires_at > now()
  limit 1;
$$;

create or replace function public.get_or_create_client_video_upload_link_v1(
  p_client_slug text,
  p_client_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin public.admin_users%rowtype;
  v_link public.client_video_upload_links%rowtype;
  v_slug text := lower(trim(coalesce(p_client_slug, '')));
  v_name text := trim(coalesce(p_client_name, ''));
begin
  v_admin := public.client_video_admin_user_v1();
  if v_admin.id is null then
    raise exception 'Owner or staff access required';
  end if;

  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Choose a valid client slug';
  end if;
  if length(v_name) not between 2 and 180 then
    raise exception 'Choose a valid client name';
  end if;

  update public.client_video_upload_links
  set status = 'expired', updated_at = now()
  where client_slug = v_slug
    and status = 'active'
    and expires_at <= now();

  select * into v_link
  from public.client_video_upload_links
  where client_slug = v_slug
    and status = 'active'
    and expires_at > now()
  order by created_at desc
  limit 1;

  if v_link.id is null then
    insert into public.client_video_upload_links (
      client_slug,
      client_name,
      created_by_admin_user_id
    )
    values (
      v_slug,
      v_name,
      v_admin.id
    )
    returning * into v_link;
  end if;

  return jsonb_build_object(
    'id', v_link.id,
    'client_slug', v_link.client_slug,
    'client_name', v_link.client_name,
    'token', v_link.token,
    'status', v_link.status,
    'expires_at', v_link.expires_at,
    'created_at', v_link.created_at
  );
end;
$$;

create or replace function public.register_client_video_submission_public(
  p_token uuid,
  p_uploader_name text,
  p_uploader_email text default null,
  p_title text default null,
  p_notes text default null,
  p_external_url text default null,
  p_video_path text default null,
  p_video_name text default null,
  p_video_type text default null,
  p_video_size bigint default null
)
returns uuid
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_link public.client_video_upload_links%rowtype;
  v_submission_id uuid;
  v_name text := trim(coalesce(p_uploader_name, ''));
  v_email text := nullif(trim(coalesce(p_uploader_email, '')), '');
  v_external text := nullif(trim(coalesce(p_external_url, '')), '');
  v_path text := nullif(trim(coalesce(p_video_path, '')), '');
  v_object storage.objects%rowtype;
  v_size bigint;
  v_type text;
begin
  select * into v_link
  from public.client_video_upload_links
  where token = p_token
    and status = 'active'
    and expires_at > now()
  limit 1;

  if v_link.id is null then
    raise exception 'This video upload link is invalid or expired';
  end if;
  if length(v_name) not between 2 and 160 then
    raise exception 'Enter the name of the person submitting the video';
  end if;
  if v_email is not null and (length(v_email) > 254 or position('@' in v_email) < 2) then
    raise exception 'Enter a valid email address';
  end if;
  if v_external is null and v_path is null then
    raise exception 'Choose a video file or enter a video link';
  end if;

  if v_path is not null then
    if split_part(v_path, '/', 1) <> p_token::text then
      raise exception 'The uploaded video does not belong to this link';
    end if;

    select * into v_object
    from storage.objects object
    where object.bucket_id = 'client-video-intake'
      and object.name = v_path
    limit 1;

    if v_object.id is null then
      raise exception 'The uploaded video could not be found';
    end if;

    v_size := coalesce(nullif(v_object.metadata ->> 'size', '')::bigint, p_video_size, 0);
    v_type := lower(coalesce(nullif(v_object.metadata ->> 'mimetype', ''), nullif(trim(coalesce(p_video_type, '')), ''), ''));

    if v_size > 262144000 then
      raise exception 'Video files must be 250 MB or smaller';
    end if;
    if v_type not in ('video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/mpeg') then
      raise exception 'Choose an MP4, MOV, M4V, WEBM, or MPEG video';
    end if;
  else
    v_size := null;
    v_type := null;
  end if;

  insert into public.client_video_submissions (
    upload_link_id,
    client_slug,
    uploader_name,
    uploader_email,
    title,
    notes,
    external_url,
    video_bucket,
    video_path,
    video_name,
    video_type,
    video_size
  )
  values (
    v_link.id,
    v_link.client_slug,
    v_name,
    v_email,
    left(nullif(trim(coalesce(p_title, '')), ''), 180),
    left(nullif(trim(coalesce(p_notes, '')), ''), 5000),
    v_external,
    case when v_path is null then null else 'client-video-intake' end,
    v_path,
    left(nullif(trim(coalesce(p_video_name, '')), ''), 255),
    v_type,
    v_size
  )
  returning id into v_submission_id;

  return v_submission_id;
end;
$$;

create or replace function public.list_client_video_submissions_v1(p_client_slug text)
returns table (
  id uuid,
  uploader_name text,
  uploader_email text,
  title text,
  notes text,
  external_url text,
  video_bucket text,
  video_path text,
  video_name text,
  video_type text,
  video_size bigint,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin public.admin_users%rowtype;
begin
  v_admin := public.client_video_admin_user_v1();
  if v_admin.id is null then
    raise exception 'Owner or staff access required';
  end if;

  return query
  select
    submission.id,
    submission.uploader_name,
    submission.uploader_email,
    submission.title,
    submission.notes,
    submission.external_url,
    submission.video_bucket,
    submission.video_path,
    submission.video_name,
    submission.video_type,
    submission.video_size,
    submission.status,
    submission.created_at
  from public.client_video_submissions submission
  where submission.client_slug = lower(trim(p_client_slug))
  order by submission.created_at desc;
end;
$$;

revoke all on function public.client_video_admin_user_v1() from public, anon;
revoke all on function public.client_video_upload_path_valid_v1(text) from public;
revoke all on function public.get_client_video_upload_link_public(uuid) from public;
revoke all on function public.get_or_create_client_video_upload_link_v1(text, text) from public, anon;
revoke all on function public.register_client_video_submission_public(uuid, text, text, text, text, text, text, text, text, bigint) from public;
revoke all on function public.list_client_video_submissions_v1(text) from public, anon;

grant execute on function public.client_video_upload_path_valid_v1(text) to anon, authenticated;
grant execute on function public.get_client_video_upload_link_public(uuid) to anon, authenticated;
grant execute on function public.register_client_video_submission_public(uuid, text, text, text, text, text, text, text, text, bigint) to anon, authenticated;
grant execute on function public.get_or_create_client_video_upload_link_v1(text, text) to authenticated;
grant execute on function public.list_client_video_submissions_v1(text) to authenticated;

drop policy if exists "Valid client video links can upload" on storage.objects;
create policy "Valid client video links can upload"
on storage.objects for insert to anon, authenticated
with check (
  bucket_id = 'client-video-intake'
  and public.client_video_upload_path_valid_v1(storage.objects.name)
  and lower(storage.extension(storage.objects.name)) in ('mp4', 'mov', 'm4v', 'webm', 'mpeg', 'mpg')
);

drop policy if exists "BWB admins can read client video intake" on storage.objects;
create policy "BWB admins can read client video intake"
on storage.objects for select to authenticated
using (
  bucket_id = 'client-video-intake'
  and (public.client_video_admin_user_v1()).id is not null
);

drop policy if exists "BWB admins can delete client video intake" on storage.objects;
create policy "BWB admins can delete client video intake"
on storage.objects for delete to authenticated
using (
  bucket_id = 'client-video-intake'
  and (public.client_video_admin_user_v1()).id is not null
);

comment on table public.client_video_upload_links is
  'Private reusable upload links for BWB-managed client video intake.';
comment on table public.client_video_submissions is
  'Video files or external video links submitted by clients for BWB editing and distribution.';
