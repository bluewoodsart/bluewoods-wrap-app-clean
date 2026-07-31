-- Blue Woods private staff social feed v1
-- Authenticated staff only. Owner admins can view all posts and manage friend connections.

create extension if not exists pgcrypto;

create table if not exists public.staff_feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 5000),
  link_url text,
  audience_type text not null default 'everyone'
    check (audience_type in ('everyone', 'friends', 'specific', 'only_me')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

alter table public.staff_feed_posts
  add column if not exists attachment_path text,
  add column if not exists attachment_name text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'staff-feed',
  'staff-feed',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Active staff can read staff feed images" on storage.objects;
create policy "Active staff can read staff feed images"
on storage.objects for select to authenticated
using (
  bucket_id = 'staff-feed'
  and exists (
    select 1 from public.admin_users au
    where au.auth_user_id = (select auth.uid()) and au.is_active = true
  )
);

drop policy if exists "Active staff can upload staff feed images" on storage.objects;
create policy "Active staff can upload staff feed images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'staff-feed'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp', 'gif')
  and exists (
    select 1 from public.admin_users au
    where au.auth_user_id = (select auth.uid()) and au.is_active = true
  )
);

drop policy if exists "Staff can delete own staff feed images" on storage.objects;
create policy "Staff can delete own staff feed images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'staff-feed'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1 from public.admin_users au
      where au.auth_user_id = (select auth.uid()) and au.is_active = true and au.role = 'owner_admin'
    )
  )
);

create table if not exists public.staff_feed_post_recipients (
  post_id uuid not null references public.staff_feed_posts(id) on delete cascade,
  recipient_admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, recipient_admin_user_id)
);

create table if not exists public.staff_friendships (
  id uuid primary key default gen_random_uuid(),
  user_one_admin_id uuid not null references public.admin_users(id) on delete cascade,
  user_two_admin_id uuid not null references public.admin_users(id) on delete cascade,
  created_by_admin_user_id uuid not null references public.admin_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (user_one_admin_id <> user_two_admin_id),
  check (user_one_admin_id::text < user_two_admin_id::text),
  unique (user_one_admin_id, user_two_admin_id)
);

