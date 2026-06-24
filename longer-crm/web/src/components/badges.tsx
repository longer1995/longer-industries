import {
  CAPTURE_LABEL,
  PLATFORM_LABEL,
  SIGNAL_META,
  type Capture,
  type FigureType,
  type Platform,
  type Signal,
} from "../lib/types";
import { Pill } from "./ui";

// Signal chip — the trading-desk read on a conversation.
export function SignalChip({ signal }: { signal: Signal | undefined }) {
  const meta = SIGNAL_META[signal ?? "unknown"];
  return (
    <span className={`inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-[0.12em] ${meta.tone}`}>
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

// Firm-quote vs ballpark — the figure trust marker.
export function FigureBadge({ type }: { type: FigureType | null | undefined }) {
  if (type === "firm_quote") {
    return <Pill tone="gold">Firm quote</Pill>;
  }
  return <Pill tone="neutral">Ballpark</Pill>;
}

// How the call was captured — in-person, phone, upload, or a video platform.
export function CaptureBadge({
  capture,
  platform,
}: {
  capture: Capture;
  platform?: Platform;
}) {
  const label =
    capture === "bot" && platform ? PLATFORM_LABEL[platform] : CAPTURE_LABEL[capture];
  return <Pill tone="neutral">{label}</Pill>;
}

export function RecapBadge({
  status,
}: {
  status: "none" | "sent" | "viewed" | null | undefined;
}) {
  if (status === "viewed") return <Pill tone="buy">Viewed</Pill>;
  if (status === "sent") return <Pill tone="warm">Recap sent</Pill>;
  return null;
}
