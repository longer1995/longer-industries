import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listCalls } from "../lib/api";
import { callValue, initials, money, relativeDate } from "../lib/format";
import type { CallRow, Signal } from "../lib/types";
import { CaptureBadge, FigureBadge, RecapBadge, SignalChip } from "../components/badges";
import { Button, Empty, SkeletonRow } from "../components/ui";
import { Maker } from "../components/Brand";

type Filter = "all" | "open" | "ready_to_buy";

export function Book() {
  const [rows, setRows] = useState<CallRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let alive = true;
    listCalls()
      .then((r) => alive && setRows(r))
      .catch((e) => alive && setError(e.message ?? "Failed to load."));
    return () => {
      alive = false;
    };
  }, []);

  const totals = useMemo(() => {
    const list = rows ?? [];
    const pipeline = list.reduce((s, r) => s + callValue(r), 0);
    const firm = list
      .filter((r) => (r.line_items ?? []).some((li) => li.figure_type === "firm_quote"))
      .reduce((s, r) => s + callValue(r), 0);
    const ready = list.filter(
      (r) => r.call_insights?.signal === "ready_to_buy"
    ).length;
    return { pipeline, firm, ready, count: list.length };
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return null;
    if (filter === "all") return rows;
    if (filter === "ready_to_buy")
      return rows.filter((r) => r.call_insights?.signal === "ready_to_buy");
    return rows.filter(
      (r) =>
        r.call_insights?.sync_status === "pending" ||
        r.call_insights?.sync_status === "approved"
    );
  }, [rows, filter]);

  return (
    <div className="px-5 pt-7 md:px-10">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <span className="eyebrow">Book of business</span>
          <h1 className="mt-1.5 font-display text-3xl tracking-tight text-bone">
            Every conversation, in one book.
          </h1>
        </div>
        <Link to="/capture" className="hidden md:block">
          <Button>+ Capture</Button>
        </Link>
      </header>

      {/* Stat ribbon — the terminal read */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Pipeline" value={money(totals.pipeline)} accent />
        <Stat label="Firm quotes" value={money(totals.firm)} />
        <Stat label="Ready to buy" value={`${totals.ready}`} sub="contacts" />
      </div>

      {/* Filters */}
      <div className="mt-7 flex items-center gap-2">
        <Seg active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </Seg>
        <Seg active={filter === "open"} onClick={() => setFilter("open")}>
          Open
        </Seg>
        <Seg active={filter === "ready_to_buy"} onClick={() => setFilter("ready_to_buy")}>
          Ready to buy
        </Seg>
        <span className="ml-auto font-mono text-2xs text-bone-faint tnum">
          {filtered?.length ?? 0} / {totals.count}
        </span>
      </div>

      {/* List */}
      <div className="mt-4 space-y-2.5">
        {error && (
          <div className="surface p-4 text-sm text-signal-cold">{error}</div>
        )}

        {!rows &&
          !error &&
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

        {filtered && filtered.length === 0 && !error && (
          <Empty
            title="The book is empty"
            body="Capture your first call — in person, by phone, or send a bot to a meeting. It lands here."
            action={
              <Link to="/capture">
                <Button size="lg">Capture a call</Button>
              </Link>
            }
          />
        )}

        {filtered?.map((row, i) => (
          <CallCard key={row.id} row={row} index={i} />
        ))}
      </div>

      <div className="mt-12 flex justify-center pb-6 md:hidden">
        <Maker />
      </div>
    </div>
  );
}

function CallCard({ row, index }: { row: CallRow; index: number }) {
  const insight = row.call_insights;
  const value = callValue(row);
  const hasFirm = (row.line_items ?? []).some((li) => li.figure_type === "firm_quote");
  const name = row.contacts?.name ?? "Unknown contact";
  const company = row.contacts?.company;

  return (
    <Link
      to={`/call/${row.id}`}
      className="surface group flex items-center gap-4 p-4 transition-all duration-150 hover:border-gold/25 hover:bg-ink-high animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
    >
      {/* Monogram */}
      <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-ink-line bg-ink font-mono text-sm text-bone-dim">
        {initials(name)}
      </div>

      {/* Identity + signal */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-bone">{name}</span>
          {company && (
            <span className="truncate text-sm text-bone-faint">· {company}</span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <SignalChip signal={insight?.signal as Signal} />
          <span className="text-bone-faint">·</span>
          <CaptureBadge capture={row.capture} platform={row.platform} />
          <RecapBadge status={row.recap_status} />
        </div>
      </div>

      {/* Value + meta */}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="font-mono text-base font-medium text-bone tnum">
          {value > 0 ? money(value) : "—"}
        </span>
        <div className="flex items-center gap-2">
          {hasFirm && <FigureBadge type="firm_quote" />}
          <span className="font-mono text-2xs text-bone-faint">
            {relativeDate(row.created_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="surface px-4 py-3.5">
      <span className="eyebrow">{label}</span>
      <div
        className={`mt-1.5 font-mono text-xl font-medium tnum ${
          accent ? "text-gold" : "text-bone"
        }`}
      >
        {value}
      </div>
      {sub && <span className="text-2xs text-bone-faint">{sub}</span>}
    </div>
  );
}

function Seg({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 font-mono text-2xs uppercase tracking-[0.1em] transition-colors ${
        active
          ? "border-gold/40 bg-gold-wash text-gold"
          : "border-ink-line text-bone-dim hover:text-bone"
      }`}
    >
      {children}
    </button>
  );
}
