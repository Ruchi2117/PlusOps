import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        surface: "hsl(var(--surface))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      borderRadius: {
        ops: "var(--ops-radius-sm)",
        "ops-md": "var(--ops-radius-md)",
        "ops-lg": "var(--ops-radius-lg)"
      },
      boxShadow: {
        panel: "var(--ops-shadow-panel)",
        scene: "var(--ops-shadow-scene)",
        glow: "var(--ops-shadow-glow)"
      },
      transitionTimingFunction: {
        ops: "var(--ops-ease-standard)",
        "ops-emphasis": "var(--ops-ease-emphasis)"
      }
    }
  },
  plugins: []
} satisfies Config;

export default config;
