// POST /recall-webhook  — called by Recall.ai as the bot progresses.
// When the recording is finished we pull the transcript, attach it to the
// matching call, and fire /extract (the same step mic/upload captures use).
//
// Configure this URL as the bot's webhook in Recall, with a shared secret header.
// Env: RECALL_API_KEY, RECALL_REGION, RECALL_WEBHOOK_SECRET, SUPABASE_URL,
//      SUPABASE_SERVICE_ROLE_KEY
import { json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

const REGION = Deno.env.get("RECALL_REGION") ?? "us-west-2";

// Recall delivers a transcript as utterances, each with a words[] array.
function flatten(transcript: unknown): string {
  if (!Array.isArray(transcript)) return "";
  return transcript
    .map((u) => {
      const speaker = u.speaker ?? u.participant?.name ?? "Speaker";
      const words = (u.words ?? []).map((w: { text: string }) => w.text).join(" ");
      return words ? `${speaker}: ${words}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // Shared-secret check (set this header when registering the webhook in Recall).
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("RECALL_WEBHOOK_SECRET")) {
    return json({ error: "bad signature" }, 401);
  }

  try {
    const evt = await req.json();
    const botId = evt?.data?.bot_id ?? evt?.bot_id;
    const status = evt?.event ?? evt?.data?.status?.code;
    if (!botId) return json({ ok: true });

    // Only act once the recording has finished.
    const done = ["bot.done", "done", "call_ended", "recording.done"];
    if (!done.includes(status)) return json({ ok: true });

    const db = adminClient();
    const { data: call } = await db
      .from("calls").select("id").eq("recall_bot_id", botId).single();
    if (!call) return json({ ok: true });

    // Pull the transcript from Recall.
    const res = await fetch(
      `https://${REGION}.recall.ai/api/v1/bot/${botId}/transcript/`,
      { headers: { Authorization: `Token ${Deno.env.get("RECALL_API_KEY")}` } },
    );
    const transcript = res.ok ? flatten(await res.json()) : "";

    await db.from("calls")
      .update({ transcript, status: transcript ? "ready" : "failed" })
      .eq("id", call.id);

    if (transcript) {
      // Fire-and-forget the extraction step (same as transcribe/index.ts).
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ call_id: call.id }),
      }).catch(() => {});
    }

    return json({ ok: true, call_id: call.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
