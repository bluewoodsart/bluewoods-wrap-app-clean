-- Allow a quote's approved proposal/invoice PDF to share the existing
-- token-protected customer proof workflow.

update storage.buckets
set
  file_size_limit = greatest(coalesce(file_size_limit, 0), 52428800),
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'application/pdf'
  ]
where id = 'customer-proofs';

create or replace function public.get_approved_quote_invoice_for_proof_public_v1(p_token text)
returns table (
  invoice_token text,
  invoice_status text,
  invoice_data jsonb,
  order_number text,
  approved_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    qi.token,
    qi.status,
    qi.invoice_data,
    qr.quote_id,
    qi.approved_at
  from public.quote_customer_proof_tokens qcpt
  join public.quote_requests qr on qr.id = qcpt.quote_request_id
  join public.quote_invoices qi on qi.quote_request_id = qr.id
  where qcpt.token = trim(coalesce(p_token, ''))
    and qcpt.status = 'active'
    and qi.status = 'approved'
  limit 1;
$$;

revoke all on function public.get_approved_quote_invoice_for_proof_public_v1(text) from public;
grant execute on function public.get_approved_quote_invoice_for_proof_public_v1(text) to anon, authenticated;

notify pgrst, 'reload schema';
