import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "var(--color-ink)",
        shell: "var(--color-shell)",
        line: "var(--color-line)",
        white: "var(--color-white)",
        steel: {
          50: "var(--color-steel-50)",
          100: "var(--color-steel-100)",
          200: "var(--color-steel-200)",
          300: "var(--color-steel-300)",
          400: "var(--color-steel-400)",
          500: "var(--color-steel-500)",
          600: "var(--color-steel-600)",
          700: "var(--color-steel-700)",
          800: "var(--color-steel-800)",
          900: "var(--color-steel-900)"
        },
        crimson: "var(--color-crimson)",
        tangerine: "var(--color-tangerine)",
        mustard: {
          DEFAULT: "var(--color-mustard)",
          dark: "var(--color-mustard-dark)"
        },
        fern: "var(--color-fern)",
        teal: "var(--color-teal)",
        violet: "var(--color-violet)",
        magenta: "var(--color-magenta)"
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
        steel: "var(--shadow-steel)",
        sm: "var(--shadow-sm)",
        modal: "var(--shadow-modal)",
        card: "var(--shadow-card)",
        "steel-icon": "var(--shadow-steel-icon)"
      }
    }
  },
  plugins: []
} satisfies Config;
