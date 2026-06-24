// Supabase client for the PWA. Uses the ANON key (safe in the browser);
// RLS scopes every row to auth.uid(). Points at whichever project you set in
// .env — your own dedicated Supabase per DEPLOY.md.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anon) {
  // Loud, early failure beats a blank screen with cryptic 401s.
  console.error(
    "[Longer CRM] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example → .env.local."
  );
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
