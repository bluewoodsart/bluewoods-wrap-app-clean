-- Jarrel is the active rep-page test lane.
-- His page ideas are auto-approved for testing; other reps still require owner review.

create or replace function public.submit_rep_page_idea_v1(
  p_idea_text text,
  p_industry text default null::text,
  p_category text default null::text,
  p_niche text default null::text,
  p_page_title text default null::text
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
  created_at timestamp with time zone
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  current_rep public.admin_users%rowtype;
  inserted_idea public.rep_page_ideas%rowtype;
  next_status text;
begin
  select *
  into current_rep
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role in ('sales_rep', 'rep_manager')
    and nullif(trim(coalesce(au.rep_slug, '')), '') is not null
  limit 1;

  if current_rep.id is null then
    raise exception 'Active rep access is required.';
  end if;

  if length(trim(coalesce(p_idea_text, ''))) < 40 then
    raise exception 'Please add more page direction before submitting.';
  end if;

  next_status := case
    when lower(trim(current_rep.rep_slug)) = 'jarrel' then 'approved'
    else 'pending_review'
  end;

  insert into public.rep_page_ideas (
    manager_admin_user_id,
    submitted_by_admin_user_id,
    rep_slug,
    brand_name,
    industry,
    category,
    niche,
    page_title,
    idea_text,
    status
  )
  values (
    current_rep.id,
    current_rep.id,
    lower(trim(current_rep.rep_slug)),
    'SlapWrapz',
    nullif(trim(coalesce(p_industry, '')), ''),
    nullif(trim(coalesce(p_category, '')), ''),
    nullif(trim(coalesce(p_niche, '')), ''),
    nullif(trim(coalesce(p_page_title, '')), ''),
    trim(p_idea_text),
    next_status
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
$function$;
