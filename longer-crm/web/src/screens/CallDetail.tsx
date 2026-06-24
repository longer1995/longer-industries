import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getCall,
  saveLineItems,
  sendRecap,
  setContactPrivacy,
  setSyncStatus,
  syncToCrm,
} from "../lib/api";
import { callValue, duration, lineTotal, money, relativeDate } from "../lib/format";
import type { CallRow, LineItem, PrivacyMode, Signal } from "../lib/types";
import { CaptureBadge, FigureBadge, SignalChip } from "../components/badges";
import { Button, Pill, Spinner } from "../components/ui";

const PRIVACY: { mode: PrivacyMode; label: string; note: string }[] = [
  { mode: "full", label: "Full sync", note: "Everything pushes to the CRM." },
  { mode: "line_items_only", label: "Figures only", note: "Only quote line items sync." },
  { mode: "never_sync", label: "Never sync", note: "Nothing leaves Longer." },
];

export function CallDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [row, setRow] = useState<CallRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);

  async function load() {
    try {
      const r = await getCall(id);
      setRow(r);
      setItems(r?.line_items ?? []);
    } catch (e: any) {
      setError(e.message ?? "Failed to load call.");
    }
  }

  useEffect(() => {
    load();
    // While processing, poll until insights land.
    const t = window.setInterval(async () => {
      const r = await getCall(id);
      if (r && r.status !== "processing" && r.status !== "recording") {
        setRow(r);
        setItems(r.line_items ?? []);
        window.clearInterval(t);
      }
    }, 4000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error)
    return <DetailShell><p className="text-signal-cold">{error}</p></DetailShell>;
  if (!row)
    return (
      <DetailShell>
        <div className="space-y-3">
          <div className="skeleton h-8 w-2/3" />
          <div className="skeleton h-40 w-full rounded-2xl" />
        </div>
      </DetailShell>
    );

  const insight = row.call_insights;
  const processing = row.status === "processing" || row.status === "recording";
  const value = items.reduce((s, li) => s + lineTotal(li), 0) || callValue(row);
  const contactId = row.contact_id;
  const approved =
    insight?.sync_status === "approved" || insight?.sync_status === "redacted";

  return (
    <DetailShell>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CaptureBadge capture={row.capture} platform={row.platform} />
            <span className="font-mono text-2xs uppercase tracking-[0.12em] text-bone-faint">
              {relativeDate(row.created_at)} · {duration(row.duration_sec)}
            </span>
          </div>
          <h1 className="mt-2 truncate font-display text-3xl tracking-tight text-bone">
            {row.contacts?.name ?? "Unknown contact"}
          </h1>
          {row.contacts?.company && (
            <p className="text-bone-dim">{row.contacts.company}</p>
          )}
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-medium text-gold tnum">
            {value > 0 ? money(value) : "—"}
          </div>
          <div className="mt-1">
            <SignalChip signal={insight?.signal as Signal} />
          </div>
        </div>
      </div>

      {processing && (
        <div className="surface mt-6 flex items-center gap-3 p-4">
          <Spinner className="text-gold" />
          <span className="text-sm text-bone-dim">
            Transcribing and extracting insights… this updates automatically.
          </span>
        </div>
      )}

      {/* Insights */}
      {insight && (
        <section className="surface mt-6 p-5">
          <span className="eyebrow">Insight</span>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Intent" value={insight.intent ?? "—"} />
            <Field label="Next action" value={insight.next_action ?? "—"} />
          </div>
          {insight.summary && (
            <div className="mt-4">
              <span className="eyebrow">Summary</span>
              <p className="mt-1.5 text-sm leading-relaxed text-bone-dim">
                {insight.summary}
              </p>
            </div>
          )}
          {insight.suggested_doc && (
            <div className="mt-4 flex items-center gap-2">
              <span className="eyebrow">Suggested</span>
              <Pill tone="gold">{insight.suggested_doc}</Pill>
            </div>
          )}
        </section>
      )}

      {/* Line items — editable, firm vs ballpark */}
      <LineItemsEditor
        items={items}
        onChange={setItems}
        onSave={async () => {
          await saveLineItems(row.id, items);
          await load();
        }}
      />

      {/* Transcript */}
      {row.transcript && <Transcript text={row.transcript} />}

      {/* Privacy */}
      {contactId && (
        <section className="surface mt-6 p-5">
          <span className="eyebrow">Contact privacy</span>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {PRIVACY.map((p) => (
              <button
                key={p.mode}
                onClick={() => contactId && setContactPrivacy(contactId, p.mode).then(load)}
                className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                  row.contacts?.privacy_mode === p.mode
                    ? "border-gold/40 bg-gold-wash"
                    : "border-ink-line hover:bg-ink-high"
                }`}
              >
                <div className="text-sm font-medium text-bone">{p.label}</div>
                <div className="mt-0.5 text-2xs text-bone-faint">{p.note}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Review + actions */}
      <ReviewBar
        row={row}
        approved={approved}
        onApprove={async (status) => {
          await setSyncStatus(row.id, status);
          await load();
        }}
        onDiscard={() => nav("/")}
      />
    </DetailShell>
  );
}

function DetailShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-28 pt-6 md:px-8">
      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-[0.14em] text-bone-faint transition-colors hover:text-bone"
      >
        ← Book
      </Link>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="eyebrow">{label}</span>
      <p className="mt-1 text-sm text-bone">{value}</p>
    </div>
  );
}

function LineItemsEditor({
  items,
  onChange,
  onSave,
}: {
  items: LineItem[];
  onChange: (i: LineItem[]) => void;
  onSave: () => Promise<void>;
}) {
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  function update(i: number, patch: Partial<LineItem>) {
    const next = items.map((li, idx) => (idx === i ? { ...li, ...patch } : li));
    onChange(next);
    setDirty(true);
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
    setDirty(true);
  }
  function add() {
    onChange([
      ...items,
      { description: "", quantity: 1, unit: "ea", amount: 0, figure_type: "ballpark" },
    ]);
    setDirty(true);
  }

  const total = items.reduce((s, li) => s + lineTotal(li), 0);

  return (
    <section className="surface mt-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-line px-5 py-3.5">
        <span className="eyebrow">Line items</span>
        <span className="font-mono text-sm text-bone tnum">{money(total, true)}</span>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-6 text-sm text-bone-faint">
          No figures extracted. Add one if a price was discussed.
        </div>
      ) : (
        <ul className="divide-y divide-ink-line">
          {items.map((li, i) => (
            <li key={i} className="px-5 py-3.5">
              <div className="flex items-start gap-3">
                <input
                  value={li.description}
                  onChange={(e) => update(i, { description: e.target.value })}
                  placeholder="Description"
                  className="min-w-0 flex-1 bg-transparent text-sm text-bone outline-none placeholder:text-bone-faint"
                />
                <button
                  onClick={() => remove(i)}
                  className="text-bone-faint transition-colors hover:text-signal-cold"
                  aria-label="Remove line"
                >
                  ✕
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <NumInput
                  value={li.quantity ?? 1}
                  onChange={(v) => update(i, { quantity: v })}
                  suffix={li.unit ?? "ea"}
                />
                <span className="text-bone-faint">×</span>
                <NumInput
                  value={li.amount ?? 0}
                  onChange={(v) => update(i, { amount: v })}
                  prefix="$"
                />
                <button
                  onClick={() =>
                    update(i, {
                      figure_type:
                        li.figure_type === "firm_quote" ? "ballpark" : "firm_quote",
                    })
                  }
                  className="ml-auto"
                >
                  <FigureBadge type={li.figure_type} />
                </button>
                <span className="font-mono text-sm text-bone tnum">
                  {money(lineTotal(li), true)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between border-t border-ink-line px-5 py-3">
        <button
          onClick={add}
          className="font-mono text-2xs uppercase tracking-[0.14em] text-gold hover:text-gold-soft"
        >
          + Add line
        </button>
        {dirty && (
          <Button
            size="sm"
            loading={saving}
            onClick={async () => {
              setSaving(true);
              await onSave();
              setSaving(false);
              setDirty(false);
            }}
          >
            Save figures
          </Button>
        )}
      </div>
    </section>
  );
}

function NumInput({
  value,
  onChange,
  prefix,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-ink-line bg-ink px-2.5 py-1.5">
      {prefix && <span className="font-mono text-2xs text-bone-faint">{prefix}</span>}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-16 bg-transparent font-mono text-sm text-bone outline-none tnum"
      />
      {suffix && <span className="font-mono text-2xs text-bone-faint">{suffix}</span>}
    </span>
  );
}

function Transcript({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="surface mt-6 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <span className="eyebrow">Transcript</span>
        <span className="text-bone-faint">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="max-h-96 overflow-y-auto border-t border-ink-line px-5 py-4 text-sm leading-relaxed text-bone-dim no-scrollbar">
          {text.split("\n").map((line, i) => (
            <p key={i} className="mb-2">
              {line}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

function ReviewBar({
  row,
  approved,
  onApprove,
  onDiscard,
}: {
  row: CallRow;
  approved: boolean;
  onApprove: (status: "approved" | "redacted") => Promise<void>;
  onDiscard: () => void;
}) {
  const [recap, setRecap] = useState<{ url: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve(status: "approved" | "redacted") {
    setBusy(status);
    await onApprove(status);
    setBusy(null);
  }

  async function doSync(crm: "hubspot" | "zoho") {
    setBusy(crm);
    setError(null);
    try {
      await syncToCrm(row.id, crm);
    } catch (e: any) {
      setError(e.message ?? "Sync failed.");
    } finally {
      setBusy(null);
    }
  }

  async function doRecap() {
    setBusy("recap");
    setError(null);
    try {
      const { share_url } = await sendRecap({ callId: row.id });
      setRecap({ url: share_url });
    } catch (e: any) {
      setError(e.message ?? "Could not generate recap.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-7">
      {/* The headline action — premium recap */}
      <div className="surface overflow-hidden">
        <div className="border-b border-ink-line bg-gradient-to-b from-gold-wash to-transparent px-5 py-4">
          <span className="eyebrow text-gold/80">Send recap</span>
          <p className="mt-1 text-sm text-bone-dim">
            A polished, customer-facing page with the quote table. This is how the deal
            moves — and how Longer spreads.
          </p>
        </div>

        {recap ? (
          <div className="space-y-3 p-5">
            <div className="flex items-center gap-2 rounded-xl border border-ink-line bg-ink px-3 py-2.5">
              <span className="truncate font-mono text-xs text-bone-dim">{recap.url}</span>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto shrink-0"
                onClick={() => navigator.clipboard?.writeText(recap.url)}
              >
                Copy
              </Button>
            </div>
            <div className="flex gap-3">
              <a href={recap.url} target="_blank" rel="noreferrer" className="flex-1">
                <Button variant="outline" className="w-full">
                  Open preview
                </Button>
              </a>
              {typeof navigator !== "undefined" && "share" in navigator && (
                <Button
                  className="flex-1"
                  onClick={() =>
                    navigator.share?.({ title: "Longer CRM recap", url: recap.url })
                  }
                >
                  Share
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-5">
            <Button
              size="lg"
              className="w-full"
              loading={busy === "recap"}
              onClick={doRecap}
            >
              Generate & send recap
            </Button>
          </div>
        )}
      </div>

      {/* Review gate + CRM */}
      <div className="surface mt-3 p-5">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Review gate</span>
          <Pill tone={approved ? "buy" : "neutral"}>
            {row.call_insights?.sync_status ?? "pending"}
          </Pill>
        </div>
        <p className="mt-2 text-sm text-bone-dim">
          Approve or redact before pushing to a CRM. Sync is disabled until then.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            loading={busy === "approved"}
            onClick={() => approve("approved")}
          >
            ✓ Approve
          </Button>
          <Button
            variant="outline"
            loading={busy === "redacted"}
            onClick={() => approve("redacted")}
          >
            Redact & approve
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button
            disabled={!approved || !!busy}
            loading={busy === "hubspot"}
            onClick={() => doSync("hubspot")}
          >
            Push · HubSpot
          </Button>
          <Button
            disabled={!approved || !!busy}
            loading={busy === "zoho"}
            onClick={() => doSync("zoho")}
          >
            Push · Zoho
          </Button>
        </div>

        {error && <p className="mt-3 text-sm text-signal-cold">{error}</p>}

        <button
          onClick={onDiscard}
          className="mt-5 w-full text-center font-mono text-2xs uppercase tracking-[0.14em] text-bone-faint transition-colors hover:text-signal-cold"
        >
          Discard call
        </button>
      </div>
    </section>
  );
}
