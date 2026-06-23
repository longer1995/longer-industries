# Longer CRM — backend deploy checklist (Lovable Cloud)

**Target:** deploy our `longer-crm` backend into the **Lovable Cloud** Supabase project
that already backs `atlas-voice-companion`. One Supabase = frontend + our backend, so the
frontend's `functions.invoke()` hits our functions locally (no cross-project hop).

> ⚠️ **Verify-first:** Lovable Cloud manages its own migrations/functions. Before relying on
> CLI deploys, confirm Lovable Cloud permits external `supabase` CLI pushes and won't clobber
> them on its next generation. If it does fight us, fall back to **Appendix A** (dedicated
> Supabase the frontend calls out to). I'll confirm this once I'm in the repo session.

## 1. Get the Lovable Cloud Supabase credentials
The project already exists — no "New project" step. From the Lovable Cloud / Supabase
dashboard for `atlas-voice-companion`, grab:
- **Project ref** (e.g. `abcdxyz`) and **Project URL**
- **service_role** key (for CLI) and **anon** key (already injected into the frontend)
- DB connection string (for running migrations)

## 2. Run our schema (SQL editor / `supabase db push`, in this exact order)
Lovable's auto-generated tables can coexist; ours are additive. Run one file, then the next.
1. `supabase/schema.sql`          — core tables, RLS, `recordings` bucket
2. `supabase/schema_v2_vault.sql` — actions / memory / secrets vault
3. `supabase/schema_v3_bot.sql`   — meeting-bot capture + `calendar_connections`
   - ⚠️ run on its own (it has `alter type … add value`, which can't share a transaction)
4. `supabase/schema_v4_recap.sql` — branded recap (viral loop)

## 3. Deploy the Edge Functions to the Lovable Cloud project
```
supabase link --project-ref <lovable-cloud-ref>
supabase functions deploy transcribe extract sync bot-dispatch recall-webhook calendar-webhook recap recap-view
```

## 4. Set the secrets (on the Lovable Cloud Supabase project)
We keep our **own** AI keys (extraction runs `claude-opus-4-8` + Whisper with tool schemas) —
we do **not** route through Lovable's `LOVABLE_API_KEY` gateway.
```
supabase secrets set \
  OPENAI_API_KEY=sk-...           # Whisper (field-call transcription) \
  ANTHROPIC_API_KEY=sk-ant-...    # Claude (extract + recap) \
  RECALL_API_KEY=...              # meeting bots \
  RECALL_REGION=us-west-2         # your Recall region \
  RECALL_WEBHOOK_SECRET=<random>  # any random string \
  INTERNAL_SECRET=<random>        # guards server-to-server bot-dispatch \
  SIGNUP_URL=https://<your-app>   # recap CTA link
```
> `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected into functions automatically.

## 5. Register the webhooks (point at the Lovable Cloud functions URL)
| Provider | URL | Notes |
|---|---|---|
| **Recall.ai** (bot webhook) | `…/functions/v1/recall-webhook` | header `x-webhook-secret: <RECALL_WEBHOOK_SECRET>` |
| **Calendly** (invitee.created) | `…/functions/v1/calendar-webhook` | scope to `invitee.created` |

## 6. Frontend wiring (`atlas-voice-companion`)
The frontend already has the Lovable Cloud Supabase URL + anon key injected. It just needs to
call our functions/tables per `FRONTEND_INTEGRATION.md`. No extra env if backend lives in the
same project; if you fall back to Appendix A, set `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
to the dedicated project.

## 7. Smoke test
- **Field call:** insert a `calls` row → upload audio to `recordings` → `transcribe` → confirm
  `call_insights` + `line_items` populate.
- **Meeting:** `bot-dispatch` a live link → bot joins → after it ends, `recall-webhook` fills the
  transcript and `extract` runs.
- **Recap:** `recap { call_id }` → open the returned `share_url` → branded page renders, call flips to **Viewed**.

## Before production
- Confirm Recall's current endpoint/region/payload shapes (see `RECALL_INTEGRATION.md`).
- Wire an email provider (Resend) into `recap` to email recaps directly.
- To zero out transcription cost, swap Whisper API → self-hosted faster-whisper.

---

## Appendix A — fallback: dedicated Supabase (if Lovable Cloud rejects CLI deploys)
1. supabase.com → New project; save Project URL + anon + service_role.
2. Run the 4 schema files (step 2) and deploy the 8 functions (step 3) against it.
3. Set the same secrets (step 4) on that project.
4. In `atlas-voice-companion`, point `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` at the
   dedicated project so the frontend calls out to our backend.
5. Register the webhooks (step 5) against the dedicated functions URL.
