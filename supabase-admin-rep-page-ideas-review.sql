drop function if exists public.list_admin_rep_page_ideas_v1(text);

create or replace function public.list_admin_rep_page_ideas_v1(
  p_rep_slug text default null
)
returns table (
  id uuid,
  rep_slug text,
  rep_name text,
  rep_email text,
  brand_name text,
  industry text,
  category text,
  niche text,
  page_title text,
  page_slug text,
  page_url text,
  thumbnail_url text,
  qr_png_url text,
  qr_svg_url text,
  status text,
  is_featured boolean,
  idea_text text,
  created_at timestamptz,
  updated_at timestamptz
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
    rpi.id,
    rpi.rep_slug,
    coalesce(au.display_name, rpi.rep_slug) as rep_name,
    au.email as rep_email,
    rpi.brand_name,
    rpi.industry,
    rpi.category,
    rpi.niche,
    rpi.page_title,
    rpi.page_slug,
    rpi.page_url,
    rpi.thumbnail_url,
    rpi.qr_png_url,
    rpi.qr_svg_url,
    rpi.status,
    rpi.is_featured,
    rpi.idea_text,
    rpi.created_at,
    rpi.updated_at
  from public.rep_page_ideas rpi
  left join public.admin_users au
    on au.id = rpi.submitted_by_admin_user_id
  where nullif(trim(coalesce(p_rep_slug, '')), '') is null
    or rpi.rep_slug = lower(trim(p_rep_slug))
  order by
    case rpi.status when 'pending_review' then 0 when 'approved' then 1 when 'built' then 2 else 3 end,
    rpi.created_at desc
  limit 100;
end;
$$;

revoke all on function public.list_admin_rep_page_ideas_v1(text) from public;
revoke all on function public.list_admin_rep_page_ideas_v1(text) from anon;
grant execute on function public.list_admin_rep_page_ideas_v1(text) to authenticated;

drop function if exists public.update_admin_rep_page_idea_status_v1(uuid, text);

create or replace function public.update_admin_rep_page_idea_status_v1(
  p_idea_id uuid,
  p_status text
)
returns table (
  id uuid,
  status text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  current_admin_role text;
  updated_idea public.rep_page_ideas%rowtype;
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

  if p_status not in ('pending_review', 'approved', 'rejected', 'built', 'inactive') then
    raise exception 'Unsupported page idea status.';
  end if;

  update public.rep_page_ideas
  set
    status = p_status,
    updated_at = now()
  where id = p_idea_id
  returning * into updated_idea;

  if updated_idea.id is null then
    raise exception 'Rep page idea not found.';
  end if;

  return query
  select updated_idea.id, updated_idea.status, updated_idea.updated_at;
end;
$$;

revoke all on function public.update_admin_rep_page_idea_status_v1(uuid, text) from public;
revoke all on function public.update_admin_rep_page_idea_status_v1(uuid, text) from anon;
grant execute on function public.update_admin_rep_page_idea_status_v1(uuid, text) to authenticated;