create table if not exists public.staff_feed_reactions (
  post_id uuid not null references public.staff_feed_posts(id) on delete cascade,
  admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  reaction text not null check (reaction in ('like', 'love', 'care', 'haha', 'wow', 'sad', 'angry', 'dislike')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (post_id, admin_user_id)
);

create table if not exists public.staff_feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.staff_feed_posts(id) on delete cascade,
  author_admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists staff_feed_posts_created_at_idx on public.staff_feed_posts (created_at desc);
create index if not exists staff_feed_recipients_user_idx on public.staff_feed_post_recipients (recipient_admin_user_id, post_id);
create index if not exists staff_friendships_user_one_idx on public.staff_friendships (user_one_admin_id);
create index if not exists staff_friendships_user_two_idx on public.staff_friendships (user_two_admin_id);
create index if not exists staff_feed_comments_post_idx on public.staff_feed_comments (post_id, created_at);

alter table public.staff_feed_posts enable row level security;
alter table public.staff_feed_post_recipients enable row level security;
alter table public.staff_friendships enable row level security;
alter table public.staff_feed_reactions enable row level security;
alter table public.staff_feed_comments enable row level security;

revoke all on table public.staff_feed_posts from anon, authenticated;
revoke all on table public.staff_feed_post_recipients from anon, authenticated;
revoke all on table public.staff_friendships from anon, authenticated;
revoke all on table public.staff_feed_reactions from anon, authenticated;
revoke all on table public.staff_feed_comments from anon, authenticated;

create or replace function public.staff_feed_current_user_v1()
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
  limit 1;
$$;

create or replace function public.staff_feed_can_view_post_v1(p_post_id uuid, p_viewer_admin_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.staff_feed_posts p
    join public.admin_users viewer on viewer.id = p_viewer_admin_id and viewer.is_active = true
    where p.id = p_post_id
      and p.archived_at is null
      and (
        viewer.role = 'owner_admin'
        or p.author_admin_user_id = viewer.id
        or p.audience_type = 'everyone'
        or (
          p.audience_type = 'specific'
          and exists (
            select 1 from public.staff_feed_post_recipients r
            where r.post_id = p.id and r.recipient_admin_user_id = viewer.id
          )
        )
        or (
          p.audience_type = 'friends'
          and exists (
            select 1 from public.staff_friendships f
            where (f.user_one_admin_id = p.author_admin_user_id and f.user_two_admin_id = viewer.id)
               or (f.user_two_admin_id = p.author_admin_user_id and f.user_one_admin_id = viewer.id)
          )
        )
      )
  );
$$;

create or replace function public.get_staff_feed_bootstrap_v1()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user public.admin_users%rowtype;
begin
  v_user := public.staff_feed_current_user_v1();
  if v_user.id is null then raise exception 'Staff access required'; end if;

  return jsonb_build_object(
    'me', jsonb_build_object(
      'id', v_user.id, 'display_name', coalesce(v_user.display_name, v_user.email),
      'email', v_user.email, 'role', v_user.role, 'is_owner_admin', v_user.role = 'owner_admin'
    ),
    'people', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', au.id, 'display_name', coalesce(au.display_name, au.email),
        'email', au.email, 'role', au.role,
        'is_my_friend', exists (
          select 1 from public.staff_friendships f
          where (f.user_one_admin_id = v_user.id and f.user_two_admin_id = au.id)
             or (f.user_two_admin_id = v_user.id and f.user_one_admin_id = au.id)
        )
      ) order by coalesce(au.display_name, au.email))
      from public.admin_users au
      where au.is_active = true and au.id <> v_user.id
    ), '[]'::jsonb),
    'friendships', case when v_user.role = 'owner_admin' then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'user_one_id', f.user_one_admin_id, 'user_two_id', f.user_two_admin_id,
        'user_one_name', coalesce(a.display_name, a.email),
        'user_two_name', coalesce(b.display_name, b.email), 'created_at', f.created_at
      ) order by coalesce(a.display_name, a.email), coalesce(b.display_name, b.email))
      from public.staff_friendships f
      join public.admin_users a on a.id = f.user_one_admin_id
      join public.admin_users b on b.id = f.user_two_admin_id
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

create or replace function public.get_staff_feed_posts_v1(p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user public.admin_users%rowtype;
begin
  v_user := public.staff_feed_current_user_v1();
  if v_user.id is null then raise exception 'Staff access required'; end if;

  return coalesce((
    select jsonb_agg(post_json order by created_at desc)
    from (
      select p.created_at, jsonb_build_object(
        'id', p.id, 'body', p.body, 'link_url', p.link_url,
        'attachment_path', p.attachment_path, 'attachment_name', p.attachment_name,
        'audience_type', p.audience_type, 'created_at', p.created_at,
        'author_id', a.id, 'author_name', coalesce(a.display_name, a.email),
        'author_role', a.role, 'is_mine', p.author_admin_user_id = v_user.id,
        'recipient_names', coalesce((
          select jsonb_agg(coalesce(ru.display_name, ru.email) order by coalesce(ru.display_name, ru.email))
          from public.staff_feed_post_recipients r
          join public.admin_users ru on ru.id = r.recipient_admin_user_id
          where r.post_id = p.id
        ), '[]'::jsonb),
        'reaction_counts', jsonb_build_object(
          'like', (select count(*) from public.staff_feed_reactions x where x.post_id = p.id and x.reaction = 'like'),
          'love', (select count(*) from public.staff_feed_reactions x where x.post_id = p.id and x.reaction = 'love'),
          'care', (select count(*) from public.staff_feed_reactions x where x.post_id = p.id and x.reaction = 'care'),
          'haha', (select count(*) from public.staff_feed_reactions x where x.post_id = p.id and x.reaction = 'haha'),
          'wow', (select count(*) from public.staff_feed_reactions x where x.post_id = p.id and x.reaction = 'wow'),
          'sad', (select count(*) from public.staff_feed_reactions x where x.post_id = p.id and x.reaction = 'sad'),
          'angry', (select count(*) from public.staff_feed_reactions x where x.post_id = p.id and x.reaction = 'angry'),
          'dislike', (select count(*) from public.staff_feed_reactions x where x.post_id = p.id and x.reaction = 'dislike')
        ),
        'my_reaction', (select x.reaction from public.staff_feed_reactions x where x.post_id = p.id and x.admin_user_id = v_user.id),
        'comments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', c.id, 'body', c.body, 'created_at', c.created_at,
            'author_id', ca.id, 'author_name', coalesce(ca.display_name, ca.email)
          ) order by c.created_at)
          from public.staff_feed_comments c
          join public.admin_users ca on ca.id = c.author_admin_user_id
          where c.post_id = p.id and c.deleted_at is null
        ), '[]'::jsonb)
      ) as post_json
      from public.staff_feed_posts p
      join public.admin_users a on a.id = p.author_admin_user_id
      where public.staff_feed_can_view_post_v1(p.id, v_user.id)
      order by p.created_at desc
      limit greatest(1, least(coalesce(p_limit, 50), 100))
    ) visible_posts
  ), '[]'::jsonb);
