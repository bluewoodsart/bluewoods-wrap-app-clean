-- Video Instructions & Fixes: private staff submission, review, social reply,
-- owner approval, deployment, and audit history.

create table if not exists public.video_instruction_reviews (
  id uuid primary key default gen_random_uuid(),
  created_by_admin_user_id uuid not null references public.admin_users(id),
  source_feed_post_id uuid unique references public.staff_feed_posts(id) on delete set null,
  title text not null,
  instructions text not null default '',
  video_bucket text not null default 'video-instructions'
    check (video_bucket in ('video-instructions', 'staff-feed')),
  video_path text not null,
  video_name text not null,
  status text not null default 'uploaded'
    check (status in (
      'uploaded', 'transcribing', 'under_review', 'fix_proposed',
      'awaiting_social_reply', 'rechecking', 'ready_for_approval',
      'approved', 'ready_to_deploy', 'deployed', 'rejected'
    )),
  transcript text not null default '',
  problem_summary text not null default '',
  proposed_fix text not null default '',
  expected_result text not null default '',
  social_reply text not null default '',
  social_post_id uuid references public.staff_feed_posts(id) on delete set null,
  approved_by_admin_user_id uuid references public.admin_users(id),
  approved_at timestamptz,
  deployed_by_admin_user_id uuid references public.admin_users(id),
  deployed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.video_instruction_activity (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.video_instruction_reviews(id) on delete cascade,
  actor_admin_user_id uuid not null references public.admin_users(id),
  action text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists video_instruction_reviews_status_idx
  on public.video_instruction_reviews(status, updated_at desc);
create index if not exists video_instruction_activity_review_idx
  on public.video_instruction_activity(review_id, created_at);

alter table public.video_instruction_reviews enable row level security;
alter table public.video_instruction_activity enable row level security;
revoke all on table public.video_instruction_reviews from anon, authenticated;
revoke all on table public.video_instruction_activity from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'video-instructions',
  'video-instructions',
  false,
  52428800,
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Active staff upload instruction videos" on storage.objects;
create policy "Active staff upload instruction videos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'video-instructions'
  and exists (
    select 1 from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
  )
);

drop policy if exists "Active staff read instruction videos" on storage.objects;
create policy "Active staff read instruction videos"
on storage.objects for select to authenticated
using (
  bucket_id = 'video-instructions'
  and exists (
    select 1 from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
  )
);

create or replace function public.video_instruction_current_user_v1()
returns public.admin_users
language sql
stable
security definer
set search_path = public
as $$
  select au
  from public.admin_users au
  where au.auth_user_id = (select auth.uid())
    and au.is_active = true
  limit 1;
$$;

create or replace function public.create_video_instruction_v1(
  p_title text,
  p_instructions text,
  p_video_bucket text,
  p_video_path text,
  p_video_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.admin_users%rowtype;
  v_id uuid;
begin
  v_user := public.video_instruction_current_user_v1();
  if v_user.id is null then raise exception 'Active staff access required'; end if;
  if trim(coalesce(p_title, '')) = '' then raise exception 'Title is required'; end if;
  if p_video_bucket not in ('video-instructions', 'staff-feed') then raise exception 'Invalid video source'; end if;
  if trim(coalesce(p_video_path, '')) = '' then raise exception 'Video is required'; end if;

  insert into public.video_instruction_reviews (
    created_by_admin_user_id, title, instructions, video_bucket, video_path, video_name
  ) values (
    v_user.id, left(trim(p_title), 180), left(trim(coalesce(p_instructions, '')), 5000),
    p_video_bucket, p_video_path, left(coalesce(nullif(trim(p_video_name), ''), 'Instruction video'), 255)
  ) returning id into v_id;

  insert into public.video_instruction_activity(review_id, actor_admin_user_id, action, note)
  values (v_id, v_user.id, 'uploaded', 'Video submitted for Admin review.');
  return v_id;
end;
$$;

create or replace function public.create_video_instruction_from_post_v1(p_post_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.admin_users%rowtype;
  v_post public.staff_feed_posts%rowtype;
  v_id uuid;
begin
  v_user := public.video_instruction_current_user_v1();
  if v_user.id is null then raise exception 'Active staff access required'; end if;

  select * into v_post from public.staff_feed_posts where id = p_post_id;
  if v_post.id is null or not public.staff_feed_can_view_post_v1(v_post.id, v_user.id) then
    raise exception 'Post not available';
  end if;
  if coalesce(v_post.attachment_path, '') = ''
     or coalesce(v_post.attachment_name, v_post.attachment_path) !~* '\.(mp4|webm|mov)$' then
    raise exception 'This post does not contain a supported video';
  end if;

  select id into v_id from public.video_instruction_reviews where source_feed_post_id = v_post.id;
  if v_id is not null then return v_id; end if;

  insert into public.video_instruction_reviews (
    created_by_admin_user_id, source_feed_post_id, title, instructions,
    video_bucket, video_path, video_name
  ) values (
    v_user.id, v_post.id,
    left(coalesce(nullif(split_part(trim(v_post.body), E'\n', 1), ''), 'Social team video instruction'), 180),
    left(coalesce(v_post.body, ''), 5000),
    'staff-feed', v_post.attachment_path, coalesce(v_post.attachment_name, 'Team instruction video')
  ) returning id into v_id;

  insert into public.video_instruction_activity(review_id, actor_admin_user_id, action, note)
  values (v_id, v_user.id, 'submitted_from_social', 'Social-feed video sent to Admin review.');
  return v_id;
end;
$$;

create or replace function public.list_video_instructions_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user public.admin_users%rowtype;
begin
  v_user := public.video_instruction_current_user_v1();
  if v_user.id is null or v_user.role not in ('owner_admin', 'staff') then
    raise exception 'Admin or staff access required';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'title', r.title,
        'instructions', r.instructions,
        'video_bucket', r.video_bucket,
        'video_path', r.video_path,
        'video_name', r.video_name,
        'status', r.status,
        'transcript', r.transcript,
        'problem_summary', r.problem_summary,
        'proposed_fix', r.proposed_fix,
        'expected_result', r.expected_result,
        'social_reply', r.social_reply,
        'social_post_id', r.social_post_id,
        'created_at', r.created_at,
        'updated_at', r.updated_at,
        'approved_at', r.approved_at,
        'deployed_at', r.deployed_at,
        'created_by_name', coalesce(creator.display_name, creator.email),
        'approved_by_name', coalesce(approver.display_name, approver.email),
        'deployed_by_name', coalesce(deployer.display_name, deployer.email),
        'activity', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', a.id, 'action', a.action, 'note', a.note, 'created_at', a.created_at,
            'actor_name', coalesce(actor.display_name, actor.email)
          ) order by a.created_at desc)
          from public.video_instruction_activity a
          join public.admin_users actor on actor.id = a.actor_admin_user_id
          where a.review_id = r.id
        ), '[]'::jsonb)
      )
      order by r.updated_at desc
    )
    from public.video_instruction_reviews r
    join public.admin_users creator on creator.id = r.created_by_admin_user_id
    left join public.admin_users approver on approver.id = r.approved_by_admin_user_id
    left join public.admin_users deployer on deployer.id = r.deployed_by_admin_user_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.save_video_instruction_analysis_v1(
  p_review_id uuid,
  p_transcript text,
  p_problem_summary text,
  p_proposed_fix text,
  p_expected_result text,
  p_social_reply text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user public.admin_users%rowtype;
begin
  v_user := public.video_instruction_current_user_v1();
  if v_user.id is null or v_user.role not in ('owner_admin', 'staff') then
    raise exception 'Admin or staff access required';
  end if;

  update public.video_instruction_reviews
  set transcript = left(coalesce(p_transcript, ''), 100000),
      problem_summary = left(coalesce(p_problem_summary, ''), 10000),
      proposed_fix = left(coalesce(p_proposed_fix, ''), 10000),
      expected_result = left(coalesce(p_expected_result, ''), 10000),
      social_reply = left(coalesce(p_social_reply, ''), 10000),
      status = case
        when trim(coalesce(p_proposed_fix, '')) <> '' then 'fix_proposed'
        else 'under_review'
      end,
      updated_at = now()
  where id = p_review_id;
  if not found then raise exception 'Review not found'; end if;

  insert into public.video_instruction_activity(review_id, actor_admin_user_id, action, note)
  values (p_review_id, v_user.id, 'analysis_saved', 'Transcript, problem, fix, result, and social reply updated.');
end;
$$;

create or replace function public.set_video_instruction_status_v1(
  p_review_id uuid,
  p_status text,
  p_note text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.admin_users%rowtype;
  v_review public.video_instruction_reviews%rowtype;
begin
  v_user := public.video_instruction_current_user_v1();
  if v_user.id is null or v_user.role not in ('owner_admin', 'staff') then
    raise exception 'Admin or staff access required';
  end if;
  if p_status not in ('under_review', 'awaiting_social_reply', 'rechecking', 'ready_for_approval', 'approved', 'ready_to_deploy', 'deployed', 'rejected') then
    raise exception 'Invalid review status';
  end if;
  if p_status in ('approved', 'ready_to_deploy', 'deployed', 'rejected') and v_user.role <> 'owner_admin' then
    raise exception 'Owner Admin approval required';
  end if;

  select * into v_review from public.video_instruction_reviews where id = p_review_id for update;
  if v_review.id is null then raise exception 'Review not found'; end if;
  if p_status in ('ready_for_approval', 'approved', 'ready_to_deploy', 'deployed')
     and (trim(v_review.problem_summary) = '' or trim(v_review.proposed_fix) = '' or trim(v_review.expected_result) = '') then
    raise exception 'Problem, proposed fix, and expected result are required';
  end if;

  update public.video_instruction_reviews
  set status = p_status,
      approved_by_admin_user_id = case when p_status = 'approved' then v_user.id else approved_by_admin_user_id end,
      approved_at = case when p_status = 'approved' then now() else approved_at end,
      deployed_by_admin_user_id = case when p_status = 'deployed' then v_user.id else deployed_by_admin_user_id end,
      deployed_at = case when p_status = 'deployed' then now() else deployed_at end,
      updated_at = now()
  where id = p_review_id;

  insert into public.video_instruction_activity(review_id, actor_admin_user_id, action, note)
  values (p_review_id, v_user.id, p_status, left(coalesce(p_note, ''), 2000));
end;
$$;

create or replace function public.publish_video_instruction_reply_v1(p_review_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.admin_users%rowtype;
  v_review public.video_instruction_reviews%rowtype;
  v_post_id uuid;
begin
  v_user := public.video_instruction_current_user_v1();
  if v_user.id is null or v_user.role not in ('owner_admin', 'staff') then
    raise exception 'Admin or staff access required';
  end if;
  select * into v_review from public.video_instruction_reviews where id = p_review_id for update;
  if v_review.id is null then raise exception 'Review not found'; end if;
  if trim(v_review.social_reply) = '' then raise exception 'Write the social reply first'; end if;
  if v_review.social_post_id is not null then return v_review.social_post_id; end if;

  insert into public.staff_feed_posts (
    author_admin_user_id, body, audience_type
  ) values (
    v_user.id,
    trim(v_review.social_reply) || E'\n\nUpdate: ' || v_review.title ||
      case when trim(v_review.expected_result) <> '' then E'\nExpected result: ' || trim(v_review.expected_result) else '' end,
    'everyone'
  ) returning id into v_post_id;

  update public.video_instruction_reviews
  set social_post_id = v_post_id, status = 'awaiting_social_reply', updated_at = now()
  where id = p_review_id;

  insert into public.video_instruction_activity(review_id, actor_admin_user_id, action, note)
  values (p_review_id, v_user.id, 'social_reply_posted', 'Resolution update posted to the Staff Feed.');
  return v_post_id;
end;
$$;

create or replace function public.get_video_instruction_email_event_v1(p_review_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user public.admin_users%rowtype;
  v_review public.video_instruction_reviews%rowtype;
begin
  v_user := public.video_instruction_current_user_v1();
  if v_user.id is null or v_user.role not in ('owner_admin', 'staff') then
    raise exception 'Admin or staff access required';
  end if;
  select * into v_review from public.video_instruction_reviews where id = p_review_id;
  if v_review.id is null then raise exception 'Review not found'; end if;

  return jsonb_build_object(
    'id', v_review.id,
    'title', v_review.title,
    'status', v_review.status,
    'problem_summary', v_review.problem_summary,
    'proposed_fix', v_review.proposed_fix,
    'expected_result', v_review.expected_result,
    'actor_name', coalesce(v_user.display_name, v_user.email),
    'recipients', coalesce((
      select jsonb_agg(jsonb_build_object('email', au.email, 'display_name', coalesce(au.display_name, au.email)))
      from public.admin_users au
      where au.is_active = true and au.role = 'owner_admin'
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.video_instruction_current_user_v1() from public, anon, authenticated;
revoke all on function public.create_video_instruction_v1(text, text, text, text, text) from public, anon;
revoke all on function public.create_video_instruction_from_post_v1(uuid) from public, anon;
revoke all on function public.list_video_instructions_v1() from public, anon;
revoke all on function public.save_video_instruction_analysis_v1(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.set_video_instruction_status_v1(uuid, text, text) from public, anon;
revoke all on function public.publish_video_instruction_reply_v1(uuid) from public, anon;
revoke all on function public.get_video_instruction_email_event_v1(uuid) from public, anon;

grant execute on function public.create_video_instruction_v1(text, text, text, text, text) to authenticated;
grant execute on function public.create_video_instruction_from_post_v1(uuid) to authenticated;
grant execute on function public.list_video_instructions_v1() to authenticated;
grant execute on function public.save_video_instruction_analysis_v1(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.set_video_instruction_status_v1(uuid, text, text) to authenticated;
grant execute on function public.publish_video_instruction_reply_v1(uuid) to authenticated;
grant execute on function public.get_video_instruction_email_event_v1(uuid) to authenticated;

comment on table public.video_instruction_reviews is
  'Private workflow for staff video instructions, fix analysis, approval, social follow-up, and deployment.';
