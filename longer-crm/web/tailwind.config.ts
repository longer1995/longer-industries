import type { Config } from "tailwindcss";

/**
 * Longer CRM design system — "financial terminal married to quiet luxury."
 * Warm near-black base, muted gold accent, editorial serif headings,
 * tabular-mono numerics. Restrained, expensive, data-forward.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm charcoal scale (slight brown cast — not cold black).
        ink: {
          DEFAULT: "#0B0A09", // app background
          raised: "#121110", // cards / sidebar
          high: "#17150F", // elevated surfaces, hovers
          line: "#262320", // hairline borders
          muted: "#2E2A25",
        },
        bone: {
          DEFAULT: "#EDEAE3", // primary text (warm off-white)
          dim: "#A39C90", // secondary text
          faint: "#6E675C", // tertiary / captions
        },
        // Muted gold — the single confident accent (quiet luxury).
        gold: {
          DEFAULT: "#C2A24E",
          soft: "#D8BE78",
          deep: "#8C7333",
          wash: "rgba(194,162,78,0.10)",
        },
        // Desaturated signal palette, tuned to the warm base (terminal cues).
        signal: {
          buy: "#7FB996", // ready to buy — calm green
          warm: "#C2A24E", // interested — gold
          follow: "#C9923F", // needs follow-up — amber
          cold: "#B06B63", // not interested — muted clay red
          unknown: "#6E675C",
        },
      },
      fontFamily: {
        // Editorial serif for headings / numbers-as-statement.
        display: ['"Newsreader"', "Georgia", "serif"],
        // Workhorse UI sans.
        sans: ['"Inter"', "system-ui", "sans-serif"],
        // Tabular monospace for figures, badges, timers — the trading desk.
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.04em" }],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        raise: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 30px -12px rgba(0,0,0,0.7)",
        glow: "0 0 0 1px rgba(194,162,78,0.25), 0 8px 24px -8px rgba(194,162,78,0.18)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-rec": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both",
        "pulse-rec": "pulse-rec 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
