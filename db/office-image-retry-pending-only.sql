create or replace function bwb_private.claim_office_image_cleanup(p_quote_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare job record; result jsonb:='[]'; status text;
begin
 perform public.require_active_admin_role(array['owner_admin','staff']);
 for job in select * from bwb_private.office_image_cleanup where quote_request_id=p_quote_id and state in ('pending','deleting') order by image_url loop
 perform pg_advisory_xact_lock(hashtextextended(job.image_url,731));
 if job.file_path is null or bwb_private.office_image_referenced(job.image_url,job.file_path) then status:='retained';
 elsif not exists(select 1 from storage.objects where bucket_id='customer-uploads' and name=job.file_path) then status:='deleted';
 else status:='deleting'; end if;
 update bwb_private.office_image_cleanup set state=status where id=job.id;
 result:=result||jsonb_build_array(jsonb_build_object('id',job.id,'path',job.file_path,'state',status));
 end loop;
 return result;
end $$;
