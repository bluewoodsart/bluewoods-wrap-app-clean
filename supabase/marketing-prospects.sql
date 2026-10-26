-- Protected prospect research and reusable marketing playbooks.
create table public.bwb_marketing_playbooks (
  key text primary key,
  title text not null,
  description text not null,
  instructions text not null,
  created_at timestamptz not null default now()
);
create table public.bwb_marketing_prospects (
  id uuid primary key default gen_random_uuid(),
  playbook_key text not null references public.bwb_marketing_playbooks(key),
  source_id text not null,
  company text not null,
  location text not null default '',
  email text not null default '',
  phone text not null default '',
  website text not null default '',
  social_profiles jsonb not null default '{}'::jsonb,
  fit text not null default '',
  research_notes text not null default '',
  contact_source text not null default '',
  social_evidence text not null default '',
  researched_on date,
  status text not null default 'researched' check (status in ('researched','qualified','drafted','awaiting_approval','contacted','responded','handed_off','not_a_fit')),
  staff_notes text not null default '',
  email_draft text not null default '',
  updated_at timestamptz not null default now(),
  unique(playbook_key, source_id)
);
alter table public.bwb_marketing_playbooks enable row level security;
alter table public.bwb_marketing_prospects enable row level security;
revoke all on public.bwb_marketing_playbooks, public.bwb_marketing_prospects from public, anon, authenticated;
grant select on public.bwb_marketing_playbooks, public.bwb_marketing_prospects to authenticated;
grant update(status, staff_notes, email_draft) on public.bwb_marketing_prospects to authenticated;
create policy "BWB admins read marketing playbooks" on public.bwb_marketing_playbooks for select to authenticated
using (exists(select 1 from public.admin_users au where au.auth_user_id=(select auth.uid()) and au.is_active and au.role in ('owner_admin','staff')));
create policy "BWB admins read marketing prospects" on public.bwb_marketing_prospects for select to authenticated
using (exists(select 1 from public.admin_users au where au.auth_user_id=(select auth.uid()) and au.is_active and au.role in ('owner_admin','staff')));
create policy "BWB admins update marketing prospects" on public.bwb_marketing_prospects for update to authenticated
using (exists(select 1 from public.admin_users au where au.auth_user_id=(select auth.uid()) and au.is_active and au.role in ('owner_admin','staff')))
with check (exists(select 1 from public.admin_users au where au.auth_user_id=(select auth.uid()) and au.is_active and au.role in ('owner_admin','staff')));
create function public.touch_bwb_marketing_prospect() returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = clock_timestamp(); return new; end;
$$;
revoke all on function public.touch_bwb_marketing_prospect() from public, anon, authenticated;
create trigger touch_bwb_marketing_prospect before update on public.bwb_marketing_prospects for each row execute function public.touch_bwb_marketing_prospect();
