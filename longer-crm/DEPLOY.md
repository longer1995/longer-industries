# Longer CRM — backend deploy checklist

Stand up the whole backend on Supabase. ~30 min, copy-paste. Do it in order.

## 1. Create the Supabase project
- supabase.com → New project. Save the **Project URL** and **anon** + **service_role** keys.

## 2. Run the schema (SQL editor, in this exact order)
Each file builds on the last. Run one, then the next.
1. `supabase/schema.sql`          — core tables, RLS, recordings bucket
2. `supabase/schema_v2_vault.sql` — actions / memory / secrets vault
3. `supabase/schema_v3_bot.sql`   — meeting-bot capture + calendar_connections
   - ⚠️ run this file on its own (it has `alter type ... add value`, which can't
     share a transaction with later statements)
4. `supabase/schema_v4_recap.sql` — branded recap (viral loop)

## 3. Deploy the Edge Functions
```
supabase link --project-ref <your-ref>
supabase functions deploy transcribe extract sync bot-dispatch recall-webhook calendar-webhook recap recap-view
```

## 4. Set the secrets
```
supabase secrets set \
  OPENAI_API_KEY=sk-...           # Whisper (field-call transcription) \
  ANTHROPIC_API_KEY=sk-ant-...    # Claude (extract + recap) \
  RECALL_API_KEY=...              # meeting bots \
  RECALL_REGION=us-west-2         # your Recall region \
  RECALL_WEBHOOK_SECRET=<random>  # any random string \
  INTERNAL_SECRET=<random>        # guards server-to-server bot-dispatch \
  SIGNUP_URL=https://longercrm.app  # recap CTA link
```
> `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

## 5. Register the webhooks
| Provider | URL | Notes |
|---|---|---|
| **Recall.ai** (bot webhook) | `…/functions/v1/recall-webhook` | add header `x-webhook-secret: <RECALL_WEBHOOK_SECRET>` |
| **Calendly** (invitee.created) | `…/functions/v1/calendar-webhook` | scope to `invitee.created` |

## 6. Smoke test
- **Field call:** upload audio → insert a `calls` row → call `transcribe` → confirm
  `call_insights` + `line_items` populate.
- **Meeting:** POST a live meeting link to `bot-dispatch` → bot joins → after it ends,
  `recall-webhook` fills the transcript and `extract` runs.
- **Recap:** POST `{ call_id }` to `recap` → open the returned `share_url` → confirm
  the branded page renders and the call flips to **Viewed**.

## Before production
- Confirm Recall's current endpoint/region/payload shapes (see `RECALL_INTEGRATION.md`).
- Wire an email provider (Resend) into `recap` to email recaps directly.
- To zero out transcription cost, swap the Whisper API → self-hosted faster-whisper
  (route `recall-webhook` audio through `transcribe`). Caddy self-host bundle TBD.
