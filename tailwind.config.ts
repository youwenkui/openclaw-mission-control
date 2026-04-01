import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0f17",
        foreground: "#edf2f7",
        card: "#111826",
        border: "#1f2937",
        muted: "#7b869a",
        panel: "#0f1624",
        accent: "#5eead4",
        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
        info: "#38bdf8",
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(148, 163, 184, 0.08), 0 12px 28px rgba(2, 6, 23, 0.32)",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "SF Pro Display", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
