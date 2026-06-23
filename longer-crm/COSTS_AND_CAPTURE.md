# Longer CRM — Unit Economics, Models & Capture Reality

## Unit cost per call
| Component | Cost |
|---|---|
| Whisper transcription | $0.006/min |
| Claude extraction (Haiku 4.5, ~6K in / 800 out) | ~$0.01/call |
| **15-min call all-in** | **~$0.10** (transcription ≈ 90%) |

- Average user (~40 calls / 600 min per month): **~$4/mo COGS**
- Heavy user (~150 calls / 2,000 min): **~$13/mo COGS**
- With **on-device transcription**: COGS drops to **~$0.40/mo** (extraction only)

## Pricing model
| Tier | Price | Notes |
|---|---|---|
| Free | $0 | ~300 min/mo, vault only, no CRM sync — PLG hook |
| Pro | **$24/mo** | fair-use unlimited, memory + actions, 1 CRM (~83% margin) |
| Team | **$40/user/mo** | multi-CRM, admin, transparency tier (enterprise upsell) |

## Model strategy — hybrid (cannot bundle Claude/GPT/Gemini; those are API-only)
| Lever | Role |
|---|---|
| On-device transcription (Apple Speech / Android recognizer / whisper.cpp) | Kills #1 cost; offline; "calls never leave your phone" = privacy feature |
| On-device small LLM (Apple Intelligence, Gemini Nano) | Free fast routing + "is this personal?" redaction detection |
| Claude API (Haiku routine / Opus complex) | High-value deal extraction — firm vs ballpark, signal, line items |
| Self-hosted open model (Llama/Qwen) | Only at ~250K-user scale; skip for now |

## Capture reality — what's actually buildable
| Capability | iPhone | Android |
|---|---|---|
| Caller-ID label on incoming call | ⚠️ label + notification (CallKit) | ✅ full overlay (SYSTEM_ALERT_WINDOW) |
| Per-contact auto-trigger rule | ⚠️ notification action | ✅ on overlay |
| **Record/transcribe cellular call audio** | ❌ OS-blocked | ❌ OS-blocked since Android 10 |

**The full auto-trigger vision works on the in-app VoIP business line** (app owns UI + audio):
caller enrichment, accept/decline, per-contact auto-record, live transcription — all legitimate.
Personal/business separation falls out of which number is dialed:
- Mom → personal cell → native dialer, untouched.
- Jason → business line → rings in-app, enriched, auto-transcribes.

For native-call capture later: a BLE hardware recorder (Plaud-style) feeds the same /transcribe endpoint.