end;
$$;

create or replace function public.create_staff_feed_post_v1(
  p_body text,
  p_audience_type text default 'everyone',
  p_recipient_ids uuid[] default '{}'::uuid[],
  p_link_url text default null,
  p_attachment_path text default null,
  p_attachment_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user public.admin_users%rowtype;
  v_post_id uuid;
  v_audience text := lower(trim(coalesce(p_audience_type, 'everyone')));
  v_link_url text := nullif(trim(coalesce(p_link_url, '')), '');
begin
  v_user := public.staff_feed_current_user_v1();
  if v_user.id is null then raise exception 'Staff access required'; end if;
  if length(trim(coalesce(p_body, ''))) not between 1 and 5000 then raise exception 'Post must be between 1 and 5000 characters'; end if;
  if v_audience not in ('everyone', 'friends', 'specific', 'only_me') then raise exception 'Invalid audience'; end if;
  if v_audience = 'specific' and coalesce(cardinality(p_recipient_ids), 0) = 0 then raise exception 'Choose at least one recipient'; end if;
  if v_link_url ~* '^www\.' then v_link_url := 'https://' || v_link_url; end if;
  if v_link_url is not null and v_link_url !~* '^https?://' then
    raise exception 'Links must start with www., http://, or https://';
  end if;
  if nullif(trim(coalesce(p_attachment_path, '')), '') is not null then
    if p_attachment_path not like v_user.auth_user_id::text || '/%' then raise exception 'Invalid attachment folder'; end if;
    if not exists (
      select 1 from storage.objects so
      where so.bucket_id = 'staff-feed' and so.name = p_attachment_path and so.owner_id = v_user.auth_user_id::text
    ) then raise exception 'Uploaded attachment was not found'; end if;
  end if;

  insert into public.staff_feed_posts (author_admin_user_id, body, link_url, audience_type, attachment_path, attachment_name)
  values (
    v_user.id,
    trim(p_body),
    v_link_url,
    v_audience,
    nullif(trim(coalesce(p_attachment_path, '')), ''),
    left(nullif(trim(coalesce(p_attachment_name, '')), ''), 255)
  )
  returning id into v_post_id;

  if v_audience = 'specific' then
    insert into public.staff_feed_post_recipients (post_id, recipient_admin_user_id)
    select v_post_id, au.id
    from public.admin_users au
    where au.is_active = true and au.id = any(p_recipient_ids) and au.id <> v_user.id
    on conflict do nothing;
    if not found then raise exception 'No valid recipients selected'; end if;
  end if;
  return v_post_id;
end;
$$;

create or replace function public.set_staff_feed_reaction_v1(p_post_id uuid, p_reaction text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_user public.admin_users%rowtype;
begin
  v_user := public.staff_feed_current_user_v1();
  if v_user.id is null or not public.staff_feed_can_view_post_v1(p_post_id, v_user.id) then raise exception 'Post not available'; end if;
  if p_reaction is null or trim(p_reaction) = '' then
    delete from public.staff_feed_reactions where post_id = p_post_id and admin_user_id = v_user.id;
  elsif p_reaction in ('like', 'love', 'care', 'haha', 'wow', 'sad', 'angry', 'dislike') then
    insert into public.staff_feed_reactions (post_id, admin_user_id, reaction)
    values (p_post_id, v_user.id, p_reaction)
    on conflict (post_id, admin_user_id) do update set reaction = excluded.reaction, updated_at = now();
  else raise exception 'Invalid reaction';
  end if;
end;
$$;

create or replace function public.add_staff_feed_comment_v1(p_post_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_user public.admin_users%rowtype; v_id uuid;
begin
  v_user := public.staff_feed_current_user_v1();
  if v_user.id is null or not public.staff_feed_can_view_post_v1(p_post_id, v_user.id) then raise exception 'Post not available'; end if;
  if length(trim(coalesce(p_body, ''))) not between 1 and 2000 then raise exception 'Comment must be between 1 and 2000 characters'; end if;
  insert into public.staff_feed_comments (post_id, author_admin_user_id, body)
  values (p_post_id, v_user.id, trim(p_body)) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.set_staff_friendship_admin_v1(p_user_one_id uuid, p_user_two_id uuid, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_user public.admin_users%rowtype; v_one uuid; v_two uuid;
begin
  v_user := public.staff_feed_current_user_v1();
  if v_user.id is null or v_user.role <> 'owner_admin' then raise exception 'Owner admin access required'; end if;
  if p_user_one_id is null or p_user_two_id is null or p_user_one_id = p_user_two_id then raise exception 'Choose two different people'; end if;
  if not exists (select 1 from public.admin_users where id = p_user_one_id and is_active = true)
     or not exists (select 1 from public.admin_users where id = p_user_two_id and is_active = true) then raise exception 'Active staff users required'; end if;
  if p_user_one_id::text < p_user_two_id::text then v_one := p_user_one_id; v_two := p_user_two_id;
  else v_one := p_user_two_id; v_two := p_user_one_id; end if;
  if p_enabled then
    insert into public.staff_friendships (user_one_admin_id, user_two_admin_id, created_by_admin_user_id)
    values (v_one, v_two, v_user.id) on conflict (user_one_admin_id, user_two_admin_id) do nothing;
  else
    delete from public.staff_friendships where user_one_admin_id = v_one and user_two_admin_id = v_two;
  end if;
end;
$$;

create or replace function public.get_staff_feed_email_event_v1(
  p_post_id uuid,
  p_event_type text,
  p_comment_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user public.admin_users%rowtype;
  v_post public.staff_feed_posts%rowtype;
  v_event_type text := lower(trim(coalesce(p_event_type, '')));
  v_comment public.staff_feed_comments%rowtype;
  v_reaction public.staff_feed_reactions%rowtype;
  v_event_text text := '';
  v_notification_key text;
  v_recipients jsonb;
begin
  v_user := public.staff_feed_current_user_v1();
  if v_user.id is null then raise exception 'Staff access required'; end if;

  select * into v_post
  from public.staff_feed_posts
  where id = p_post_id and archived_at is null;
  if v_post.id is null then raise exception 'Post not available'; end if;

  if v_event_type = 'new_post' then
    if v_post.author_admin_user_id <> v_user.id then raise exception 'Not the post author'; end if;
    v_event_text := v_post.body;
    v_notification_key := 'staff-post-' || v_post.id::text;
  elsif v_event_type = 'comment' then
    select * into v_comment
    from public.staff_feed_comments
    where id = p_comment_id and post_id = p_post_id and deleted_at is null;
    if v_comment.id is null or v_comment.author_admin_user_id <> v_user.id then raise exception 'Comment not available'; end if;
    v_event_text := v_comment.body;
    v_notification_key := 'staff-comment-' || v_comment.id::text;
  elsif v_event_type = 'reaction' then
    select * into v_reaction
    from public.staff_feed_reactions
    where post_id = p_post_id and admin_user_id = v_user.id;
    if v_reaction.post_id is null then raise exception 'Reaction not available'; end if;
    v_event_text := v_reaction.reaction;
    v_notification_key := 'staff-reaction-' || v_post.id::text || '-' || v_user.id::text || '-' ||
      floor(extract(epoch from v_reaction.updated_at) * 1000)::bigint::text;
  else
    raise exception 'Invalid notification event';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', eligible.id,
    'email', eligible.email,
    'display_name', coalesce(eligible.display_name, eligible.email),
    'role', eligible.role
  ) order by coalesce(eligible.display_name, eligible.email)), '[]'::jsonb)
  into v_recipients
  from public.admin_users eligible
  where eligible.is_active = true
    and eligible.id <> v_user.id
    and (
      eligible.role = 'owner_admin'
      or (
        v_event_type = 'new_post'
        and (
          v_post.audience_type = 'everyone'
          or (v_post.audience_type = 'specific' and exists (
            select 1 from public.staff_feed_post_recipients r
            where r.post_id = v_post.id and r.recipient_admin_user_id = eligible.id
          ))
          or (v_post.audience_type = 'friends' and exists (
            select 1 from public.staff_friendships f
            where (f.user_one_admin_id = v_post.author_admin_user_id and f.user_two_admin_id = eligible.id)
               or (f.user_two_admin_id = v_post.author_admin_user_id and f.user_one_admin_id = eligible.id)
          ))
        )
      )
      or (v_event_type in ('comment', 'reaction') and eligible.id = v_post.author_admin_user_id)
    );

  return jsonb_build_object(
    'event_type', v_event_type,
    'event_text', v_event_text,
    'notification_key', v_notification_key,
    'actor_name', coalesce(v_user.display_name, v_user.email),
    'post_id', v_post.id,
    'post_body', v_post.body,
    'audience_type', v_post.audience_type,
    'recipients', v_recipients
  );
end;
$$;

revoke all on function public.staff_feed_current_user_v1() from public, anon, authenticated;
revoke all on function public.staff_feed_can_view_post_v1(uuid, uuid) from public, anon, authenticated;
revoke all on function public.get_staff_feed_bootstrap_v1() from public, anon;
revoke all on function public.get_staff_feed_posts_v1(integer) from public, anon;
revoke all on function public.create_staff_feed_post_v1(text, text, uuid[], text) from public, anon;
revoke all on function public.create_staff_feed_post_v1(text, text, uuid[], text, text, text) from public, anon;
revoke all on function public.set_staff_feed_reaction_v1(uuid, text) from public, anon;
revoke all on function public.add_staff_feed_comment_v1(uuid, text) from public, anon;
revoke all on function public.set_staff_friendship_admin_v1(uuid, uuid, boolean) from public, anon;
revoke all on function public.get_staff_feed_email_event_v1(uuid, text, uuid) from public, anon;

grant execute on function public.get_staff_feed_bootstrap_v1() to authenticated;
grant execute on function public.get_staff_feed_posts_v1(integer) to authenticated;
grant execute on function public.create_staff_feed_post_v1(text, text, uuid[], text) to authenticated;
grant execute on function public.create_staff_feed_post_v1(text, text, uuid[], text, text, text) to authenticated;
grant execute on function public.set_staff_feed_reaction_v1(uuid, text) to authenticated;
grant execute on function public.add_staff_feed_comment_v1(uuid, text) to authenticated;
grant execute on function public.set_staff_friendship_admin_v1(uuid, uuid, boolean) to authenticated;
grant execute on function public.get_staff_feed_email_event_v1(uuid, text, uuid) to authenticated;

comment on table public.staff_feed_posts is 'Private authenticated staff social feed. Visibility is enforced through RPC functions.';

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
