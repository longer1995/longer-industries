// The API surface, exactly per FRONTEND_INTEGRATION.md. Table reads/writes go
// through the Supabase client (RLS-scoped); pipeline work goes through Edge
// Functions via functions.invoke (the user JWT is attached automatically).
import { supabase } from "./supabase";
import type {
  CallRow,
  CallType,
  Capture,
  LineItem,
  PrivacyMode,
  SyncStatus,
} from "./types";

const CALL_SELECT =
  "*, contacts(name, company, privacy_mode), call_insights(*), line_items(*)";

// ---- The unified book of business -----------------------------------------
export async function listCalls(): Promise<CallRow[]> {
  const { data, error } = await supabase
    .from("calls")
    .select(CALL_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  // PostgREST returns 1:1 embeds as arrays in some configs — normalize.
  return (data ?? []).map(normalizeRow);
}

export async function getCall(id: string): Promise<CallRow | null> {
  const { data, error } = await supabase
    .from("calls")
    .select(CALL_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeRow(data) : null;
}

function normalizeRow(raw: any): CallRow {
  return {
    ...raw,
    contacts: Array.isArray(raw.contacts) ? raw.contacts[0] ?? null : raw.contacts,
    call_insights: Array.isArray(raw.call_insights)
      ? raw.call_insights[0] ?? null
      : raw.call_insights,
    line_items: raw.line_items ?? [],
  };
}

// ---- Field capture (mic / upload) -----------------------------------------
// 1) insert calls row → 2) upload audio → 3) set audio_path → 4) transcribe.
export async function submitFieldCall(params: {
  type: CallType;
  capture: Extract<Capture, "mic" | "upload">;
  consent: boolean;
  blob: Blob;
  durationSec?: number;
  contactId?: string | null;
}): Promise<{ callId: string }> {
  const { data: u } = await supabase.auth.getUser();
  const ownerId = u.user?.id;
  if (!ownerId) throw new Error("Not signed in");

  const { data: call, error: insErr } = await supabase
    .from("calls")
    .insert({
      owner_id: ownerId,
      type: params.type,
      capture: params.capture,
      consent: params.consent,
      status: "processing",
      duration_sec: params.durationSec ?? null,
      contact_id: params.contactId ?? null,
    })
    .select("id")
    .single();
  if (insErr) throw insErr;

  const path = `${ownerId}/${call.id}.webm`;
  const { error: upErr } = await supabase.storage
    .from("recordings")
    .upload(path, params.blob, { contentType: "audio/webm", upsert: true });
  if (upErr) throw upErr;

  await supabase.from("calls").update({ audio_path: path }).eq("id", call.id);

  const { error: fnErr } = await supabase.functions.invoke("transcribe", {
    body: { call_id: call.id },
  });
  if (fnErr) throw fnErr;

  return { callId: call.id };
}

// ---- Meeting capture (bot) -------------------------------------------------
export async function dispatchBot(params: {
  meetingUrl: string;
  contactId?: string | null;
}): Promise<{ callId?: string }> {
  const { data, error } = await supabase.functions.invoke("bot-dispatch", {
    body: {
      meeting_url: params.meetingUrl,
      type: "meeting",
      contact_id: params.contactId ?? null,
    },
  });
  if (error) throw error;
  return { callId: data?.call_id };
}

// ---- Review gate -----------------------------------------------------------
export async function setSyncStatus(callId: string, status: SyncStatus) {
  const { error } = await supabase
    .from("call_insights")
    .update({ sync_status: status })
    .eq("call_id", callId);
  if (error) throw error;
}

export async function saveLineItems(callId: string, items: LineItem[]) {
  // Replace-in-place: simplest correct semantics for an edit-then-approve flow.
  const { error: delErr } = await supabase
    .from("line_items")
    .delete()
    .eq("call_id", callId);
  if (delErr) throw delErr;
  if (items.length === 0) return;
  const { error } = await supabase
    .from("line_items")
    .insert(items.map((li) => ({ ...li, call_id: callId, id: undefined })));
  if (error) throw error;
}

export async function setContactPrivacy(contactId: string, mode: PrivacyMode) {
  const { error } = await supabase
    .from("contacts")
    .update({ privacy_mode: mode })
    .eq("id", contactId);
  if (error) throw error;
}

// ---- CRM sync --------------------------------------------------------------
export async function syncToCrm(callId: string, crm: "hubspot" | "zoho") {
  const { data, error } = await supabase.functions.invoke("sync", {
    body: { call_id: callId, crm },
  });
  if (error) throw error;
  return data;
}

// ---- Recap (the viral surface) --------------------------------------------
export async function sendRecap(params: {
  callId: string;
  recipientName?: string;
  recipientEmail?: string;
}): Promise<{ share_url: string }> {
  const { data, error } = await supabase.functions.invoke("recap", {
    body: {
      call_id: params.callId,
      recipient_name: params.recipientName,
      recipient_email: params.recipientEmail,
    },
  });
  if (error) throw error;
  return data as { share_url: string };
}
