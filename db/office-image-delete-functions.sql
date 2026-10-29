create function bwb_private.prepare_office_image_delete(p_quote_id uuid,p_note_id uuid,p_urls text[]) returns void language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare body text; data jsonb; imgs jsonb; kept jsonb; u text; path text; qcode text;
begin
 perform public.require_active_admin_role(array['owner_admin','staff']);
 if coalesce(cardinality(p_urls),0) not between 1 and 50 then raise exception 'Select 1 to 50 images'; end if;
 select quote_id into qcode from public.quote_requests where id=p_quote_id;
 select note_text into body from public.quote_internal_notes where id=p_note_id and quote_request_id=p_quote_id for update;
 if body is null or split_part(body,E'\n',1)<>'[[SLAPWRAPZ_UPSELL_IDEA_V1]]' then raise exception 'Image group not found. Refresh and try again.'; end if;
 data:=substring(body from strpos(body,E'\n')+1)::jsonb;
 imgs:=data->'images';
 if jsonb_typeof(imgs) is distinct from 'array' or jsonb_array_length(imgs)=0 then
 imgs:=jsonb_build_array(jsonb_build_object('url',data->>'imageUrl','name',data->>'imageName')); end if;
 for u in select distinct x->>'url' from jsonb_array_elements(imgs) x order by 1 loop
 perform pg_advisory_xact_lock(hashtextextended(u,731));
 end loop;
 if exists(select 1 from unnest(p_urls) selected where selected is null or not exists(select 1 from jsonb_array_elements(imgs) x where x->>'url'=selected)) then raise exception 'An image changed. Refresh and try again.'; end if;
 foreach u in array p_urls loop
 path:=null;
 if u like 'https://xggbfpfaxyfqvskmsszi.supabase.co/storage/v1/object/public/customer-uploads/%' then
 path:=substring(u from length('https://xggbfpfaxyfqvskmsszi.supabase.co/storage/v1/object/public/customer-uploads/')+1);
 if path !~ '^[A-Za-z0-9_./-]+$' or path ~ '(^|/)\.\.?(/|$)' or path like '%//%' then path:=null; end if;
 end if;
 insert into bwb_private.office_image_cleanup(quote_request_id,image_url,file_path,state) values(p_quote_id,u,path,case when path is null then 'retained' else 'pending' end)
 on conflict(image_url) do update set quote_request_id=excluded.quote_request_id, state=case when bwb_private.office_image_cleanup.state='deleted' then 'deleted' else excluded.state end;
 delete from public.customer_files where file_url=u and quote_id in (qcode,p_quote_id::text) and tags @> array['office_dialogue']::text[];
 end loop;
 select coalesce(jsonb_agg(x order by ord),'[]'::jsonb) into kept from jsonb_array_elements(imgs) with ordinality a(x,ord) where not(x->>'url'=any(p_urls));
 if jsonb_array_length(kept)=0 then
 if nullif(btrim(data->>'message'),'') is null then
 delete from public.quote_internal_notes where id=p_note_id;
 else update public.quote_internal_notes set note_text=(data->>'message')||E'\n[Image attachments removed.]' where id=p_note_id; end if;
 else
 data:=jsonb_set(jsonb_set(jsonb_set(data,'{images}',kept),'{imageUrl}',kept->0->'url'),'{imageName}',coalesce(kept->0->'name','""'::jsonb));
 update public.quote_internal_notes set note_text='[[SLAPWRAPZ_UPSELL_IDEA_V1]]'||E'\n'||data::text where id=p_note_id;
 end if;
end $$;
revoke all on function bwb_private.prepare_office_image_delete(uuid,uuid,text[]) from public,anon;
grant execute on function bwb_private.prepare_office_image_delete(uuid,uuid,text[]) to authenticated;

create function bwb_private.claim_office_image_cleanup(p_quote_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare job record; result jsonb:='[]'; status text;
begin
 perform public.require_active_admin_role(array['owner_admin','staff']);
 for job in select * from bwb_private.office_image_cleanup where quote_request_id=p_quote_id and state<>'deleted' order by image_url limit 50 loop
 perform pg_advisory_xact_lock(hashtextextended(job.image_url,731));
 if job.file_path is null or bwb_private.office_image_referenced(job.image_url,job.file_path) then status:='retained';
 elsif not exists(select 1 from storage.objects where bucket_id='customer-uploads' and name=job.file_path) then status:='deleted';
 else status:='deleting'; end if;
 update bwb_private.office_image_cleanup set state=status where id=job.id;
 result:=result||jsonb_build_array(jsonb_build_object('id',job.id,'path',job.file_path,'state',status));
 end loop;
 return result;
end $$;
create function bwb_private.finish_office_image_cleanup(p_job_id uuid) returns text
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare job bwb_private.office_image_cleanup; status text;
begin
 perform public.require_active_admin_role(array['owner_admin','staff']);
 select * into job from bwb_private.office_image_cleanup where id=p_job_id;
 if not found then raise exception 'Cleanup job not found'; end if;
 perform pg_advisory_xact_lock(hashtextextended(job.image_url,731));
 select * into job from bwb_private.office_image_cleanup where id=p_job_id for update;
 if job.state<>'deleting' then return job.state; end if;
 if exists(select 1 from storage.objects where bucket_id='customer-uploads' and name=job.file_path) then status:='pending'; else status:='deleted'; end if;
 update bwb_private.office_image_cleanup set state=status where id=p_job_id;
 return status;
end $$;
create function bwb_private.can_delete_office_image(p_bucket text,p_name text) returns boolean
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
 if auth.uid() is null or p_bucket<>'customer-uploads' or not exists(select 1 from public.admin_users where auth_user_id=auth.uid() and is_active and role in ('owner_admin','staff')) then return false; end if;
 return exists(select 1 from bwb_private.office_image_cleanup q where q.file_path=p_name and q.state='deleting' and not bwb_private.office_image_referenced(q.image_url,q.file_path));
end $$;
revoke all on function bwb_private.claim_office_image_cleanup(uuid),bwb_private.finish_office_image_cleanup(uuid),bwb_private.can_delete_office_image(text,text) from public,anon;
grant execute on function bwb_private.claim_office_image_cleanup(uuid),bwb_private.finish_office_image_cleanup(uuid),bwb_private.can_delete_office_image(text,text) to authenticated;
create policy "Staff delete queued unused office images" on storage.objects for delete to authenticated using (bwb_private.can_delete_office_image(bucket_id,name));
create function public.prepare_office_image_delete_v1(p_quote_id uuid,p_note_id uuid,p_urls text[]) returns void language sql security invoker set search_path='' as $$ select bwb_private.prepare_office_image_delete(p_quote_id,p_note_id,p_urls); $$;
create function public.claim_office_image_cleanup_v1(p_quote_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select bwb_private.claim_office_image_cleanup(p_quote_id); $$;
create function public.finish_office_image_cleanup_v1(p_job_id uuid) returns text language sql security invoker set search_path='' as $$ select bwb_private.finish_office_image_cleanup(p_job_id); $$;
revoke all on function public.prepare_office_image_delete_v1(uuid,uuid,text[]),public.claim_office_image_cleanup_v1(uuid),public.finish_office_image_cleanup_v1(uuid) from public,anon;
grant execute on function public.prepare_office_image_delete_v1(uuid,uuid,text[]),public.claim_office_image_cleanup_v1(uuid),public.finish_office_image_cleanup_v1(uuid) to authenticated;
