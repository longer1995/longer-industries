// POST /calendar-webhook  — Calendly webhook (invitee.created).
// When someone books, find the meeting join URL and dispatch a Recall bot via
// /bot-dispatch so the meeting auto-records. The Calendly organizer is mapped to
// a Longer user through the calendar_connections table.
//
// Register this URL as a Calendly webhook subscription scoped to invitee.created.
// Env: INTERNAL_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const evt = await req.json();
    if (evt?.event !== "invitee.created") return json({ ok: true });

    const payload = evt.payload ?? {};
    const ev = payload.scheduled_event ?? {};
    // Calendly only fills join_url for online locations (Zoom/Meet/Teams/Webex).
    const joinUrl: string | undefined = ev?.location?.join_url;
    const organizer: string | undefined = ev?.event_memberships?.[0]?.user;
    if (!joinUrl || !organizer) return json({ ok: true });

    const db = adminClient();
    const { data: conn } = await db
      .from("calendar_connections")
      .select("owner_id, auto_join")
      .eq("provider", "calendly")
      .eq("external_id", organizer)
      .eq("status", "active")
      .single();
    if (!conn || !conn.auto_join) return json({ ok: true });

    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/bot-dispatch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": Deno.env.get("INTERNAL_SECRET") ?? "",
      },
      body: JSON.stringify({
        meeting_url: joinUrl,
        owner_id: conn.owner_id,
        type: "meeting",
        calendar_event_id: ev?.uri ?? null,
      }),
    });

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
