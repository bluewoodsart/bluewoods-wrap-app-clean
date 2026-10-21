create schema if not exists sticker_private;
revoke all on schema sticker_private from public,anon,authenticated;
create table sticker_private.generator_config(id boolean primary key default true check(id),secret_hash text not null);
create table sticker_private.generator_usage(day date not null, visitor text not null, attempts integer not null default 0, primary key(day,visitor));
alter table sticker_private.generator_config enable row level security;
alter table sticker_private.generator_usage enable row level security;
revoke all on all tables in schema sticker_private from public,anon,authenticated;
-- This public RPC is intentionally usable by the server without a service-role key.
-- It checks a separate server credential before reading or writing private quota counters.
create function public.reserve_sticker_preview(server_secret text, visitor_hash text) returns boolean
language plpgsql security definer set search_path='' as $$
declare total_used integer; visitor_used integer; today date := (now() at time zone 'America/New_York')::date;
begin
 if length(server_secret)<>64 or visitor_hash !~ '^[a-f0-9]{64}$' then return false; end if;
 if not exists(select 1 from sticker_private.generator_config where secret_hash=encode(sha256(convert_to(server_secret,'UTF8')),'hex')) then return false; end if;
 perform pg_advisory_xact_lock(81520421);
 delete from sticker_private.generator_usage where day<today-2;
 select coalesce(sum(attempts),0) into total_used from sticker_private.generator_usage where day=today;
 select coalesce(attempts,0) into visitor_used from sticker_private.generator_usage where day=today and visitor=visitor_hash;
 if total_used>=20 or coalesce(visitor_used,0)>=2 then return false; end if;
 insert into sticker_private.generator_usage(day,visitor,attempts) values(today,visitor_hash,1)
 on conflict(day,visitor) do update set attempts=sticker_private.generator_usage.attempts+1;
 return true;
end; $$;
revoke all on function public.reserve_sticker_preview(text,text) from public;
grant execute on function public.reserve_sticker_preview(text,text) to anon;
