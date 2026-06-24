// Mirrors the Postgres enums/tables in ../../supabase/schema.sql so the native
// app and backend speak the same language.
export type CallType = "meeting" | "sales_call" | "order" | "support";

export type Signal =
  | "interested"
  | "not_interested"
  | "needs_follow_up"
  | "ready_to_buy"
  | "unknown";

export type FigureType = "firm_quote" | "ballpark";

export interface LineItem {
  description: string;
  quantity?: number | null;
  unit?: string | null;
  amount?: number | null;
  figure_type?: FigureType | null;
}

export interface CallInsight {
  call_id: string;
  signal: Signal;
  intent: string;
  summary?: string | null;
  next_action?: string | null;
  suggested_doc?: string | null;
  sync_status: "pending" | "approved" | "redacted" | "synced" | "skipped";
}

export const CALL_TYPES: { type: CallType; label: string }[] = [
  { type: "meeting", label: "Meeting" },
  { type: "sales_call", label: "Sales Call" },
  { type: "order", label: "Order" },
  { type: "support", label: "Support" },
];
