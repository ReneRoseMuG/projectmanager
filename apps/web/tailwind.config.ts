import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "#172026",
        shell: "#f6f7f2",
        line: "#d9ded6",
        teal: "#0f766e",
        coral: "#e76f51",
        amber: "#d99a21",
        moss: "#6a994e"
      },
      boxShadow: {
        panel: "0 10px 28px rgba(23, 32, 38, 0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;
