
create schema if not exists bwb_private;
grant usage on schema bwb_private to authenticated;
create table bwb_private.office_image_cleanup (
 id uuid primary key default gen_random_uuid(),
 quote_request_id uuid not null references public.quote_requests(id),
 image_url text not null unique,
 file_path text,
 state text not null default 'pending' check (state in ('pending','retained','deleting','deleted')),
 created_at timestamptz not null default now()
);
alter table bwb_private.office_image_cleanup enable row level security;
revoke all on bwb_private.office_image_cleanup from public,anon,authenticated;

create function bwb_private.office_image_referenced(p_url text,p_path text)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare t record; used boolean;
begin
 for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind in ('r','p') and not c.relispartition
 loop
   execute format('select exists(select 1 from public.%I r where strpos(to_jsonb(r)::text,$1)>0 or ($2 is not null and strpos(to_jsonb(r)::text,$2)>0))',t.relname)
     into used using p_url,p_path;
   if used then return true; end if;
 end loop;
 return false;
end $$;
revoke all on function bwb_private.office_image_referenced(text,text) from public,anon,authenticated;

create function bwb_private.office_image_guard()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare u text; payload text:=to_jsonb(new)::text;
begin
 for u in select distinct m[1] from regexp_matches(payload,'https://[^"[:space:]\\]+','g') m
   where m[1] like '%/storage/v1/object/public/customer-uploads/%' order by 1
 loop
   perform pg_advisory_xact_lock(hashtextextended(u,731));
   if exists(select 1 from bwb_private.office_image_cleanup where image_url=u and state in ('deleting','deleted')) then
     raise exception 'This image was removed or is being deleted. Upload the image again before attaching it.';
   end if;
 end loop;
 return new;
end $$;
revoke all on function bwb_private.office_image_guard() from public,anon,authenticated;
-- Serialize attachment creation with storage cleanup in the attachment-bearing tables.
do $$ declare t text; begin
 foreach t in array array['quote_internal_notes','quote_requests','customer_files','customer_proof_images','customer_proof_options','designer_packet_files','designer_packet_notes','quote_invoices']
 loop
   execute format('create trigger office_image_cleanup_guard before insert or update on public.%I for each row execute function bwb_private.office_image_guard()',t);
 end loop;
end $$;

