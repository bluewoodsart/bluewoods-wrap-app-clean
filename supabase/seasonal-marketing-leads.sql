
create table public.bwb_marketing_contacts (
 id uuid primary key default gen_random_uuid(),
 identity_key text not null unique,
 company text not null,
 email text not null default '',
 created_at timestamptz not null default now()
);
alter table public.bwb_marketing_contacts enable row level security;
revoke all on public.bwb_marketing_contacts from public,anon,authenticated;
grant select,insert on public.bwb_marketing_contacts to authenticated;
create policy "Admins read lead contacts" on public.bwb_marketing_contacts for select to authenticated using (exists(select 1 from public.admin_users where auth_user_id=(select auth.uid()) and is_active and role in ('owner_admin','staff')));
create policy "Admins create lead contacts" on public.bwb_marketing_contacts for insert to authenticated with check (exists(select 1 from public.admin_users where auth_user_id=(select auth.uid()) and is_active and role in ('owner_admin','staff')));
alter table public.bwb_marketing_prospects
 add column contact_id uuid references public.bwb_marketing_contacts(id),
 add column scheduled_date date,
 add column agreed_price numeric(12,2) check(agreed_price>=0),
 add column deposit_paid numeric(12,2) check(deposit_paid>=0),
 add column historical_price_notes text not null default '',
 add column source_account text not null default '',
 add column source_year integer,
 add column imported_at timestamptz not null default now();
create index on public.bwb_marketing_prospects(contact_id);
alter table public.bwb_marketing_prospects drop constraint bwb_marketing_prospects_status_check;
alter table public.bwb_marketing_prospects add constraint bwb_marketing_prospects_status_check check(status in ('researched','qualified','drafted','awaiting_approval','contacted','responded','handed_off','not_a_fit','quoted','scheduled','completed','lost'));
grant update(scheduled_date,agreed_price,deposit_paid,historical_price_notes) on public.bwb_marketing_prospects to authenticated;
grant insert on public.bwb_marketing_prospects to authenticated;
create policy "Admins create campaign leads" on public.bwb_marketing_prospects for insert to authenticated with check (exists(select 1 from public.admin_users where auth_user_id=(select auth.uid()) and is_active and role in ('owner_admin','staff')));
create function public.link_marketing_contact() returns trigger language plpgsql security invoker set search_path='' as $$
declare k text;
begin
 if new.contact_id is null then
  k := lower(btrim(new.company)) || '|' || lower(btrim(new.email));
  insert into public.bwb_marketing_contacts(identity_key,company,email) values(k,new.company,new.email) on conflict(identity_key) do nothing;
  select id into new.contact_id from public.bwb_marketing_contacts where identity_key=k;
 end if;
 return new;
end; $$;
revoke all on function public.link_marketing_contact() from public,anon,authenticated;
create trigger link_marketing_contact before insert on public.bwb_marketing_prospects for each row execute function public.link_marketing_contact();
insert into public.bwb_marketing_contacts(identity_key,company,email)
 select distinct on(lower(btrim(company))||'|'||lower(btrim(email))) lower(btrim(company))||'|'||lower(btrim(email)),company,email from public.bwb_marketing_prospects;
update public.bwb_marketing_prospects p set contact_id=c.id from public.bwb_marketing_contacts c where c.identity_key=lower(btrim(p.company))||'|'||lower(btrim(p.email));
alter table public.bwb_marketing_prospects alter column contact_id set not null;

