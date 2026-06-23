# Lovable build prompt — Longer CRM (frontend)

Paste this into Lovable. It tells Lovable to build the UI and leave the
AI/CRM backend as Supabase Edge Function calls (which already live in this repo).

---

Build a mobile-first PWA called **Longer CRM** — a field sales call-capture tool
for an industrial / B2B sales operator. Use **React + Supabase** (Auth, Postgres,
Storage). Clean, fast, thumb-friendly. Dark UI.

**Home screen:** four large tap buttons — **Meeting · Sales Call · Order · Support**.
Tapping one opens a recording sheet for that call type:
- Request microphone permission and record audio (works with AirPods/Bluetooth mic).
- Show a running timer, a required **"I have consent to record" toggle**, and a Stop button.
- On Stop: upload the audio to the Supabase `recordings` storage bucket, insert a
  `calls` row (type, capture='mic', consent, audio_path, status='processing'),
  then call the `transcribe` Edge Function with the new `call_id`.
- Also support **Upload recording** and a **VoIP call** placeholder (capture='voip').

**Data model (already created in Supabase — match these tables):**
`contacts`, `calls`, `call_insights`, `line_items`, `sync_log`. Privacy is a
`contacts.privacy_mode` enum: `full | line_items_only | never_sync`.

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

**CRM pipeline panel:** kanban (New → Qualified → Quoting → Won) of calls/deals.
Each card has **Push to CRM** (dropdown: HubSpot, Zoho → calls the `sync` Edge
Function with `{ call_id, crm }`) and **Generate document** (dropdown: Quote, Sales
Order, Purchase Order, Invoice, Project Scope — stub for now).

**Important:** Do NOT implement transcription, AI extraction, or CRM sync in the
frontend. Those are **existing Supabase Edge Functions** named `transcribe`,
`extract`, and `sync`. Just call them and reflect the returned status. Keep all API
keys server-side.
