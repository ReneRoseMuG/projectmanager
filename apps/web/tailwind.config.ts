import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "#0F2542",
        shell: "#F4F7FA",
        line: "#D5DEE9",
        white: "#FFFFFF",
        steel: {
          50: "#F4F7FA",
          100: "#E8EFF5",
          200: "#D5E1EE",
          300: "#BACDE3",
          400: "#94B2D1",
          500: "#6B92BD",
          600: "#4682B4",
          700: "#2E5984",
          800: "#1B355C",
          900: "#0F2542"
        },
        crimson: "#D9416A",
        tangerine: "#ED8C3A",
        mustard: "#E2BA2C",
        fern: "#4D9359",
        teal: "#2F8E96",
        violet: "#6A40BE",
        magenta: "#C13D9A"
      },
      boxShadow: {
        panel: "0 10px 28px rgba(15, 37, 66, 0.08)",
        steel: "0 12px 32px rgba(46, 89, 132, 0.16)",
        sm: "0 1px 2px rgba(15, 37, 66, 0.06)"
      }
    }
  },
  plugins: []
} satisfies Config;
