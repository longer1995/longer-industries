# Longer CRM — native app (Phase 2 scaffold)

Expo / React Native skeleton that reuses the **same Supabase backend** as the PWA
(`../supabase`). Capture → transcribe → extract → review → CRM. This exists so
Phase 2 isn't a cold start; the PWA proves the wedge first.

## What's here
```
App.tsx                  # Home → Record screen switch
app.json                 # Expo config (mic permission, bundle IDs)
src/lib/supabase.ts      # Supabase client (anon key; RLS protects rows)
src/lib/api.ts           # uploads audio + calls /transcribe, /sync edge fns
src/lib/types.ts         # mirrors the Postgres enums
src/screens/HomeScreen   # the four capture buttons
src/screens/RecordScreen # mic record + consent + submit
```

## Run it
```
cd native
npm install
cp .env.example .env      # fill EXPO_PUBLIC_SUPABASE_URL + ANON key
npx expo start            # scan QR with Expo Go for instant preview
```
> Expo Go covers mic recording + the full pipeline. The Phase-2 native-only
> features (VoIP dialer, on-device Whisper, caller-ID overlay) need a custom
> dev build (`npx expo run:ios` / `run:android`), not Expo Go.

## Distribution
- **Android:** `eas build -p android --profile preview` → installable **APK** you
  can drop on a GitHub Release or a gated page. Side-loads directly.
- **iOS:** requires an Apple Developer account ($99/yr) + **TestFlight**
  (`eas build -p ios` → `eas submit`). iPhones cannot install an `.ipa` from a
  web link — this is an Apple restriction, not a project limitation.

## Phase-2 roadmap (native-only)
1. On-device transcription (replace Whisper API) — cost + privacy + offline.
2. VoIP business line (CallKit + your own number) — the only path to real
   phone-call capture; powers the caller-ID overlay + per-contact auto-record.
3. Background processing + push notifications.
