-- Longer CRM — database schema
-- Run in Supabase SQL editor (or via `supabase db push`).
-- Designed so the AI extraction writes a normalized record once,
-- and per-CRM adapters read from it. Build the brain once, snap on connectors.

-- ─────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────
create type call_type     as enum ('meeting', 'sales_call', 'order', 'support');
create type capture_mode  as enum ('mic', 'voip', 'upload');
create type call_status   as enum ('recording', 'processing', 'ready', 'failed');

create type signal_kind   as enum ('interested', 'not_interested', 'needs_follow_up', 'ready_to_buy', 'unknown');
create type intent_kind    as enum ('inquiry', 'firm_order', 'support_request', 'relationship', 'unknown');
create type figure_kind   as enum ('firm_quote', 'ballpark');
create type sync_state     as enum ('pending', 'approved', 'redacted', 'synced', 'skipped');

-- Per-contact privacy: controls what is allowed to leave the app and reach a CRM.
create type privacy_mode  as enum ('full', 'line_items_only', 'never_sync');

-- ─────────────────────────────────────────────────────────────
-- Contacts
-- ─────────────────────────────────────────────────────────────
create table contacts (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users (id) on delete cascade,
  name         text,
  company      text,
  phone        text,
  email        text,
  -- maps this contact to records in external CRMs, e.g. {"zoho":"123","hubspot":"456"}
  crm_links    jsonb not null default '{}'::jsonb,
  privacy_mode privacy_mode not null default 'full',
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Calls (one row per recording session)
-- ─────────────────────────────────────────────────────────────
create table calls (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users (id) on delete cascade,
  contact_id   uuid references contacts (id) on delete set null,
  type         call_type   not null,
  capture      capture_mode not null default 'mic',
  consent      boolean     not null default false,  -- did the user confirm consent to record
  audio_path   text,                                -- path in the 'recordings' storage bucket
  transcript   text,
  status       call_status not null default 'processing',
  duration_sec int,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Call insights (the structured extraction — one row per call)
-- ─────────────────────────────────────────────────────────────
create table call_insights (
  call_id      uuid primary key references calls (id) on delete cascade,
  signal       signal_kind not null default 'unknown',
  intent       intent_kind not null default 'unknown',
  summary      text,
  next_action  text,                          -- human-readable next step
  suggested_doc text,                         -- quote | sales_order | purchase_order | invoice | project_scope
  confidence   numeric(3,2),                  -- 0.00–1.00, drives auto vs review
  sync_status  sync_state  not null default 'pending',
  raw          jsonb,                          -- full model output for audit
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Line items (commodity/service, qty, $ amount + firm vs ballpark)
-- ─────────────────────────────────────────────────────────────
create table line_items (
  id           uuid primary key default gen_random_uuid(),
  call_id      uuid not null references calls (id) on delete cascade,
  description  text not null,
  quantity     numeric,
  unit         text,
  amount       numeric,                        -- dollar figure mentioned (per-unit or total — see amount_basis)
  amount_basis text,                           -- 'per_unit' | 'total' | null
  figure_type  figure_kind,                    -- firm_quote vs ballpark  ← the explicit firm/estimate distinction
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Sync log (audit trail of what got pushed to which CRM)
-- ─────────────────────────────────────────────────────────────
create table sync_log (
  id           uuid primary key default gen_random_uuid(),
  call_id      uuid not null references calls (id) on delete cascade,
  crm          text not null,                  -- 'zoho' | 'hubspot'
  external_id  text,
  payload      jsonb,
  ok           boolean not null,
  error        text,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security — users only see their own data
-- ─────────────────────────────────────────────────────────────
alter table contacts      enable row level security;
alter table calls         enable row level security;
alter table call_insights enable row level security;
alter table line_items    enable row level security;
alter table sync_log      enable row level security;

create policy "own contacts" on contacts
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "own calls" on calls
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "own insights" on call_insights
  for all using (exists (select 1 from calls c where c.id = call_id and c.owner_id = auth.uid()));

create policy "own line_items" on line_items
  for all using (exists (select 1 from calls c where c.id = call_id and c.owner_id = auth.uid()));

create policy "own sync_log" on sync_log
  for all using (exists (select 1 from calls c where c.id = call_id and c.owner_id = auth.uid()));

-- Storage bucket for audio (create once; private)
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;
