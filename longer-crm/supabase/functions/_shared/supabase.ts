// Service-role Supabase client for use inside Edge Functions.
// NEVER expose the service key to the frontend — it bypasses RLS.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}
