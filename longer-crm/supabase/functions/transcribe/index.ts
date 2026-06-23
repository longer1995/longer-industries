// POST /transcribe  { call_id }
// Pulls the call's audio from storage, runs Whisper, saves the transcript,
// then kicks off /extract. Returns the transcript.
//
// Env: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { preflight, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const { call_id } = await req.json();
    if (!call_id) return json({ error: "call_id required" }, 400);

    const db = adminClient();

    const { data: call, error: callErr } = await db
      .from("calls").select("id, audio_path").eq("id", call_id).single();
    if (callErr || !call) return json({ error: "call not found" }, 404);
    if (!call.audio_path) return json({ error: "call has no audio_path" }, 400);

    // Download audio from the private 'recordings' bucket.
    const { data: file, error: dlErr } = await db
      .storage.from("recordings").download(call.audio_path);
    if (dlErr || !file) return json({ error: "could not read audio" }, 500);

    // Whisper transcription.
    const form = new FormData();
    form.append("file", file, call.audio_path.split("/").pop() ?? "audio.m4a");
    form.append("model", "whisper-1");

    const whisper = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}` },
        body: form,
      },
    );
    if (!whisper.ok) {
      const t = await whisper.text();
      await db.from("calls").update({ status: "failed" }).eq("id", call_id);
      return json({ error: "whisper failed", detail: t }, 502);
    }
    const { text } = await whisper.json();

    await db.from("calls")
      .update({ transcript: text, status: "ready" })
      .eq("id", call_id);

    // Fire-and-forget the extraction step.
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ call_id }),
    }).catch(() => {});

    return json({ call_id, transcript: text });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
