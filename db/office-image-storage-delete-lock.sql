create or replace function bwb_private.can_delete_office_image(p_bucket text,p_name text) returns boolean
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare u text;
begin
 if auth.uid() is null or p_bucket<>'customer-uploads' or not exists(select 1 from public.admin_users where auth_user_id=auth.uid() and is_active and role in ('owner_admin','staff')) then return false; end if;
 select image_url into u from bwb_private.office_image_cleanup where file_path=p_name and state='deleting';
 if u is null then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended(u,731));
 return exists(select 1 from bwb_private.office_image_cleanup q where q.image_url=u and q.state='deleting' and not bwb_private.office_image_referenced(q.image_url,q.file_path));
end $$;
do $$ declare t text; begin
 foreach t in array array['purchase_history','staff_feed_posts','aw_customer_thread_entries','bwb_campaign_assets','bwb_marketing_campaigns','designer_packets']
 loop
 execute format('create trigger office_image_cleanup_guard before insert or update on public.%I for each row execute function bwb_private.office_image_guard()',t);
 end loop;
end $$;