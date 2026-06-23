-- Longer CRM — schema v3: meeting-bot capture (Recall.ai) + calendar auto-join
-- Run AFTER schema.sql. Adds the "bot" capture source so Zoom/Teams/Meet/Webex
-- meetings flow through the SAME transcribe→extract→review pipeline as field calls.
--
-- NOTE: `alter type ... add value` cannot run inside a transaction block; run this
-- file on its own (the Supabase SQL editor does this fine).

-- New capture source: a bot that joined a video meeting.
alter type capture_mode add value if not exists 'bot';

-- Extra context for bot calls (harmless/null for mic + upload calls).
alter table calls
  add column if not exists platform          text,   -- 'zoom'|'teams'|'meet'|'webex'
  add column if not exists meeting_url        text,
  add column if not exists recall_bot_id      text,   -- Recall.ai bot id (match webhooks)
  add column if not exists calendar_event_id  text;   -- source calendar/Calendly event

create index if not exists calls_recall_bot_id_idx on calls (recall_bot_id);

-- A user's connected calendar/scheduling source. When an event is booked, the
-- calendar webhook looks up the owner here and dispatches a bot.
create table if not exists calendar_connections (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  provider    text not null,                       -- 'calendly' | 'google' | 'microsoft'
  external_id text,                                 -- organizer URI / calendar id to match webhooks
  auto_join   boolean not null default true,       -- send a bot automatically to new events
  status      text not null default 'active',      -- 'active' | 'paused'
  created_at  timestamptz not null default now(),
  unique (provider, external_id)
);

alter table calendar_connections enable row level security;

create policy "own calendar_connections" on calendar_connections
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
