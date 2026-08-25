-- A customer proof approval advances the main quote list and stages banner
-- production work. It deliberately does not release a physical print.
create or replace function public.submit_customer_proof_action_public(
  p_token text,
  p_action text,
  p_revision_message text default null
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_quote_request_id uuid;
  v_current_status text;
  v_product_type text;
  v_revision_message text;
begin
  if p_action not in ('approved', 'changes_requested') then
    raise exception 'Invalid proof action.';
  end if;

  select qr.id, qr.status, lower(coalesce(qr.product_type, ''))
    into v_quote_request_id, v_current_status, v_product_type
  from public.quote_customer_proof_tokens qcpt
  join public.quote_requests qr on qr.id = qcpt.quote_request_id
  where qcpt.token = trim(coalesce(p_token, ''))
    and qcpt.status = 'active'
  limit 1
  for update of qr;

  if v_quote_request_id is null then
    raise exception 'Proof link is invalid or no longer available.';
  end if;

  if p_action = 'approved' then
    update public.quote_requests qr
    set
      status = 'approved',
      status_updated_at = now(),
      customer_proof_status = 'approved',
      customer_proof_approved_at = now(),
      customer_proof_revision_requested_at = null,
      customer_proof_revision_message = null
    where qr.id = v_quote_request_id;

    insert into public.quote_status_events (quote_request_id, event_type, status, message)
    values (
      v_quote_request_id,
      'customer_proof_approved',
      'approved',
      'Customer approved the current proof. Main quote status changed to Proof Approved.'
    );

    if v_product_type = 'banner' and not exists (
      select 1
      from public.quote_follow_up_tasks qfut
      where qfut.quote_request_id = v_quote_request_id
        and qfut.status = 'open'
        and qfut.task_text like 'PRODUCTION HOLD — Banner proof approved.%'
    ) then
      insert into public.quote_follow_up_tasks (
        quote_request_id,
        task_text,
        due_date,
        status,
        created_by
      ) values (
        v_quote_request_id,
        'PRODUCTION HOLD — Banner proof approved. Prepare the approved version in Flexi and verify size, finishing, and proof version. Do not release a physical print without staff authorization.',
        current_date,
        'open',
        'proof_approval_automation'
      );

      insert into public.quote_status_events (quote_request_id, event_type, status, message)
      values (
        v_quote_request_id,
        'banner_production_staged',
        'approved',
        'Banner production handoff created on HOLD. No physical print was released.'
      );
    end if;

    return;
  end if;

  v_revision_message := trim(coalesce(p_revision_message, ''));
  if v_revision_message = '' then
    raise exception 'Revision request message is required.';
  end if;
  if length(v_revision_message) > 2000 then
    raise exception 'Revision request message is too long.';
  end if;

  update public.quote_requests qr
  set
    customer_proof_status = 'changes_requested',
    customer_proof_approved_at = null,
    customer_proof_revision_requested_at = now(),
    customer_proof_revision_message = v_revision_message
  where qr.id = v_quote_request_id;

  insert into public.quote_status_events (quote_request_id, event_type, status, message)
  values (
    v_quote_request_id,
    'customer_proof_revision_requested',
    v_current_status,
    'Customer requested proof changes: ' || v_revision_message
  );
end;
$function$;

revoke all on function public.submit_customer_proof_action_public(text, text, text) from public;
grant execute on function public.submit_customer_proof_action_public(text, text, text) to anon, authenticated;
