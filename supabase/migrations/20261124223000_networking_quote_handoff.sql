-- Save a real, unsent CRM quote before showing a networking prospect in Quote phase.
-- Keep the original research, episode, contact history, and status on the source record.
alter table public.business_network_leads
  add column if not exists quote_request_id uuid
  references public.quote_requests(id) on delete set null;

create unique index if not exists business_network_leads_quote_request_idx
  on public.business_network_leads (quote_request_id)
  where quote_request_id is not null;

-- Quote inserts and office notes are restricted by the existing CRM policies.
-- Keep the privileged transaction in a non-API schema, and expose only an
-- authenticated invoker wrapper. The private function checks the active role too.
create schema if not exists bwb_internal;
revoke all on schema bwb_internal from public, anon;
grant usage on schema bwb_internal to authenticated;

create or replace function bwb_internal.convert_networking_lead_to_quote(
  p_lead_id uuid, p_name text, p_company text, p_email text, p_phone text,
  p_preferred_contact text, p_service text, p_quantity integer,
  p_dimensions text, p_deadline date, p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead public.business_network_leads%rowtype;
  v_quote_id uuid;
  v_product text;
  v_name text := btrim(coalesce(p_name, ''));
  v_company text := btrim(coalesce(p_company, ''));
  v_email text := nullif(btrim(p_email), '');
  v_phone text := nullif(btrim(p_phone), '');
  v_dimensions text := btrim(coalesce(p_dimensions, ''));
  v_notes text := btrim(coalesce(p_notes, ''));
begin
  if auth.uid() is null then
    raise exception 'Staff sign-in is required.' using errcode = '42501';
  end if;
  perform public.require_active_admin_role(array['owner_admin', 'staff']);

  -- Serialize the handoff per source, including simultaneous clicks or retries
  -- after a client loses its save response.
  select * into v_lead from public.business_network_leads
    where id = p_lead_id for update;
  if not found then raise exception 'Networking lead was not found.'; end if;
  if v_lead.quote_request_id is not null then return v_lead.quote_request_id; end if;
  if v_lead.verification_status <> 'verified' then
    raise exception 'Verify this networking lead before moving it to Quote.';
  end if;

  if length(v_name) not between 1 and 200 or length(v_company) > 200
      or length(v_notes) not between 1 and 10000 or length(v_dimensions) > 200
      or p_quantity is null or p_quantity < 1 then
    raise exception 'Enter a name, project description, and valid quantity and dimensions.';
  end if;
  if (v_email is not null and (length(v_email) > 320 or
        v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'))
      or (v_phone is not null and (length(v_phone) > 50 or
        length(regexp_replace(v_phone, '[^0-9]', '', 'g')) < 7))
      or p_preferred_contact is null or p_preferred_contact not in ('email', 'call', 'text')
      or (p_preferred_contact = 'email' and v_email is null)
      or (p_preferred_contact in ('call', 'text') and v_phone is null) then
    raise exception 'Enter a valid detail for the selected contact method.';
  end if;
  v_product := case p_service
    when 'Vehicle Wraps' then 'wrap'
    when 'Custom Banners' then 'banner'
    when 'Stickers & Decals' then 'decal'
    when 'Vehicle Magnets' then 'sign'
    when 'Business Signs' then 'sign'
    when 'Window Graphics' then 'sign'
    when 'Other Project' then 'other'
    else null
  end;
  if v_product is null then raise exception 'Select a quote service.'; end if;

  insert into public.quote_requests (
    quote_id, customer_name, customer_email, customer_phone, preferred_contact,
    product_type, status, source, quote_data, uploaded_files
  ) values (
    'ADMIN-' || gen_random_uuid()::text, v_name, v_email, v_phone, p_preferred_contact,
    v_product, 'new', 'business-card-networking',
    jsonb_build_object(
      'intakeType', 'networking_handoff', 'selectedService', p_service,
      'companyName', v_company, 'businessName', v_company, 'productType', v_product,
      'quantity', p_quantity, 'dimensions', v_dimensions, 'deadline', p_deadline, 'notes', v_notes
    ), '[]'::jsonb
  ) returning id into v_quote_id;

  -- Networking notes are office-only, never included in the customer quote data.
  insert into public.quote_internal_notes (quote_request_id, note_text, created_by)
  values (v_quote_id, concat_ws(E'\n',
    'Origin: Networking (' || v_lead.business_name || ')',
    'Source networking record: ' || v_lead.id::text,
    'Prior networking stage: ' || v_lead.status,
    case when v_lead.episode_name is not null then 'Episode: ' || v_lead.episode_name end,
    case when v_lead.where_met is not null then 'Met at: ' || v_lead.where_met end,
    case when v_lead.date_met is not null then 'Date met: ' || v_lead.date_met::text end,
    case when v_lead.website is not null then 'Website: ' || v_lead.website end,
    case when v_lead.product_summary is not null then 'Product or opportunity: ' || v_lead.product_summary end,
    case when v_lead.notes is not null then 'Networking notes: ' || v_lead.notes end
  ), 'Networking handoff');

  update public.business_network_leads
     set quote_request_id = v_quote_id, updated_at = now()
   where id = p_lead_id;
  return v_quote_id;
end;
$$;

revoke all on function bwb_internal.convert_networking_lead_to_quote(uuid, text, text, text, text, text, text, integer, text, date, text) from public, anon;
grant execute on function bwb_internal.convert_networking_lead_to_quote(uuid, text, text, text, text, text, text, integer, text, date, text) to authenticated;

create or replace function public.convert_networking_lead_to_quote(
  p_lead_id uuid, p_name text, p_company text, p_email text, p_phone text,
  p_preferred_contact text, p_service text, p_quantity integer,
  p_dimensions text, p_deadline date, p_notes text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select bwb_internal.convert_networking_lead_to_quote(
    p_lead_id, p_name, p_company, p_email, p_phone,
    p_preferred_contact, p_service, p_quantity, p_dimensions, p_deadline, p_notes
  );
$$;

revoke all on function public.convert_networking_lead_to_quote(uuid, text, text, text, text, text, text, integer, text, date, text) from public, anon;
grant execute on function public.convert_networking_lead_to_quote(uuid, text, text, text, text, text, text, integer, text, date, text) to authenticated;
