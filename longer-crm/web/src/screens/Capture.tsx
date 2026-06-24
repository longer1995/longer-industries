import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dispatchBot, submitFieldCall } from "../lib/api";
import { clock } from "../lib/format";
import { CALL_TYPES, type CallType } from "../lib/types";
import { Button, Spinner } from "../components/ui";

export function Capture() {
  const [type, setType] = useState<CallType | null>(null);

  return (
    <div className="px-5 pt-7 md:px-10">
      <span className="eyebrow">Capture</span>
      <h1 className="mt-1.5 font-display text-3xl tracking-tight text-bone">
        Record a conversation.
      </h1>
      <p className="mt-2 max-w-md text-sm text-bone-dim">
        Field calls record on this device. For a video meeting, paste the link and a
        bot joins and records it for you.
      </p>

      {/* Call type grid */}
      <div className="mt-7 grid grid-cols-2 gap-3">
        {CALL_TYPES.map(({ type: t, label }) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className="surface group relative overflow-hidden px-5 py-7 text-left transition-all duration-150 hover:border-gold/30 hover:bg-ink-high active:scale-[0.99]"
          >
            <span className="font-display text-xl text-bone">{label}</span>
            <span className="mt-1 block font-mono text-2xs uppercase tracking-[0.12em] text-bone-faint">
              Tap to record
            </span>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-bone-faint transition-colors group-hover:text-gold">
              →
            </span>
          </button>
        ))}
      </div>

      {/* Meeting bot */}
      <MeetingBot />

      {type && <RecordSheet type={type} onClose={() => setType(null)} />}
    </div>
  );
}

// --- The recording sheet ----------------------------------------------------
function RecordSheet({ type, onClose }: { type: CallType; onClose: () => void }) {
  const nav = useNavigate();
  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const label = CALL_TYPES.find((c) => c.type === type)?.label ?? "Call";

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: pickMime() });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.start();
      mediaRef.current = rec;
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("Microphone access denied. Enable it in your browser settings.");
    }
  }

  async function stop() {
    const rec = mediaRef.current;
    if (!rec) return;
    setSubmitting(true);
    if (timerRef.current) window.clearInterval(timerRef.current);

    const blob: Blob = await new Promise((resolve) => {
      rec.onstop = () =>
        resolve(new Blob(chunksRef.current, { type: rec.mimeType }));
      rec.stop();
    });
    rec.stream.getTracks().forEach((t) => t.stop());

    try {
      const { callId } = await submitFieldCall({
        type,
        capture: "mic",
        consent,
        blob,
        durationSec: seconds,
      });
      nav(`/call/${callId}`);
    } catch (e: any) {
      setError(e.message ?? "Upload failed.");
      setSubmitting(false);
      setRecording(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 backdrop-blur-sm md:items-center">
      <div className="w-full max-w-md animate-fade-up rounded-t-2xl border border-ink-line bg-ink-raised p-6 shadow-raise md:rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <span className="eyebrow">Recording · {label}</span>
            <div className="mt-2 font-mono text-5xl font-medium tracking-tight text-bone tnum">
              {clock(seconds)}
            </div>
          </div>
          <div
            className={`flex items-center gap-2 font-mono text-2xs uppercase tracking-[0.14em] ${
              recording ? "text-signal-cold" : "text-bone-faint"
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                recording ? "bg-signal-cold animate-pulse-rec" : "bg-bone-faint"
              }`}
            />
            {recording ? "Live" : "Ready"}
          </div>
        </div>

        {/* Consent gate — required before record is allowed */}
        <button
          onClick={() => setConsent((c) => !c)}
          className="mt-6 flex w-full items-center gap-3 rounded-xl border border-ink-line bg-ink px-4 py-3.5 text-left transition-colors hover:bg-ink-high"
        >
          <span
            className={`grid size-5 shrink-0 place-items-center rounded-md border transition-colors ${
              consent ? "border-gold bg-gold text-ink" : "border-ink-muted"
            }`}
          >
            {consent && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12.5 10 17 19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span className="text-sm text-bone-dim">
            I have consent to record this conversation.
          </span>
        </button>

        {error && (
          <p className="mt-4 rounded-lg border border-signal-cold/30 bg-signal-cold/5 px-3 py-2 text-sm text-signal-cold">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          {!recording ? (
            <Button
              size="lg"
              className="flex-1"
              disabled={!consent}
              onClick={start}
            >
              ● Start recording
            </Button>
          ) : (
            <Button
              size="lg"
              variant="danger"
              className="flex-1"
              loading={submitting}
              onClick={stop}
            >
              {submitting ? "Uploading…" : "■ Stop & process"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Meeting bot dispatch ---------------------------------------------------
function MeetingBot() {
  const nav = useNavigate();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const { callId } = await dispatchBot({ meetingUrl: url.trim() });
      setOk(true);
      if (callId) setTimeout(() => nav(`/call/${callId}`), 900);
    } catch (e: any) {
      setError(e.message ?? "Could not dispatch the bot.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface mt-8 p-5">
      <span className="eyebrow">Record a meeting now</span>
      <p className="mt-2 text-sm text-bone-dim">
        Paste a Zoom, Teams, Meet, or Webex link. A bot joins, records, and the call
        lands in your book like any other.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://zoom.us/j/…"
          className="h-12 flex-1 rounded-xl border border-ink-line bg-ink px-4 text-sm text-bone placeholder:text-bone-faint outline-none transition-colors focus:border-gold/50 focus:bg-ink-high"
        />
        <Button
          onClick={send}
          disabled={!url.trim() || busy || ok}
          size="lg"
        >
          {busy ? <Spinner /> : ok ? "Bot sent ✓" : "Send bot"}
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-signal-cold">{error}</p>}
    </div>
  );
}

function pickMime(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c))
      return c;
  }
  return "audio/webm";
}
