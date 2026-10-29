-- Draft installation script. Validate on a test database before deployment.
-- Storage bytes must be deleted via the Storage API, never by deleting storage.objects.
create table public.office_image_cleanup (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id),
  note_id uuid not null,
  image_url text not null,
  status text not null default 'pending' check (status in ('pending','deleted','retained','failed')),
  created_at timestamptz not null default now(),
  unique(note_id,image_url)
);
alter table public.office_image_cleanup enable row level security;
revoke all on public.office_image_cleanup from public, anon, authenticated;
grant all on public.office_image_cleanup to service_role;

create or replace function public.prepare_office_image_delete_admin(p_quote_id uuid,p_note_id uuid,p_urls text[])
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
  n public.quote_internal_notes%rowtype;
  idea jsonb;
  imgs jsonb;
  kept jsonb;
  u text;
begin
  perform public.require_active_admin_role(array['owner_admin','staff']);
  if coalesce(cardinality(p_urls),0) < 1 or cardinality(p_urls)>50 then raise exception 'Select 1 to 50 images.'; end if;
  select * into n from public.quote_internal_notes where id=p_note_id and quote_request_id=p_quote_id for update;
  if not found then raise exception 'Message not found.'; end if;
  if left(n.note_text,length('[[SLAPWRAPZ_UPSELL_IDEA_V1]]')) <> '[[SLAPWRAPZ_UPSELL_IDEA_V1]]' then raise exception 'Not an image message.'; end if;
  idea := substring(n.note_text from position(E'\n' in n.note_text)+1)::jsonb;
  imgs := case when jsonb_typeof(idea->'images')='array' and jsonb_array_length(idea->'images')>0
    then idea->'images' else jsonb_build_array(jsonb_build_object('url',idea->>'imageUrl','name',idea->>'imageName')) end;
  foreach u in array p_urls loop
    if not exists(select 1 from jsonb_array_elements(imgs) x where x->>'url'=u) then raise exception 'Selection changed. Refresh the order.'; end if;
    insert into public.office_image_cleanup(quote_request_id,note_id,image_url) values(p_quote_id,p_note_id,u)
      on conflict(note_id,image_url) do update set status='pending';
  end loop;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into kept from jsonb_array_elements(imgs) x where not (x->>'url'=any(p_urls));
  if jsonb_array_length(kept)=0 then
    update public.quote_internal_notes set note_text=coalesce(idea->>'title','Images') || E'\n' ||
      coalesce(idea->>'message','') || E'\n[Image attachments removed by staff.]' where id=p_note_id;
  else
    idea := (idea - 'imageUrl' - 'imageName') || jsonb_build_object('images',kept,'imageUrl',kept->0->>'url','imageName',kept->0->>'name');
    update public.quote_internal_notes set note_text='[[SLAPWRAPZ_UPSELL_IDEA_V1]]' || E'\n' || idea::text where id=p_note_id;
  end if;
end $$;
revoke all on function public.prepare_office_image_delete_admin(uuid,uuid,text[]) from public,anon;
grant execute on function public.prepare_office_image_delete_admin(uuid,uuid,text[]) to authenticated;

-- Conservative scan: retain a file whenever any application table still mentions
-- its URL or storage path, including proof history, quote uploads and file indexes.
-- Only the backend service role may invoke this function.
create or replace function public.office_image_has_references(p_url text,p_path text)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare t record; used boolean;
begin
  if coalesce(length(p_url),0)<10 or coalesce(length(p_path),0)<5 then return true; end if;
  for t in select c.relname from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') and not c.relispartition
    and c.relname <> 'office_image_cleanup'
  loop
    execute format('select exists(select 1 from public.%I r where strpos(to_jsonb(r)::text,$1)>0 or strpos(to_jsonb(r)::text,$2)>0)',t.relname)
      into used using p_url,p_path;
    if used then return true; end if;
  end loop;
  return false;
end $$;
revoke all on function public.office_image_has_references(text,text) from public,anon,authenticated;
grant execute on function public.office_image_has_references(text,text) to service_role;
