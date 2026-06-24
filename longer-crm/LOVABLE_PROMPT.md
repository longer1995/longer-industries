# Lovable build prompt — Longer CRM (frontend)

Paste this into Lovable. It tells Lovable to build the UI and leave the
AI/CRM backend as Supabase Edge Function calls (which already live in this repo).

---

Build a mobile-first PWA called **Longer CRM** — a field sales call-capture tool
for an industrial / B2B sales operator. Use **React + Supabase** (Auth, Postgres,
Storage). Clean, fast, thumb-friendly. Dark UI.

**Branding:** The product is its own brand, **Longer CRM**, with a maker
attribution to Atlas Agentics. Show a small, muted **"by Atlas Agentics"** line:
(1) under the app name on the login/auth screen, and (2) in a quiet footer/about
line. Keep it subtle — secondary text color, smaller than the product name. The
PWA install name (manifest `name`) is "Longer CRM"; the short name is "Longer".

**Home screen:** four large tap buttons — **Meeting · Sales Call · Order · Support**.
Tapping one opens a recording sheet for that call type:
- Request microphone permission and record audio (works with AirPods/Bluetooth mic).
- Show a running timer, a required **"I have consent to record" toggle**, and a Stop button.
- On Stop: upload the audio to the Supabase `recordings` storage bucket, insert a
  `calls` row (type, capture='mic', consent, audio_path, status='processing'),
  then call the `transcribe` Edge Function with the new `call_id`.
- Also support **Upload recording** and a **VoIP call** placeholder (capture='voip').

**Meetings & calendar (bot recording):** add a **Meetings** area.
- **Connect Calendly** (Google/Outlook later): writes a `calendar_connections`
  row and shows connected status. Booked meetings then auto-record.
- **"Record a meeting now":** paste a Zoom/Teams/Meet/Webex link → POST to the
  `bot-dispatch` Edge Function `{ meeting_url, type: 'meeting' }`. A bot joins and
  records; the call appears in the book with `capture='bot'` and a **platform
  badge** (Zoom/Teams/Meet/Webex).
- Meeting calls flow through the SAME review pipeline as field calls — no separate UI.

**One unified book of business (the core differentiator):** the call list shows
field captures (mic/upload) AND meeting-bot captures **together**, newest-first,
each with a capture/platform badge. "Every conversation — in person, phone, and
every video platform — in one book." Lead the empty state + headline copy with this.

**Data model (already created in Supabase — match these tables):**
`contacts`, `calls` (now also `capture='bot'`, `platform`, `meeting_url`,
`calendar_event_id`), `call_insights`, `line_items`, `sync_log`,
`calendar_connections`. Privacy is a `contacts.privacy_mode` enum:
`full | line_items_only | never_sync`.

**Review screen:** list calls newest-first with status + signal badge. Tap a call to
open detail:
- Transcript (collapsible).
- Extracted fields from `call_insights`: **signal** (interested / not interested /
  needs follow-up / ready to buy), **intent**, summary, next action, suggested document.
- `line_items` table: description, qty, unit, amount, with a **firm-quote vs ballpark**
  badge per row.
- Let me **edit fields, redact, Approve, or Discard**. Approve sets
  `call_insights.sync_status = 'approved'`.
- A per-contact **privacy mode** selector.
- **Send recap** button (the headline feature): POSTs to the `recap` Edge Function
  `{ call_id, recipient_name?, recipient_email? }` and returns a `share_url`. Show a
  success card with **Copy link / Share** (and an Open preview that loads the hosted
  branded recap page). The recap is a polished, customer-facing page with a clean
  quote table — make this action feel premium; it's how the product spreads.
- Show recap status on the call once sent (Sent / **Viewed** when `view_count > 0`),
  so the rep sees when the customer opened it.

**CRM pipeline panel:** kanban (New → Qualified → Quoting → Won) of calls/deals.
Each card has **Push to CRM** (dropdown: HubSpot, Zoho → calls the `sync` Edge
Function with `{ call_id, crm }`) and **Generate document** (dropdown: Quote, Sales
Order, Purchase Order, Invoice, Project Scope — stub for now).

**Important:** Do NOT implement transcription, AI extraction, or CRM sync in the
frontend. Those are **existing Supabase Edge Functions** named `transcribe`,
`extract`, and `sync`. Just call them and reflect the returned status. Keep all API
keys server-side.
