import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Maker, Wordmark } from "./Brand";

const NAV = [
  { to: "/", label: "Book", icon: BookIcon, end: true },
  { to: "/capture", label: "Capture", icon: MicIcon },
  { to: "/meetings", label: "Meetings", icon: CalIcon },
];

export function Layout({ children }: { children: ReactNode }) {
  const loc = useLocation();
  // Hide chrome on full-screen detail/capture flows for focus.
  const bare = loc.pathname.startsWith("/call/");

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-line px-5 py-7 md:flex">
        <div className="px-1">
          <Wordmark size="md" />
        </div>
        <nav className="mt-10 flex flex-col gap-1">
          {NAV.map((item) => (
            <SideLink key={item.to} {...item} />
          ))}
        </nav>
        <div className="mt-auto px-1">
          <Maker />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-full w-full flex-1 flex-col">
        <main className={`flex-1 ${bare ? "" : "pb-24 md:pb-10"}`}>{children}</main>

        {/* Mobile bottom tab bar */}
        {!bare && (
          <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-line bg-ink/85 backdrop-blur-xl md:hidden">
            <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
              {NAV.map((item) => (
                <TabLink key={item.to} {...item} />
              ))}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}

function SideLink({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: (p: { active: boolean }) => ReactNode;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
          isActive
            ? "bg-ink-high text-bone"
            : "text-bone-dim hover:bg-ink-high/60 hover:text-bone"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={isActive ? "text-gold" : "text-bone-faint group-hover:text-bone-dim"}>
            <Icon active={isActive} />
          </span>
          {label}
        </>
      )}
    </NavLink>
  );
}

function TabLink({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: (p: { active: boolean }) => ReactNode;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
    >
      {({ isActive }) => (
        <>
          <span className={isActive ? "text-gold" : "text-bone-faint"}>
            <Icon active={isActive} />
          </span>
          <span
            className={`font-mono text-2xs uppercase tracking-[0.1em] ${
              isActive ? "text-bone" : "text-bone-faint"
            }`}
          >
            {label}
          </span>
          {isActive && (
            <span className="absolute -top-px h-0.5 w-8 rounded-full bg-gold" />
          )}
        </>
      )}
    </NavLink>
  );
}

// --- Line icons (1.5px stroke, calm) ---------------------------------------
function BookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5.5A1.5 1.5 0 0 0 4 20.5V5.5Z" strokeLinejoin="round" />
      <path d="M4 18.5A1.5 1.5 0 0 1 5.5 17H20" />
    </svg>
  );
}
function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
    </svg>
  );
}
function CalIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" strokeLinecap="round" />
    </svg>
  );
}
