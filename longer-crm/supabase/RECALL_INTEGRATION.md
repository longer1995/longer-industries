# Meeting-bot capture (Recall.ai) — backend

Lets Longer CRM join **Zoom / Teams / Google Meet / Webex** meetings, record +
transcribe them, and run them through the **same** extract→review→CRM pipeline as
field calls. We rent the bot infrastructure from [Recall.ai](https://www.recall.ai)
instead of building it.

## Flow
```
Calendly books a meeting ──▶ /calendar-webhook ──┐
                                                 ├─▶ /bot-dispatch ──▶ Recall bot joins
"Record a meeting" (paste link) ─────────────────┘                         │ records + transcribes
                                                                           ▼
                                            /recall-webhook ◀── Recall "done" event
                                                   │ saves transcript
                                                   ▼
                                              /extract  (unchanged)
                                                   ▼
                                          review → recap → CRM
```

## Endpoints (new)
| Function | Caller | Purpose |
|---|---|---|
| `bot-dispatch` | frontend (JWT) or `calendar-webhook` (internal secret) | send a bot to a meeting URL, create a `bot` call |
| `recall-webhook` | Recall.ai | on completion, save transcript + fire `extract` |
| `calendar-webhook` | Calendly | on `invitee.created`, auto-dispatch a bot |

## Setup
1. Run `schema_v3_bot.sql` (adds `capture='bot'`, call columns, `calendar_connections`).
2. Set Supabase secrets:
   - `RECALL_API_KEY`, `RECALL_REGION` (e.g. `us-west-2`)
   - `RECALL_WEBHOOK_SECRET` (any random string; set as the bot webhook header)
   - `INTERNAL_SECRET` (random; guards server-to-server `bot-dispatch` calls)
3. In Recall, point the bot webhook at `…/functions/v1/recall-webhook` with header
   `x-webhook-secret: <RECALL_WEBHOOK_SECRET>`.
4. In Calendly, add a webhook subscription for `invitee.created` →
   `…/functions/v1/calendar-webhook`.

## Cost (per 1-hour meeting)
- Recall recording **$0.50** + transcription **$0.15** (or ~$0 self-hosted Whisper)
- Claude extraction **~$0.03** → **≈ $0.55–0.70 / meeting-hour**

## Notes / TODO before production
- **Confirm Recall's exact endpoint, region host, request body, and webhook payload
  against their current docs** — shapes here follow the documented v1 pattern but
  Recall iterates. The `done` status list in `recall-webhook` may need adjusting.
- To drop the $0.15/hr transcription, remove `transcription_options` in
  `bot-dispatch` and have `recall-webhook` download the recording and POST it to
  `/transcribe` (self-hosted Whisper).
- Calendly only returns `join_url` for online locations; in-person bookings are
  correctly ignored.
