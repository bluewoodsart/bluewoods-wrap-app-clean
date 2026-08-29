alter table public.production_contacts
  add column if not exists quote_request_id uuid
  references public.quote_requests(id)
  on delete set null;

create index if not exists production_contacts_quote_request_id_idx
  on public.production_contacts(quote_request_id);

comment on column public.production_contacts.quote_request_id is
  'Optional CRM customer/job association. Links a production contact or laborer to the latest selected quote request for that customer.';
