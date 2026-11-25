-- Owner-only operating bills and payment records. No tax or payment execution.
begin;

create table public.bwb_vendor_bills (
  id uuid primary key default gen_random_uuid(),
  vendor text not null check (length(btrim(vendor)) between 1 and 120),
  account_label text not null default '' check (length(account_label) <= 120),
  invoice_ref text not null check (length(btrim(invoice_ref)) between 1 and 120),
  category text not null check (category in ('utilities','software','supplies','equipment','other')),
  amount_cents integer not null check (amount_cents > 0),
  bill_date date not null,
  due_date date,
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users(id)
);
create unique index bwb_vendor_bill_identity on public.bwb_vendor_bills
  (lower(btrim(vendor)), lower(btrim(account_label)), lower(btrim(invoice_ref)));

create table public.bwb_vendor_payments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bwb_vendor_bills(id),
  payment_ref text not null check (length(btrim(payment_ref)) between 1 and 120),
  amount_cents integer not null check (amount_cents > 0),
  payment_date date not null,
  status text not null check (status in ('pending','posted','failed')),
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users(id),
  status_changed_at timestamptz not null default now(),
  status_changed_by uuid not null default auth.uid() references auth.users(id)
);
create unique index bwb_vendor_payment_identity on public.bwb_vendor_payments
  (lower(btrim(payment_ref)));
create index bwb_vendor_payments_bill_id on public.bwb_vendor_payments (bill_id);

alter table public.bwb_vendor_bills enable row level security;
alter table public.bwb_vendor_payments enable row level security;
revoke all on public.bwb_vendor_bills, public.bwb_vendor_payments from public, anon, authenticated;
grant select on public.bwb_vendor_bills, public.bwb_vendor_payments to authenticated;
grant insert (vendor, account_label, invoice_ref, category, amount_cents, bill_date, due_date)
  on public.bwb_vendor_bills to authenticated;
grant insert (bill_id, payment_ref, amount_cents, payment_date, status)
  on public.bwb_vendor_payments to authenticated;
grant update (status) on public.bwb_vendor_payments to authenticated;

create policy bwb_owner_read_bills on public.bwb_vendor_bills for select to authenticated
  using ((select public.is_current_user_owner_admin()));
create policy bwb_owner_insert_bills on public.bwb_vendor_bills for insert to authenticated
  with check ((select public.is_current_user_owner_admin()) and created_by = (select auth.uid()));
create policy bwb_owner_read_payments on public.bwb_vendor_payments for select to authenticated
  using ((select public.is_current_user_owner_admin()));
create policy bwb_owner_insert_payments on public.bwb_vendor_payments for insert to authenticated
  with check ((select public.is_current_user_owner_admin()) and created_by = (select auth.uid()));
create policy bwb_owner_resolve_pending_payments on public.bwb_vendor_payments for update to authenticated
  using (status = 'pending' and (select public.is_current_user_owner_admin()))
  with check (status in ('posted','failed') and (select public.is_current_user_owner_admin()));

create function public.bwb_stamp_vendor_payment_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status <> 'pending' or new.status not in ('posted','failed') then
    raise exception 'Only pending payments can be resolved';
  end if;
  new.status_changed_at := now();
  new.status_changed_by := auth.uid();
  return new;
end;
$$;
revoke all on function public.bwb_stamp_vendor_payment_status() from public, anon, authenticated;
create trigger bwb_vendor_payment_status_audit
  before update of status on public.bwb_vendor_payments
  for each row execute function public.bwb_stamp_vendor_payment_status();

commit;
