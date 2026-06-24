# Handoff — move this frontend into the Lovable repo (`atlas-voice-companion`)

This `web/` app is the hand-built Longer CRM frontend. The goal is to **replace the
generic Lovable-generated starter** in `longer1995/atlas-voice-companion` with this code,
so Lovable hosts/publishes the premium UI (and you can still tweak it visually).

> This must be done from a session that can access `atlas-voice-companion`.
> Start a new Claude Code web session scoped to that repo (ideally with this repo,
> `longer-industries`, also accessible so the files can be copied directly).

## Steps (run in the `atlas-voice-companion` repo)

1. **Branch.** `git checkout -b import-longer-crm-frontend`

2. **Remove the generated starter app** (keep repo metadata, `.git`, Lovable config,
   `README`, license, any `.lovable`/`supabase` wiring if present):
   - delete `src/`, `index.html`
   - delete the starter `vite.config.*`, `tailwind.config.*`, `postcss.config.*` only if
     replacing them (they will be, below)

3. **Copy in this frontend** — everything under `longer-crm/web/` from `longer-industries`:
   ```
   src/  index.html  vite.config.ts  tailwind.config.ts  postcss.config.js
   tsconfig.json  package.json  public/  .env.example  .gitignore  README.md
   ```
   If `atlas-voice-companion` already has a `package.json` Lovable depends on, MERGE the
   dependencies from this `package.json` into it rather than overwriting blindly. The
   required deps: `@supabase/supabase-js`, `react`, `react-dom`, `react-router-dom`,
   plus dev: `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`,
   `typescript`, `@types/*`, `vite-plugin-pwa`.

4. **Set env vars** (Lovable project settings → Environment, and a local `.env.local`):
   ```
   VITE_SUPABASE_URL=https://<your-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```
   Use the SAME Supabase project the backend (in `longer-industries/longer-crm/supabase`)
   is deployed to — see that repo's `DEPLOY.md`.

5. **Install + verify:**
   ```
   npm install
   npm run build      # must pass: tsc --noEmit && vite build
   npm run dev        # eyeball it at localhost:5173
   ```

6. **Commit + push**, open in Lovable, confirm it builds and publishes.

## After the move — the one rule
Treat the **code as the source of truth.** Use Lovable for hosting, custom domain, and
small visual tweaks. Do NOT ask Lovable's AI to "regenerate" or "redesign" the app — its
generator doesn't know this bespoke design system and will drift it back toward a generic
template. Small, targeted edits are fine; wholesale regeneration is not.

## Backend reminder
No transcription / AI / CRM logic lives in this frontend — those are Supabase Edge
Functions (`transcribe`, `extract`, `sync`, `bot-dispatch`, `recap`, …) already in
`longer-industries/longer-crm/supabase`. The frontend only invokes them. Full contract:
`longer-industries/longer-crm/FRONTEND_INTEGRATION.md`.
