alter table public.business_network_leads
  add column if not exists social_profiles jsonb not null default '{}'::jsonb,
  add column if not exists extraction_confidence numeric(4,3)
    check (extraction_confidence is null or extraction_confidence between 0 and 1),
  add column if not exists extraction_notes text,
  add column if not exists batch_id uuid,
  add column if not exists card_index integer
    check (card_index is null or card_index > 0);

create index if not exists business_network_leads_batch_idx
  on public.business_network_leads (batch_id, card_index)
  where batch_id is not null;

comment on column public.business_network_leads.social_profiles is
  'Named official social profile URLs discovered from the card or verified research.';
comment on column public.business_network_leads.extraction_confidence is
  'AI extraction confidence only; never a substitute for human verification.';
