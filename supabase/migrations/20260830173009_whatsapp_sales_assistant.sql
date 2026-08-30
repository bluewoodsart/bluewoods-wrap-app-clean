create table if not exists public.whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  wa_id text not null unique,
  phone text not null,
  profile_name text,
  lead_status text not null default 'new' check (lead_status in ('new','qualifying','qualified','quoted','won','lost')),
  project_type text,
  vehicle_or_trailer text,
  dimensions text,
  location text,
  deadline text,
  budget text,
  qualification_data jsonb not null default '{}'::jsonb,
  crm_quote_request_id uuid references public.quote_requests(id) on delete set null,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.whatsapp_contacts(id) on delete cascade,
  status text not null default 'open' check (status in ('open','waiting_customer','waiting_owner','closed')),
  assigned_admin_user_id uuid references public.admin_users(id) on delete set null,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(contact_id)
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  meta_message_id text unique,
  direction text not null check (direction in ('inbound','outbound')),
  message_type text not null default 'text',
  body text,
  media_id text,
  media_mime_type text,
  status text not null default 'received' check (status in ('received','draft','approved','sent','delivered','read','failed')),
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.whatsapp_outbound_approvals (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  draft_body text not null,
  draft_kind text not null default 'reply' check (draft_kind in ('reply','qualification','quote','follow_up')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','sent','failed')),
  created_by text not null default 'assistant',
  reviewed_by uuid references public.admin_users(id) on delete set null,
  reviewed_at timestamptz,
  sent_message_id uuid references public.whatsapp_messages(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_contacts_last_message_idx on public.whatsapp_contacts(last_message_at desc);
create index if not exists whatsapp_messages_conversation_idx on public.whatsapp_messages(conversation_id, created_at);
create index if not exists whatsapp_approvals_pending_idx on public.whatsapp_outbound_approvals(status, created_at);

alter table public.whatsapp_contacts enable row level security;
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_outbound_approvals enable row level security;

create policy "active admins read whatsapp contacts" on public.whatsapp_contacts for select to authenticated
using (exists (select 1 from public.admin_users a where a.auth_user_id = (select auth.uid()) and a.is_active));
create policy "active admins read whatsapp conversations" on public.whatsapp_conversations for select to authenticated
using (exists (select 1 from public.admin_users a where a.auth_user_id = (select auth.uid()) and a.is_active));
create policy "active admins read whatsapp messages" on public.whatsapp_messages for select to authenticated
using (exists (select 1 from public.admin_users a where a.auth_user_id = (select auth.uid()) and a.is_active));
create policy "active admins read whatsapp approvals" on public.whatsapp_outbound_approvals for select to authenticated
using (exists (select 1 from public.admin_users a where a.auth_user_id = (select auth.uid()) and a.is_active));

create policy "owner staff update whatsapp contacts" on public.whatsapp_contacts for update to authenticated
using (exists (select 1 from public.admin_users a where a.auth_user_id = (select auth.uid()) and a.is_active and a.role in ('owner_admin','staff')))
with check (exists (select 1 from public.admin_users a where a.auth_user_id = (select auth.uid()) and a.is_active and a.role in ('owner_admin','staff')));

create policy "owner staff update whatsapp conversations" on public.whatsapp_conversations for update to authenticated
using (exists (select 1 from public.admin_users a where a.auth_user_id = (select auth.uid()) and a.is_active and a.role in ('owner_admin','staff')))
with check (exists (select 1 from public.admin_users a where a.auth_user_id = (select auth.uid()) and a.is_active and a.role in ('owner_admin','staff')));

create policy "owner staff manage whatsapp approvals" on public.whatsapp_outbound_approvals for all to authenticated
using (exists (select 1 from public.admin_users a where a.auth_user_id = (select auth.uid()) and a.is_active and a.role in ('owner_admin','staff')))
with check (exists (select 1 from public.admin_users a where a.auth_user_id = (select auth.uid()) and a.is_active and a.role in ('owner_admin','staff')));

grant select, update on public.whatsapp_contacts to authenticated;
grant select, update on public.whatsapp_conversations to authenticated;
grant select on public.whatsapp_messages to authenticated;
grant select, insert, update on public.whatsapp_outbound_approvals to authenticated;
