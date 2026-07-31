-- Expand the private staff-feed reaction set while preserving all existing reactions.
alter table public.staff_feed_reactions
  drop constraint if exists staff_feed_reactions_reaction_check;

alter table public.staff_feed_reactions
  add constraint staff_feed_reactions_reaction_check
  check (reaction in ('like', 'love', 'care', 'haha', 'wow', 'sad', 'angry', 'dislike'));

create or replace function public.set_staff_feed_reaction_v1(p_post_id uuid, p_reaction text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_user public.admin_users%rowtype;
begin
  v_user := public.staff_feed_current_user_v1();
  if v_user.id is null or not public.staff_feed_can_view_post_v1(p_post_id, v_user.id) then
    raise exception 'Post not available';
  end if;

  if p_reaction is null or trim(p_reaction) = '' then
    delete from public.staff_feed_reactions
    where post_id = p_post_id and admin_user_id = v_user.id;
  elsif p_reaction in ('like', 'love', 'care', 'haha', 'wow', 'sad', 'angry', 'dislike') then
    insert into public.staff_feed_reactions (post_id, admin_user_id, reaction)
    values (p_post_id, v_user.id, p_reaction)
    on conflict (post_id, admin_user_id)
    do update set reaction = excluded.reaction, updated_at = now();
  else
    raise exception 'Invalid reaction';
  end if;
end;
$$;

revoke all on function public.set_staff_feed_reaction_v1(uuid, text) from public, anon;
grant execute on function public.set_staff_feed_reaction_v1(uuid, text) to authenticated;

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
        'my_reaction', (
          select x.reaction
          from public.staff_feed_reactions x
          where x.post_id = p.id and x.admin_user_id = v_user.id
        ),
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

revoke all on function public.get_staff_feed_posts_v1(integer) from public, anon;
grant execute on function public.get_staff_feed_posts_v1(integer) to authenticated;
