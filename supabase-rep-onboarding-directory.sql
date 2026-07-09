drop function if exists public.list_rep_onboarding_directory_v1();

create or replace function public.list_rep_onboarding_directory_v1()
returns table (
  id uuid,
  email text,
  display_name text,
  role text,
  rep_slug text,
  is_active boolean,
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
