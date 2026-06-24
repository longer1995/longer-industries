-- Longer CRM — schema v2: the wedge.
-- Adds Book-of-Business vault, relationship memory, off-the-record segments,
-- and detected actions. Run AFTER schema.sql.

-- ─────────────────────────────────────────────────────────────
-- Ownership model: a call segment / contact belongs to the REP, not the company.
-- Employer visibility is opt-in per data point, not default.
-- ─────────────────────────────────────────────────────────────
create type visibility as enum (
  'private',        -- rep-only, never leaves the vault
  'deal_only',      -- only deal points/numbers shared to employer CRM
  'shared'          -- fully shared to employer CRM
);

-- Per-rep workspace setting: are you operating as an independent or under an employer?
alter table contacts  add column visibility visibility not null default 'shared';
alter table calls     add column visibility visibility not null default 'shared';

-- ─────────────────────────────────────────────────────────────
-- Off-the-record segments: tap once mid-call to wall off a span.
-- The extractor must skip these time ranges entirely.
-- ─────────────────────────────────────────────────────────────
create table call_segments (
  id           uuid primary key default gen_random_uuid(),
  call_id      uuid not null references calls (id) on delete cascade,
  start_sec    numeric not null,
  end_sec      numeric,
  off_record   boolean not null default false,  -- true = never transcribed/extracted/synced
  label        text,                             -- e.g. 'personal', 'side-deal'
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Relationship memory: the compounding moat. One row per remembered fact,
-- auto-extracted per contact and reviewable by the rep.
-- ─────────────────────────────────────────────────────────────
create type memory_kind as enum (
  'family', 'personal', 'interest', 'birthday', 'prior_business',
  'preference', 'deal_history', 'note'
);

create table relationship_memory (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users (id) on delete cascade,
  contact_id   uuid not null references contacts (id) on delete cascade,
  source_call  uuid references calls (id) on delete set null,
  kind         memory_kind not null,
  key          text,                              -- e.g. 'spouse', 'dog', 'birthday'
  value        text not null,                     -- e.g. 'Sarah', 'Rex', '2026-07-01'
  date_value   date,                              -- parsed date if relevant (birthdays, anniversaries)
  visibility   visibility not null default 'private',  -- relationship facts default PRIVATE to the rep
  confidence   numeric(3,2),
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Detected actions: the "add to calendar?" seamless commands.
-- Extractor proposes; rep confirms with one tap; we execute.
-- ─────────────────────────────────────────────────────────────
create type action_kind   as enum (
  'calendar_event', 'follow_up', 'draft_email', 'create_quote', 'reminder', 'add_contact'
);
create type action_state  as enum ('proposed', 'confirmed', 'done', 'dismissed');

create table detected_actions (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users (id) on delete cascade,
  call_id      uuid references calls (id) on delete cascade,
  contact_id   uuid references contacts (id) on delete set null,
  kind         action_kind not null,
  title        text not null,                     -- "Happy hour with Jason @ Soup & Sons"
  body         text,
  due_at       timestamptz,                       -- parsed datetime for events/reminders
  payload      jsonb,                             -- structured args for execution
  state        action_state not null default 'proposed',
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
alter table call_segments       enable row level security;
alter table relationship_memory enable row level security;
alter table detected_actions    enable row level security;

create policy "own segments" on call_segments
  for all using (exists (select 1 from calls c where c.id = call_id and c.owner_id = auth.uid()));

create policy "own memory" on relationship_memory
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "own actions" on detected_actions
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- The vault guarantee, enforced in the DB (not just the app):
-- the sync function must filter to visibility != 'private'. This view is what
-- adapters are allowed to read — private data is structurally unreachable.
-- ─────────────────────────────────────────────────────────────
create view employer_syncable_memory as
  select * from relationship_memory where visibility = 'shared';
