// POST /bot-dispatch
// Sends a Recall.ai bot to join a meeting (Zoom / Teams / Google Meet / Webex)
// and creates a 'bot' capture call. Recall calls /recall-webhook when the
// transcript is ready, which fires /extract — the SAME pipeline mic + upload use.
//
// Body: { meeting_url, type?, contact_id?, calendar_event_id?, owner_id? }
// Auth: a user JWT (frontend) OR an x-internal-secret header (server-to-server,
//       e.g. the Calendly webhook) with owner_id in the body.
//
// Env: RECALL_API_KEY, RECALL_REGION (default us-west-2), INTERNAL_SECRET,
//      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { preflight, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

const REGION = Deno.env.get("RECALL_REGION") ?? "us-west-2";

function platformFromUrl(url: string): string | null {
  if (/zoom\.us/i.test(url)) return "zoom";
  if (/teams\.(microsoft|live)\.com/i.test(url)) return "teams";
  if (/meet\.google\.com/i.test(url)) return "meet";
  if (/webex\.com/i.test(url)) return "webex";
  return null;
}

// Resolve the owning user from a frontend JWT, or trust an internal call.
async function resolveOwner(
  req: Request,
  db: ReturnType<typeof adminClient>,
  body: Record<string, unknown>,
): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const { data } = await db.auth.getUser(auth.slice(7));
    if (data.user) return data.user.id;
  }
  if (req.headers.get("x-internal-secret") === Deno.env.get("INTERNAL_SECRET")) {
    return (body.owner_id as string) ?? null;
  }
  return null;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const body = await req.json();
    const meeting_url = body.meeting_url as string;
    if (!meeting_url) return json({ error: "meeting_url required" }, 400);

    const db = adminClient();
    const owner_id = await resolveOwner(req, db, body);
    if (!owner_id) return json({ error: "unauthorized" }, 401);

    // Ask Recall to send a bot into the meeting and transcribe it.
    const recall = await fetch(`https://${REGION}.recall.ai/api/v1/bot/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${Deno.env.get("RECALL_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        meeting_url,
        bot_name: "Longer Notetaker",
        // Recall's built-in transcription. To cut cost later, drop this and have
        // /recall-webhook download the audio and route it through /transcribe
        // (self-hosted Whisper) instead.
        transcription_options: { provider: "meeting_captions" },
      }),
    });
    if (!recall.ok) {
      return json({ error: "recall bot failed", detail: await recall.text() }, 502);
    }
    const bot = await recall.json();

    const { data: call, error } = await db
      .from("calls")
      .insert({
        owner_id,
        type: body.type ?? "meeting",
        capture: "bot",
        consent: true, // the bot announces itself in the meeting
        status: "processing",
        platform: platformFromUrl(meeting_url),
        meeting_url,
        recall_bot_id: bot.id,
        contact_id: body.contact_id ?? null,
        calendar_event_id: body.calendar_event_id ?? null,
      })
      .select("id")
      .single();
    if (error) return json({ error: error.message }, 500);

    return json({ call_id: call.id, recall_bot_id: bot.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
