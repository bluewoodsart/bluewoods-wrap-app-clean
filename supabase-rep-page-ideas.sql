create table if not exists public.rep_page_ideas (
  id uuid primary key default gen_random_uuid(),
  manager_admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  submitted_by_admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  rep_slug text not null,
  brand_name text not null default 'SlapWrapz',
  industry text,
  category text,
  niche text,
  page_title text,
  page_slug text,
  page_url text,
  thumbnail_url text,
  qr_png_url text,
  qr_svg_url text,
  status text not null default 'pending_review',
  is_featured boolean not null default false,
  idea_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rep_page_ideas_brand_name_check check (brand_name = 'SlapWrapz'),
  constraint rep_page_ideas_status_check check (status in ('pending_review', 'approved', 'built', 'inactive', 'rejected')),
  constraint rep_page_ideas_idea_text_length_check check (length(trim(idea_text)) between 40 and 8000),
  constraint rep_page_ideas_rep_slug_check check (rep_slug ~ '^[a-z0-9-]{1,64}$')
);

create index if not exists rep_page_ideas_manager_created_at_idx
  on public.rep_page_ideas (manager_admin_user_id, created_at desc);

create index if not exists rep_page_ideas_rep_slug_status_idx
  on public.rep_page_ideas (rep_slug, status);

drop trigger if exists set_rep_page_ideas_updated_at on public.rep_page_ideas;
create trigger set_rep_page_ideas_updated_at
before update on public.rep_page_ideas
for each row
execute function public.set_admin_users_updated_at();

alter table public.rep_page_ideas enable row level security;

revoke all on public.rep_page_ideas from public;
revoke all on public.rep_page_ideas from anon;
revoke all on public.rep_page_ideas from authenticated;

drop function if exists public.submit_rep_page_idea_v1(text, text, text, text, text);
create or replace function public.submit_rep_page_idea_v1(
  p_idea_text text,
  p_industry text default null,
  p_category text default null,
  p_niche text default null,
  p_page_title text default null
)
returns table (
  id uuid,
  rep_slug text,
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
  created_at timestamptz
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  current_manager public.admin_users%rowtype;
  inserted_idea public.rep_page_ideas%rowtype;
begin
  select *
  into current_manager
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role = 'rep_manager'
    and nullif(trim(coalesce(au.rep_slug, '')), '') is not null
  limit 1;

  if current_manager.id is null then
    raise exception 'Active rep manager access is required.';
  end if;

  if length(trim(coalesce(p_idea_text, ''))) < 40 then
    raise exception 'Please add more page direction before submitting.';
  end if;

  insert into public.rep_page_ideas (
    manager_admin_user_id,
    submitted_by_admin_user_id,
    rep_slug,
    brand_name,
    industry,
    category,
    niche,
    page_title,
    idea_text
  )
  values (
    current_manager.id,
    current_manager.id,
    lower(trim(current_manager.rep_slug)),
    'SlapWrapz',
    nullif(trim(coalesce(p_industry, '')), ''),
    nullif(trim(coalesce(p_category, '')), ''),
    nullif(trim(coalesce(p_niche, '')), ''),
    nullif(trim(coalesce(p_page_title, '')), ''),
    trim(p_idea_text)
  )
  returning * into inserted_idea;

  return query
  select
    inserted_idea.id,
    inserted_idea.rep_slug,
    inserted_idea.brand_name,
    inserted_idea.industry,
    inserted_idea.category,
    inserted_idea.niche,
    inserted_idea.page_title,
    inserted_idea.page_slug,
    inserted_idea.page_url,
    inserted_idea.thumbnail_url,
    inserted_idea.qr_png_url,
    inserted_idea.qr_svg_url,
    inserted_idea.status,
    inserted_idea.is_featured,
    inserted_idea.idea_text,
    inserted_idea.created_at;
end;
$$;

revoke all on function public.submit_rep_page_idea_v1(text, text, text, text, text) from public;
revoke all on function public.submit_rep_page_idea_v1(text, text, text, text, text) from anon;
grant execute on function public.submit_rep_page_idea_v1(text, text, text, text, text) to authenticated;

drop function if exists public.list_my_rep_page_ideas_v1();
create or replace function public.list_my_rep_page_ideas_v1()
returns table (
  id uuid,
  rep_slug text,
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
  created_at timestamptz
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  current_manager_id uuid;
begin
  select au.id
  into current_manager_id
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role = 'rep_manager'
    and nullif(trim(coalesce(au.rep_slug, '')), '') is not null
  limit 1;

  if current_manager_id is null then
    raise exception 'Active rep manager access is required.';
  end if;

  return query
  select
    rpi.id,
    rpi.rep_slug,
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
    rpi.created_at
  from public.rep_page_ideas rpi
  where rpi.manager_admin_user_id = current_manager_id
  order by rpi.created_at desc
  limit 50;
end;
$$;

revoke all on function public.list_my_rep_page_ideas_v1() from public;
revoke all on function public.list_my_rep_page_ideas_v1() from anon;
grant execute on function public.list_my_rep_page_ideas_v1() to authenticated;

drop function if exists public.set_my_rep_page_idea_featured_v1(uuid, boolean);
create or replace function public.set_my_rep_page_idea_featured_v1(
  p_idea_id uuid,
  p_is_featured boolean
)
returns table (
  id uuid,
  is_featured boolean,
  status text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  current_manager_id uuid;
  updated_idea public.rep_page_ideas%rowtype;
begin
  select au.id
  into current_manager_id
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role = 'rep_manager'
  limit 1;

  if current_manager_id is null then
    raise exception 'Active rep manager access is required.';
  end if;

  if p_is_featured is true then
    update public.rep_page_ideas
    set is_featured = false
    where manager_admin_user_id = current_manager_id
      and id <> p_idea_id;
  end if;

  update public.rep_page_ideas
  set is_featured = coalesce(p_is_featured, false)
  where id = p_idea_id
    and manager_admin_user_id = current_manager_id
  returning * into updated_idea;

  if updated_idea.id is null then
    raise exception 'Page idea not found.';
  end if;

  return query
  select updated_idea.id, updated_idea.is_featured, updated_idea.status, updated_idea.updated_at;
end;
$$;

revoke all on function public.set_my_rep_page_idea_featured_v1(uuid, boolean) from public;
revoke all on function public.set_my_rep_page_idea_featured_v1(uuid, boolean) from anon;
grant execute on function public.set_my_rep_page_idea_featured_v1(uuid, boolean) to authenticated;
