# Longer CRM — backend

Call-capture → transcribe → AI extraction → review → CRM push, for field sales.

## What's here

```
supabase/
  schema.sql                  # full Postgres schema + RLS + storage bucket
  functions/
    transcribe/               # audio → Whisper → transcript
    extract/                  # transcript → Claude → structured CRM fields
    sync/                     # review/privacy gate → CRM adapters
      adapters/
        hubspot.ts            # HubSpot Deals
        zoho.ts               # Zoho CRM Deals
        types.ts              # normalized deal shape (add a CRM = add an adapter)
    _shared/                  # cors + service-role client
LOVABLE_PROMPT.md             # paste into Lovable to build the frontend
.env.example                  # required secrets
```

## Pipeline

```
[Lovable app] record/upload audio
      │  insert calls row, upload to 'recordings' bucket
      ▼
/transcribe   Whisper → calls.transcript, then fires →
      ▼
/extract      Claude (tool schema) → call_insights + line_items
      │        high-confidence + firm order → auto-approved; else 'pending' review
      ▼
[Review screen]  edit / redact / approve
      ▼
/sync         privacy gate (full / line_items_only / never_sync) → HubSpot or Zoho
```

## The fields it pulls from every call

- **signal**: interested · not_interested · needs_follow_up · ready_to_buy
- **intent**: inquiry · firm_order · support_request · relationship
- **line items**: description · quantity · unit · **amount** · **figure_type
  (firm_quote vs ballpark)**
- **suggested_doc**: quote · sales_order · purchase_order · invoice · project_scope
- **confidence** → drives auto-sync vs manual review

## Privacy / "filter the noise"

Per contact, `privacy_mode`:
- `full` — sync everything
- `line_items_only` — push commodities/quantities/figures, strip summary &
  relationship notes (for clients you have outside relationships with)
- `never_sync` — capture for yourself, never touches the CRM

## Setup

1. Create a Supabase project. Run `supabase/schema.sql` in the SQL editor.
2. `cp .env.example .env` and fill in keys.
3. `supabase secrets set --env-file .env`
4. Deploy functions:
   ```
   supabase functions deploy transcribe
   supabase functions deploy extract
   supabase functions deploy sync
   ```
5. Build the frontend in Lovable using `LOVABLE_PROMPT.md`, pointed at the same
   Supabase project.

## Capture reality check

- **In-person meetings** (mic/AirPods) and **upload**: fully supported.
- **VoIP calls** placed through the app (Twilio/Telnyx): supported — you own the audio.
- **Tapping your normal cellular calls on iPhone is NOT possible** — iOS blocks app
  access to call audio. That requires a hardware recorder (Plaud-style) feeding the
  same `/transcribe` endpoint.
- One-party consent in TX; some states require all-party consent — hence the consent
  toggle per recording.

## Adding another CRM (Salesforce, ReadyCloud…)

Implement the `CrmAdapter` interface in `sync/adapters/`, register it in
`sync/index.ts`. Nothing else changes.
