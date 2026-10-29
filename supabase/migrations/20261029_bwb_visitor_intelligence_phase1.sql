-- BWB visitor intelligence Phase 1: server-ingested anonymous events only.
create table if not exists public.bwb_visitor_events (
 id uuid primary key default gen_random_uuid(),
 occurred_at timestamptz not null default now(),
 session_id uuid not null,
 event_type text not null check (event_type in ('page_view','quote_start','quote_complete')),
 path text not null,
 referrer_host text,
 utm_source text,
 utm_medium text,
 utm_campaign text,
 site_host text not null,
 created_at timestamptz not null default now()
);
create index if not exists bwb_visitor_events_created_at_idx on public.bwb_visitor_events(created_at desc);
create index if not exists bwb_visitor_events_session_idx on public.bwb_visitor_events(session_id,created_at);
alter table public.bwb_visitor_events enable row level security;
revoke all on public.bwb_visitor_events from anon,authenticated;
comment on table public.bwb_visitor_events is 'Consent-gated website event telemetry. No personal identifiers or visitor identity claims. Server-only inserts; no client direct access.';