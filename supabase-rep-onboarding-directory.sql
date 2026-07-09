drop function if exists public.list_rep_onboarding_directory_v1();

create or replace function public.list_rep_onboarding_directory_v1()
returns table (
  id uuid,
  email text,
  display_name text,
  role text,
  rep_slug text,
  is_active boolean,
  auth_linked boolean,
  manager_admin_user_id uuid,
  manager_display_name text,
  rep_manager_status text,
  max_child_reps integer,
  child_rep_count integer,
  assigned_quote_count integer,
  page_idea_count integer,
  built_page_count integer,
  latest_page_idea_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  current_admin_role text;
begin
  select au.role
  into current_admin_role
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role in ('owner_admin', 'staff')
  limit 1;

  if current_admin_role is null then
    raise exception 'Owner or staff admin access is required.';
  end if;

  return query
  select
    au.id,
    au.email,
    au.display_name,
    au.role,
    au.rep_slug,
    au.is_active,
    au.auth_user_id is not null as auth_linked,
    au.manager_admin_user_id,
    manager.display_name as manager_display_name,
    au.rep_manager_status,
    au.max_child_reps,
    (
      select count(*)::integer
      from public.admin_users child
      where child.manager_admin_user_id = au.id
        and child.role = 'sales_rep'
        and child.is_active = true
    ) as child_rep_count,
    (
      select count(*)::integer
      from public.quote_requests qr
      where lower(trim(coalesce(qr.rep_slug, ''))) = lower(trim(coalesce(au.rep_slug, '')))
    ) as assigned_quote_count,
    (
      select count(*)::integer
      from public.rep_page_ideas rpi
      where lower(trim(coalesce(rpi.rep_slug, ''))) = lower(trim(coalesce(au.rep_slug, '')))
    ) as page_idea_count,
    (
      select count(*)::integer
      from public.rep_page_ideas rpi
      where lower(trim(coalesce(rpi.rep_slug, ''))) = lower(trim(coalesce(au.rep_slug, '')))
        and rpi.status = 'built'
    ) as built_page_count,
    (
      select max(rpi.created_at)
      from public.rep_page_ideas rpi
      where lower(trim(coalesce(rpi.rep_slug, ''))) = lower(trim(coalesce(au.rep_slug, '')))
    ) as latest_page_idea_at,
    au.created_at
  from public.admin_users au
  left join public.admin_users manager on manager.id = au.manager_admin_user_id
  where au.role in ('sales_rep', 'rep_manager')
  order by
    case au.role when 'rep_manager' then 0 else 1 end,
    au.is_active desc,
    coalesce(au.display_name, au.email);
end;
$$;

revoke all on function public.list_rep_onboarding_directory_v1() from public;
revoke all on function public.list_rep_onboarding_directory_v1() from anon;
grant execute on function public.list_rep_onboarding_directory_v1() to authenticated;

drop function if exists public.create_admin_rep_onboarding_v1(text, text, text, text);

create or replace function public.create_admin_rep_onboarding_v1(
  p_display_name text,
  p_email text,
  p_role text,
  p_rep_slug text
)
returns table (
  id uuid,
  email text,
  display_name text,
  role text,
  rep_slug text,
  is_active boolean,
  auth_linked boolean
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  current_admin_role text;
  normalized_email text := lower(trim(coalesce(p_email, '')));
  normalized_name text := nullif(trim(coalesce(p_display_name, '')), '');
  normalized_role text := lower(trim(coalesce(p_role, 'sales_rep')));
  normalized_slug text := lower(regexp_replace(trim(coalesce(p_rep_slug, '')), '[^a-zA-Z0-9]+', '-', 'g'));
begin
  select au.role
  into current_admin_role
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role in ('owner_admin', 'staff')
  limit 1;

  if current_admin_role is null then
    raise exception 'Owner or staff admin access is required.';
  end if;

  normalized_slug := regexp_replace(normalized_slug, '(^-+|-+$)', '', 'g');

  if normalized_name is null then
    raise exception 'Rep name is required.';
  end if;

  if normalized_email = '' or normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid rep email is required.';
  end if;

  if normalized_role not in ('sales_rep', 'rep_manager') then
    raise exception 'Rep role must be sales_rep or rep_manager.';
  end if;

  if normalized_slug = '' then
    normalized_slug := lower(regexp_replace(normalized_name, '[^a-zA-Z0-9]+', '-', 'g'));
    normalized_slug := regexp_replace(normalized_slug, '(^-+|-+$)', '', 'g');
  end if;

  if normalized_slug = '' then
    raise exception 'Rep slug is required.';
  end if;

  return query
  insert into public.admin_users (
    auth_user_id,
    email,
    display_name,
    role,
    rep_slug,
    is_active,
    rep_manager_status,
    max_child_reps
  )
  values (
    (
      select u.id
      from auth.users u
      where lower(u.email) = normalized_email
      limit 1
    ),
    normalized_email,
    normalized_name,
    normalized_role,
    normalized_slug,
    true,
    'starter',
    case when normalized_role = 'rep_manager' then 5 else 0 end
  )
  on conflict (email) do update
  set display_name = excluded.display_name,
      role = excluded.role,
      rep_slug = excluded.rep_slug,
      auth_user_id = coalesce(
        admin_users.auth_user_id,
        (
          select u.id
          from auth.users u
          where lower(u.email) = normalized_email
          limit 1
        )
      ),
      is_active = true,
      rep_manager_status = excluded.rep_manager_status,
      max_child_reps = excluded.max_child_reps,
      updated_at = now()
  returning
    admin_users.id,
    admin_users.email,
    admin_users.display_name,
    admin_users.role,
    admin_users.rep_slug,
    admin_users.is_active,
    admin_users.auth_user_id is not null as auth_linked;
end;
$$;

revoke all on function public.create_admin_rep_onboarding_v1(text, text, text, text) from public;
revoke all on function public.create_admin_rep_onboarding_v1(text, text, text, text) from anon;
grant execute on function public.create_admin_rep_onboarding_v1(text, text, text, text) to authenticated;
