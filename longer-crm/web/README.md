# Longer CRM — Web PWA

A hand-built, installable PWA frontend for Longer CRM. Mobile-first, dark, with a
bespoke design system: **financial-terminal precision married to quiet-luxury restraint**
— warm charcoal base, muted gold accent, editorial serif headings, tabular-mono numerics.

Not a Lovable / shadcn template — every token, badge, and motion curve is deliberate.

## Stack
- **Vite + React 18 + TypeScript**
- **Tailwind CSS** (custom design system in `tailwind.config.ts` + `src/index.css`)
- **@supabase/supabase-js** — Auth, Postgres (RLS), Storage, Edge Functions
- **vite-plugin-pwa** — installable, "Longer CRM" / short name "Longer"

It talks to the backend in `../supabase` exactly per [`../FRONTEND_INTEGRATION.md`](../FRONTEND_INTEGRATION.md).
No transcription / AI / CRM logic lives here — those are Edge Functions we only invoke.

## Run it
```bash
cd longer-crm/web
npm install
cp .env.example .env.local      # fill in your Supabase URL + anon key
npm run dev                     # http://localhost:5173
```

## Build
```bash
npm run build        # typecheck + production bundle → dist/
npm run preview      # serve the built bundle
```

Deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages). Set the two
`VITE_SUPABASE_*` env vars in the host. The frontend and backend can live in
**separate** Supabase projects — the client just points at whichever URL you set.

## Design system
| Token | Value | Use |
|---|---|---|
| `ink` | `#0B0A09` | app background (warm near-black) |
| `ink-raised` | `#121110` | cards, sidebar |
| `bone` | `#EDEAE3` | primary text |
| `gold` | `#C2A24E` | the single accent — figures, active state |
| `signal-*` | desaturated green/gold/amber/clay | conversation signal |
| `font-display` | Newsreader (serif) | headings |
| `font-mono` | IBM Plex Mono | figures, badges, timers (tabular) |

## Screens
- **Book** (`/`) — the unified book of business: field + meeting captures together,
  signal chips, firm/ballpark badges, live pipeline totals.
- **Capture** (`/capture`) — four call types → mic recording sheet (consent gate, live
  timer); plus "send a bot to a meeting" link dispatch.
- **Call detail** (`/call/:id`) — transcript, insights, editable line items, the review
  gate (approve/redact → enables CRM sync), and the premium **Send recap** flow.
- **Meetings** (`/meetings`) — calendar connection + bot-recorded meetings.
