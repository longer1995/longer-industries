import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Maker, Wordmark } from "../components/Brand";
import { Button } from "../components/ui";

type Mode = "magic" | "password";

export function Auth() {
  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm animate-fade-up">
        {/* Brand lockup */}
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="mb-6 grid size-16 place-items-center rounded-2xl border border-ink-line bg-ink-raised shadow-glow">
            <span className="font-display text-3xl text-gold">L</span>
          </div>
          <h1 className="font-display text-4xl tracking-tight text-bone">
            Longer<span className="text-gold"> CRM</span>
          </h1>
          <Maker className="mt-2" />
          <p className="mt-6 max-w-[16rem] text-sm leading-relaxed text-bone-dim">
            Every conversation — in person, phone, and every video platform — in one
            book of business.
          </p>
        </div>

        {sent ? (
          <div className="surface p-6 text-center">
            <h2 className="font-display text-xl text-bone">Check your inbox</h2>
            <p className="mt-2 text-sm text-bone-dim">
              We sent a sign-in link to <span className="text-bone">{email}</span>.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-5 font-mono text-2xs uppercase tracking-[0.14em] text-gold hover:text-gold-soft"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="surface space-y-4 p-6">
            <Field
              label="Work email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@firm.com"
              autoFocus
            />
            {mode === "password" && (
              <Field
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
              />
            )}

            {error && (
              <p className="rounded-lg border border-signal-cold/30 bg-signal-cold/5 px-3 py-2 text-sm text-signal-cold">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" loading={busy}>
              {mode === "magic" ? "Send sign-in link" : "Sign in"}
            </Button>

            <button
              type="button"
              onClick={() => setMode(mode === "magic" ? "password" : "magic")}
              className="block w-full text-center font-mono text-2xs uppercase tracking-[0.14em] text-bone-faint transition-colors hover:text-bone-dim"
            >
              {mode === "magic" ? "Sign in with password" : "Email me a link instead"}
            </button>
          </form>
        )}

        <div className="mt-10 flex justify-center">
          <Wordmark size="sm" />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-2 block">{label}</span>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-xl border border-ink-line bg-ink px-4 text-bone placeholder:text-bone-faint outline-none transition-colors focus:border-gold/50 focus:bg-ink-high"
      />
    </label>
  );
}
