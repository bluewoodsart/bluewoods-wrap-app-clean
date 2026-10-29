create or replace function public.get_customer_proof_email_target_v1(p_quote_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u public.admin_users%rowtype; q public.quote_requests%rowtype; t text; n integer;
begin
  select * into u from public.admin_users where auth_user_id=auth.uid() and is_active=true limit 1;
  if u.id is null or u.role not in ('owner_admin','staff','sales_rep','rep_manager') then raise exception 'Active staff or rep access is required.'; end if;
  select * into q from public.quote_requests where id=p_quote_id;
  if q.id is null then raise exception 'Order not found.'; end if;
  if u.role not in ('owner_admin','staff') and not (
    (nullif(trim(u.rep_slug),'') is not null and lower(trim(u.rep_slug))=lower(trim(q.rep_slug)))
    or (u.role='rep_manager' and exists(select 1 from public.admin_users child where child.manager_admin_user_id=u.id and child.is_active=true and nullif(trim(child.rep_slug),'') is not null and lower(trim(child.rep_slug))=lower(trim(q.rep_slug))))
  ) is true then raise exception 'This order is not assigned to your rep account.'; end if;
  select token into t from public.quote_customer_proof_tokens where quote_request_id=q.id and status='active' order by created_at desc limit 1;
  if t is null then raise exception 'Save Proof Portal to create a proof link first.'; end if;
  if q.customer_proof_mode='multi' then
    select count(*) into n from public.customer_proof_options where quote_request_id=q.id and is_active=true;
  else
    select count(*) into n from public.customer_proof_images where quote_request_id=q.id and is_active=true;
    if n=0 and nullif(trim(q.customer_proof_image_url),'') is not null then n:=1; end if;
  end if;
  if n=0 then raise exception 'Add at least one customer proof before sending.'; end if;
  return jsonb_build_object('id',q.id,'quote_id',q.quote_id,'customer_name',q.customer_name,'customer_email',q.customer_email,'token',t,'user_role',u.role);
end $$;
revoke all on function public.get_customer_proof_email_target_v1(uuid) from public,anon;
grant execute on function public.get_customer_proof_email_target_v1(uuid) to authenticated;
