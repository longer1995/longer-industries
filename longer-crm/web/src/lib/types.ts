// Mirrors the Postgres enums/tables in ../../supabase/schema*.sql. Keep in lockstep
// with FRONTEND_INTEGRATION.md — the UI renders exactly these shapes.

export type CallType = "meeting" | "sales_call" | "order" | "support";

export type Capture = "mic" | "upload" | "voip" | "bot";

export type Platform = "zoom" | "teams" | "meet" | "webex" | null;

export type CallStatus = "processing" | "recording" | "ready" | "failed";

export type Signal =
  | "interested"
  | "not_interested"
  | "needs_follow_up"
  | "ready_to_buy"
  | "unknown";

export type SyncStatus =
  | "pending"
  | "approved"
  | "redacted"
  | "synced"
  | "skipped";

export type FigureType = "firm_quote" | "ballpark";

export type PrivacyMode = "full" | "line_items_only" | "never_sync";

export interface Contact {
  id: string;
  owner_id: string;
  name: string | null;
  company: string | null;
  privacy_mode: PrivacyMode;
  crm_ids?: Record<string, string> | null;
}

export interface LineItem {
  id?: string;
  call_id?: string;
  description: string;
  quantity?: number | null;
  unit?: string | null;
  amount?: number | null;
  figure_type?: FigureType | null;
}

export interface CallInsight {
  call_id: string;
  signal: Signal;
  intent: string | null;
  summary?: string | null;
  next_action?: string | null;
  suggested_doc?: string | null;
  confidence?: number | null;
  sync_status: SyncStatus;
}

export interface Call {
  id: string;
  owner_id: string;
  contact_id: string | null;
  type: CallType;
  capture: Capture;
  platform?: Platform;
  consent: boolean;
  meeting_url?: string | null;
  audio_path?: string | null;
  transcript?: string | null;
  status: CallStatus;
  duration_sec?: number | null;
  recap_status?: "none" | "sent" | "viewed" | null;
  view_count?: number | null;
  created_at: string;
}

// The joined shape the "book of business" renders.
export interface CallRow extends Call {
  contacts?: Pick<Contact, "name" | "company" | "privacy_mode"> | null;
  call_insights?: CallInsight | null;
  line_items?: LineItem[];
}

export const CALL_TYPES: { type: CallType; label: string }[] = [
  { type: "meeting", label: "Meeting" },
  { type: "sales_call", label: "Sales Call" },
  { type: "order", label: "Order" },
  { type: "support", label: "Support" },
];

export const SIGNAL_META: Record<
  Signal,
  { label: string; tone: string; dot: string }
> = {
  ready_to_buy: { label: "Ready to buy", tone: "text-signal-buy", dot: "bg-signal-buy" },
  interested: { label: "Interested", tone: "text-signal-warm", dot: "bg-signal-warm" },
  needs_follow_up: {
    label: "Needs follow-up",
    tone: "text-signal-follow",
    dot: "bg-signal-follow",
  },
  not_interested: {
    label: "Not interested",
    tone: "text-signal-cold",
    dot: "bg-signal-cold",
  },
  unknown: { label: "Unscored", tone: "text-signal-unknown", dot: "bg-signal-unknown" },
};

export const PLATFORM_LABEL: Record<NonNullable<Platform>, string> = {
  zoom: "Zoom",
  teams: "Teams",
  meet: "Meet",
  webex: "Webex",
};

export const CAPTURE_LABEL: Record<Capture, string> = {
  mic: "In person",
  upload: "Upload",
  voip: "Phone",
  bot: "Video",
};
