// Talks to the same Supabase Edge Functions the PWA uses (/transcribe, /extract,
// /sync). Uploads recorded audio to the 'recordings' bucket, then kicks off the
// pipeline. The native app reuses 100% of the backend already in this repo.
import * as FileSystem from "expo-file-system";
import { supabase } from "./supabase";
import { CallType } from "./types";

const FUNCTIONS_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;

// Create the call row + upload audio, then trigger transcription.
export async function submitRecording(params: {
  type: CallType;
  consent: boolean;
  localUri: string;
  contactId?: string | null;
  durationSec?: number;
}): Promise<{ callId: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const ownerId = userData.user?.id;
  if (!ownerId) throw new Error("Not signed in");

  const audioPath = `${ownerId}/${Date.now()}.m4a`;

  // Upload the recorded file to the private 'recordings' bucket.
  const fileBytes = await FileSystem.readAsStringAsync(params.localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const { error: upErr } = await supabase.storage
    .from("recordings")
    .upload(audioPath, decodeBase64(fileBytes), { contentType: "audio/m4a" });
  if (upErr) throw upErr;

  const { data: call, error: callErr } = await supabase
    .from("calls")
    .insert({
      owner_id: ownerId,
      type: params.type,
      capture: "mic",
      consent: params.consent,
      audio_path: audioPath,
      status: "processing",
      duration_sec: params.durationSec ?? null,
      contact_id: params.contactId ?? null,
    })
    .select("id")
    .single();
  if (callErr) throw callErr;

  // Fire the transcription edge function (it chains into /extract).
  await fetch(`${FUNCTIONS_URL}/transcribe`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ call_id: call.id }),
  });

  return { callId: call.id };
}

export async function syncCall(callId: string, crm: "hubspot" | "zoho") {
  const res = await fetch(`${FUNCTIONS_URL}/sync`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ call_id: callId, crm }),
  });
  return res.json();
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${data.session?.access_token ?? ""}`,
  };
}

// Minimal base64 → Uint8Array for the Supabase storage upload.
function decodeBase64(b64: string): Uint8Array {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  const clean = b64.replace(/=+$/, "");
  const out = new Uint8Array((clean.length * 3) / 4);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const e1 = lookup[clean.charCodeAt(i)];
    const e2 = lookup[clean.charCodeAt(i + 1)];
    const e3 = lookup[clean.charCodeAt(i + 2)];
    const e4 = lookup[clean.charCodeAt(i + 3)];
    out[p++] = (e1 << 2) | (e2 >> 4);
    if (i + 2 < clean.length) out[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (i + 3 < clean.length) out[p++] = ((e3 & 3) << 6) | e4;
  }
  return out;
}
