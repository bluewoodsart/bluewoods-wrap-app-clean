-- REVIEWED SETUP SCRIPT ONLY: not applied automatically.
-- Stores public Stripe payment URLs. Never store Stripe secret keys here.
begin;
create table public.bwb_sticker_store_settings (
  id text primary key check (id = 'default'),
  pickup_payment_link text not null default '',
  mail_payment_link text not null default '',
  updated_at timestamptz not null default now(),
  constraint pickup_stripe_url check (pickup_payment_link = '' or pickup_payment_link ~ '^https://buy[.]stripe[.]com/[A-Za-z0-9_]+$'),
  constraint mail_stripe_url check (mail_payment_link = '' or mail_payment_link ~ '^https://buy[.]stripe[.]com/[A-Za-z0-9_]+$')
);
alter table public.bwb_sticker_store_settings enable row level security;
revoke all on public.bwb_sticker_store_settings from anon, authenticated;
grant select, update on public.bwb_sticker_store_settings to authenticated;
create policy sticker_settings_owner_read on public.bwb_sticker_store_settings
  for select to authenticated using (exists (
    select 1 from public.admin_users a where a.auth_user_id = (select auth.uid()) and a.is_active and a.role = 'owner_admin'
  ));
create policy sticker_settings_owner_update on public.bwb_sticker_store_settings
  for update to authenticated using (exists (
    select 1 from public.admin_users a where a.auth_user_id = (select auth.uid()) and a.is_active and a.role = 'owner_admin'
  )) with check (exists (
    select 1 from public.admin_users a where a.auth_user_id = (select auth.uid()) and a.is_active and a.role = 'owner_admin'
  ));
insert into public.bwb_sticker_store_settings(id) values ('default');
commit;