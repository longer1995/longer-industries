// The wordmark + maker attribution, per BRAND.md. "Longer CRM" stands on its
// own; "by Atlas Agentics" is a quieter, smaller maker credit — never co-brand.
export function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const scale = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  } as const;
  return (
    <div className="flex flex-col leading-none">
      <span className={`font-display tracking-tight text-bone ${scale[size]}`}>
        Longer<span className="text-gold"> CRM</span>
      </span>
      <Maker />
    </div>
  );
}

export function Maker({ className = "" }: { className?: string }) {
  return (
    <span
      className={`mt-1 font-mono text-2xs lowercase tracking-[0.16em] text-bone-faint ${className}`}
    >
      by atlas agentics
    </span>
  );
}
