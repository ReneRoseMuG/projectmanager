import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "rgb(var(--color-ink-rgb) / <alpha-value>)",
        shell: "rgb(var(--color-shell-rgb) / <alpha-value>)",
        line: "rgb(var(--color-line-rgb) / <alpha-value>)",
        white: "rgb(var(--color-white-rgb) / <alpha-value>)",
        steel: {
          50: "rgb(var(--color-steel-50-rgb) / <alpha-value>)",
          100: "rgb(var(--color-steel-100-rgb) / <alpha-value>)",
          200: "rgb(var(--color-steel-200-rgb) / <alpha-value>)",
          300: "rgb(var(--color-steel-300-rgb) / <alpha-value>)",
          400: "rgb(var(--color-steel-400-rgb) / <alpha-value>)",
          500: "rgb(var(--color-steel-500-rgb) / <alpha-value>)",
          600: "rgb(var(--color-steel-600-rgb) / <alpha-value>)",
          700: "rgb(var(--color-steel-700-rgb) / <alpha-value>)",
          800: "rgb(var(--color-steel-800-rgb) / <alpha-value>)",
          900: "rgb(var(--color-steel-900-rgb) / <alpha-value>)"
        },
        crimson: "rgb(var(--color-crimson-rgb) / <alpha-value>)",
        tangerine: "rgb(var(--color-tangerine-rgb) / <alpha-value>)",
        mustard: {
          DEFAULT: "rgb(var(--color-mustard-rgb) / <alpha-value>)",
          dark: "rgb(var(--color-mustard-dark-rgb) / <alpha-value>)"
        },
        fern: "rgb(var(--color-fern-rgb) / <alpha-value>)",
        teal: "rgb(var(--color-teal-rgb) / <alpha-value>)",
        violet: "rgb(var(--color-violet-rgb) / <alpha-value>)",
        magenta: "rgb(var(--color-magenta-rgb) / <alpha-value>)"
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
