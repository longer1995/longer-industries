-- Longer CRM — schema v4: the branded recap (the viral loop).
-- After a call, the rep sends the customer a polished branded recap. Every recap
-- is a hosted page that markets Longer CRM to a new buyer when it's opened.
-- Run AFTER schema.sql.

create extension if not exists pgcrypto;

create table if not exists recaps (
  id             uuid primary key default gen_random_uuid(),
  call_id        uuid not null references calls (id) on delete cascade,
  owner_id       uuid not null references auth.users (id) on delete cascade,
  -- unguessable token for the public share page
  share_token    text not null unique default encode(gen_random_bytes(16), 'hex'),
  subject        text,
  intro          text,                         -- Claude-written prose (no figures)
  closing        text,                         -- Claude-written prose (no figures)
  -- frozen snapshot of line items at send time; figures rendered from HERE, never
  -- regenerated, so what the customer sees can't drift or be hallucinated.
  line_items     jsonb not null default '[]'::jsonb,
  recipient_name text,
  recipient_email text,
  brand_name     text not null default 'Longer CRM',
  status         text not null default 'draft', -- draft | sent | viewed
  view_count     int  not null default 0,
  last_viewed_at timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists recaps_share_token_idx on recaps (share_token);
create index if not exists recaps_owner_idx on recaps (owner_id);

alter table recaps enable row level security;

-- Owner manages their own recaps. The public share page is served by the
-- recap-view function with the service role, so no public SELECT policy is needed.
create policy "own recaps" on recaps
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
