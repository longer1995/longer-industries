import { forwardRef } from "react";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

// ---- Button ----------------------------------------------------------------
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", loading, className, children, disabled, ...rest },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:opacity-40 disabled:pointer-events-none select-none";
    const sizes = {
      sm: "h-9 px-3.5 text-sm",
      md: "h-11 px-5 text-sm",
      lg: "h-14 px-6 text-base",
    } as const;
    const variants = {
      primary:
        "bg-gold text-ink hover:bg-gold-soft shadow-[0_8px_24px_-10px_rgba(194,162,78,0.55)]",
      outline:
        "border border-ink-line bg-ink-raised text-bone hover:border-gold/40 hover:bg-ink-high",
      ghost: "text-bone-dim hover:text-bone hover:bg-ink-high",
      danger:
        "border border-signal-cold/40 text-signal-cold hover:bg-signal-cold/10",
    } as const;
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cx(base, sizes[size], variants[variant], className)}
        {...rest}
      >
        {loading && <Spinner />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
    />
  );
}

// ---- Card ------------------------------------------------------------------
export function Card({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("surface", className)} {...rest}>
      {children}
    </div>
  );
}

// ---- Badge / Pill ----------------------------------------------------------
export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "buy" | "warm" | "follow" | "cold";
  className?: string;
}) {
  const tones = {
    neutral: "border-ink-line text-bone-dim",
    gold: "border-gold/30 text-gold bg-gold-wash",
    buy: "border-signal-buy/30 text-signal-buy",
    warm: "border-signal-warm/30 text-signal-warm",
    follow: "border-signal-follow/30 text-signal-follow",
    cold: "border-signal-cold/30 text-signal-cold",
  } as const;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-2xs uppercase tracking-[0.12em]",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

// ---- Empty state -----------------------------------------------------------
export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-20 text-center animate-fade-up">
      <div className="mb-5 size-14 rounded-2xl border border-ink-line bg-ink-raised shadow-raise grid place-items-center">
        <span className="size-2.5 rounded-full bg-gold/70 animate-pulse-rec" />
      </div>
      <h3 className="font-display text-xl text-bone">{title}</h3>
      {body && <p className="mt-2 max-w-xs text-sm text-bone-dim">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// ---- Skeleton row ----------------------------------------------------------
export function SkeletonRow() {
  return (
    <div className="surface flex items-center gap-4 p-4">
      <div className="skeleton size-11 rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-1/3" />
        <div className="skeleton h-3 w-1/2" />
      </div>
      <div className="skeleton h-6 w-16 rounded-full" />
    </div>
  );
}
