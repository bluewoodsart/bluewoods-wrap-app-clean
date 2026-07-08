drop function if exists public.log_rep_quote_customer_meeting_v1(uuid, text, text, date);

create or replace function public.log_rep_quote_customer_meeting_v1(
  p_quote_request_id uuid,
  p_meeting_notes text,
  p_next_step_text text default null,
  p_next_step_due_date date default null
)
returns table (
  status_event_id uuid,
  internal_note_id uuid,
  follow_up_task_id uuid
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  current_admin public.admin_users%rowtype;
  target_quote public.quote_requests%rowtype;
  trimmed_notes text;
  trimmed_next_step text;
  note_id uuid;
  event_id uuid;
  task_id uuid;
  actor_name text;
  can_access_quote boolean := false;
begin
  select *
  into current_admin
  from public.admin_users au
  where au.auth_user_id = auth.uid()
    and au.is_active = true
    and au.role in ('sales_rep', 'rep_manager')
    and nullif(trim(coalesce(au.rep_slug, '')), '') is not null
  limit 1;

  if current_admin.id is null then
    raise exception 'Active rep access is required.';
  end if;

  select *
  into target_quote
  from public.quote_requests qr
  where qr.id = p_quote_request_id
  limit 1;

  if target_quote.id is null then
    raise exception 'Quote not found.';
  end if;

  if current_admin.role = 'sales_rep' then
    can_access_quote := lower(trim(coalesce(target_quote.rep_slug, ''))) = lower(trim(current_admin.rep_slug));
  elsif current_admin.role = 'rep_manager' then
    can_access_quote := lower(trim(coalesce(target_quote.rep_slug, ''))) in (
      select lower(trim(current_admin.rep_slug))
      union
      select lower(trim(child.rep_slug))
      from public.admin_users child
      where child.manager_admin_user_id = current_admin.id
        and child.is_active = true
        and child.role = 'sales_rep'
        and nullif(trim(coalesce(child.rep_slug, '')), '') is not null
    );
  end if;

  if can_access_quote is not true then
    raise exception 'This quote is not assigned to your rep team.';
  end if;

  trimmed_notes := trim(coalesce(p_meeting_notes, ''));
  trimmed_next_step := nullif(trim(coalesce(p_next_step_text, '')), '');
  actor_name := coalesce(nullif(trim(current_admin.display_name), ''), current_admin.email, 'Rep');

  if length(trimmed_notes) < 8 then
    raise exception 'Add meeting notes before saving.';
  end if;

  if trimmed_next_step is not null and p_next_step_due_date is null then
    raise exception 'Choose a due date for the next step.';
  end if;

  insert into public.quote_internal_notes (
    quote_request_id,
    note_text,
    created_by
  )
  values (
    target_quote.id,
    'Customer meeting:' || chr(10) || trimmed_notes,
    actor_name
  )
  returning id into note_id;

  insert into public.quote_status_events (
    quote_request_id,
    event_type,
    status,
    message
  )
  values (
    target_quote.id,
    'rep_customer_meeting',
    target_quote.status,
    actor_name || ' met with the customer. ' || left(trimmed_notes, 220)
  )
  returning id into event_id;

  if trimmed_next_step is not null then
    insert into public.quote_follow_up_tasks (
      quote_request_id,
      task_text,
      due_date,
      status,
      created_by
    )
    values (
      target_quote.id,
      trimmed_next_step,
      p_next_step_due_date,
      'open',
      actor_name
    )
    returning id into task_id;
  end if;

  return query select event_id, note_id, task_id;
end;
$$;

revoke all on function public.log_rep_quote_customer_meeting_v1(uuid, text, text, date) from public;
revoke all on function public.log_rep_quote_customer_meeting_v1(uuid, text, text, date) from anon;
grant execute on function public.log_rep_quote_customer_meeting_v1(uuid, text, text, date) to authenticated;
