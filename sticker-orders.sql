create table public.bwb_sticker_orders (
  id uuid primary key,
  token_hash text not null,
  artwork_path text not null,
  artwork_sha256 text not null,
  delivery text not null check (delivery in ('mail','pickup')),
  amount_total integer not null check (amount_total in (1000,1111)),
  status text not null default 'pending' check (status in ('pending','paid','expired')),
  stripe_session_id text unique,
  stripe_mode text not null check (stripe_mode in ('test','live')),
  customer_email text,
  customer_name text,
  shipping_address jsonb,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.bwb_sticker_orders enable row level security;
revoke all on public.bwb_sticker_orders from anon, authenticated;
grant select on public.bwb_sticker_orders to authenticated;
grant all on public.bwb_sticker_orders to service_role;
create policy sticker_orders_owner_read on public.bwb_sticker_orders for select to authenticated
using (exists (select 1 from public.admin_users a where a.auth_user_id=(select auth.uid()) and a.is_active and a.role='owner_admin'));
create index bwb_sticker_orders_created_idx on public.bwb_sticker_orders(created_at desc);

create table public.bwb_sticker_rate_limits (key text primary key, count integer not null, started_at timestamptz not null default now());
alter table public.bwb_sticker_rate_limits enable row level security;
revoke all on public.bwb_sticker_rate_limits from anon, authenticated;
grant all on public.bwb_sticker_rate_limits to service_role;
create function public.bwb_sticker_rate_limit(rate_key text) returns boolean language plpgsql security invoker set search_path=public as $$
declare hits integer;
begin
 delete from public.bwb_sticker_rate_limits where started_at < now()-interval '2 hours';
 insert into public.bwb_sticker_rate_limits(key,count) values(rate_key,1)
 on conflict(key) do update set count=bwb_sticker_rate_limits.count+1 returning count into hits;
 return hits<=10;
end; $$;
revoke all on function public.bwb_sticker_rate_limit(text) from public,anon,authenticated;
grant execute on function public.bwb_sticker_rate_limit(text) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('sticker-artwork','sticker-artwork',false,2097152,array['image/png']);
create policy sticker_artwork_owner_read on storage.objects for select to authenticated
using (bucket_id='sticker-artwork' and exists(select 1 from public.admin_users a where a.auth_user_id=(select auth.uid()) and a.is_active and a.role='owner_admin'));
