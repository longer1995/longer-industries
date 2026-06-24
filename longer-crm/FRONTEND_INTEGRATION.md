# Frontend integration contract — `atlas-voice-companion` → Longer CRM backend

This is the contract the **Lovable frontend** (`longer1995/atlas-voice-companion`) builds
against. The backend lives in `longer1995/longer-industries` under `longer-crm/` and is
reached **only** through Supabase — there is no shared code between the repos.

## Connection
```env
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```
Use `@supabase/supabase-js`. All table reads/writes go through the client (RLS scopes every
row to `auth.uid()`); all pipeline work goes through Edge Functions
(`supabase.functions.invoke('<name>', { body })`, which attaches the user JWT automatically).

## Auth
Supabase Auth (email magic-link or password). Every `calls`/`contacts` row is owned by
`owner_id = auth.uid()` — never set it client-side beyond the signed-in user; RLS enforces it.

## Data model (what the UI renders)
- **contacts** — `id, owner_id, name, company, … , crm_ids jsonb`
- **calls** — `id, owner_id, contact_id, type, capture, consent, audio_path, transcript,
  status('processing'|'recording'|'ready'|'failed'), duration_sec, created_at`
- **call_insights** (1:1 with call) — `signal, intent, summary, next_action, suggested_doc,
  confidence(0–1), sync_status('pending'|'approved'|'redacted'|'synced'|'skipped')`
- **line_items** (N per call) — `description, quantity, unit, amount, amount_basis, figure_type('firm_quote'|'ballpark')`

The unified "book" screen = `calls` joined to `contacts` + `call_insights`, newest first.
The firm-vs-ballpark badge comes from `line_items.figure_type`.

## Edge Functions (the API)
| Function | Body | Auth | Does |
|---|---|---|---|
| `transcribe` | `{ call_id }` | user JWT | Whisper → transcript → auto-fires `extract`. For **field calls** (mic/upload). |
| `extract` | `{ call_id }` | user JWT | Claude → `call_insights` + `line_items`. (Auto-fired; rarely called directly.) |
| `bot-dispatch` | `{ meeting_url, type?, contact_id?, calendar_event_id? }` | user JWT | Sends a Recall bot to a live **meeting**. Webhook fills transcript → `extract`. |
| `sync` | `{ call_id, crm: "zoho"\|"hubspot" }` | user JWT | Privacy gate + CRM push. Requires `sync_status` ∈ approved/redacted. |
| `recap` | `{ call_id, recipient_name?, recipient_email? }` | user JWT | Branded recap; returns `{ share_url }`. Figures frozen from `line_items`. |

Webhooks (`recall-webhook`, `calendar-webhook`, `recap-view`) are server/public — not called by the app.

## The two capture flows
**Field call (mic / upload):**
1. `insert into calls { type, capture:'mic'|'upload', consent:true, status:'processing' }` → get `call.id`.
2. Upload audio to Storage bucket **`recordings`** at path `${user.id}/${call.id}.webm` (private bucket).
3. `update calls set audio_path = '<that path>'`.
4. `functions.invoke('transcribe', { body:{ call_id }})`.
5. Subscribe / poll `calls` + `call_insights` until `status='ready'` and insights land.

**Meeting (bot):**
1. `functions.invoke('bot-dispatch', { body:{ meeting_url, type:'meeting', contact_id? }})`.
2. Bot joins; when the meeting ends the webhook fills `transcript` and runs `extract`. UI just watches the row.

## Screens to build (against the above)
1. **Book** — unified list of calls (field + meetings), signal/intent chips, firm/ballpark badge, $ totals.
2. **Capture** — record/upload (field) + "Send bot to a meeting" (paste link) → `bot-dispatch`.
3. **Call detail** — transcript, insights, editable line items, **Review → Approve** (sets `sync_status`), **Sync to CRM** (`sync`), **Send recap** (`recap` → copy/share `share_url`).
4. **Meetings** — upcoming/auto-join state from `calendar_connections`.

## Review gate (don't skip)
`sync` rejects calls whose `sync_status` is still `pending`. The detail screen must let the user
approve (`approved`) or redact (`redacted`) before the Sync button is enabled.
