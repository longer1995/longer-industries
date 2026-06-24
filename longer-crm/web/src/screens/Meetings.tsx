import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { relativeDate } from "../lib/format";
import type { CallRow } from "../lib/types";
import { Button, Empty, Pill } from "../components/ui";

interface CalendarConnection {
  id: string;
  provider: string;
  status: string;
  account_email?: string | null;
}

export function Meetings() {
  const [connections, setConnections] = useState<CalendarConnection[] | null>(null);
  const [upcoming, setUpcoming] = useState<CallRow[]>([]);

  useEffect(() => {
    supabase
      .from("calendar_connections")
      .select("*")
      .then(({ data }) => setConnections(data ?? []));
    supabase
      .from("calls")
      .select("*, contacts(name, company, privacy_mode)")
      .eq("capture", "bot")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setUpcoming((data as CallRow[]) ?? []));
  }, []);

  const connected = (connections ?? []).some((c) => c.status === "connected");

  return (
    <div className="px-5 pt-7 md:px-10">
      <span className="eyebrow">Meetings</span>
      <h1 className="mt-1.5 font-display text-3xl tracking-tight text-bone">
        Auto-record every booked meeting.
      </h1>
      <p className="mt-2 max-w-md text-sm text-bone-dim">
        Connect your calendar — when a meeting is booked, a bot joins and records it.
        Every one flows into the same book as your field calls.
      </p>

      {/* Calendar connection */}
      <div className="surface mt-7 p-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium text-bone">Calendly</span>
            <p className="mt-0.5 text-sm text-bone-faint">
              Google & Outlook coming next.
            </p>
          </div>
          {connected ? (
            <Pill tone="buy">Connected</Pill>
          ) : (
            <Button
              size="sm"
              onClick={() =>
                window.open("https://calendly.com/integrations", "_blank")
              }
            >
              Connect
            </Button>
          )}
        </div>
      </div>

      {/* Bot-captured meetings */}
      <div className="mt-8">
        <span className="eyebrow">Recorded meetings</span>
        <div className="mt-3 space-y-2.5">
          {upcoming.length === 0 ? (
            <Empty
              title="No meetings recorded yet"
              body="Connect Calendly, or send a bot to a live meeting from the Capture tab."
              action={
                <Link to="/capture">
                  <Button>Record a meeting</Button>
                </Link>
              }
            />
          ) : (
            upcoming.map((m) => (
              <Link
                key={m.id}
                to={`/call/${m.id}`}
                className="surface flex items-center justify-between p-4 transition-colors hover:border-gold/25 hover:bg-ink-high"
              >
                <div>
                  <div className="font-medium text-bone">
                    {m.contacts?.name ?? "Meeting"}
                  </div>
                  <div className="mt-0.5 font-mono text-2xs uppercase tracking-[0.12em] text-bone-faint">
                    {m.platform ?? "video"} · {relativeDate(m.created_at)}
                  </div>
                </div>
                <Pill tone={m.status === "ready" ? "buy" : "neutral"}>
                  {m.status}
                </Pill>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
