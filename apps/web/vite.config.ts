import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["../../tests/setup/web/setup.ts"],
    include: ["../../tests/unit/web/**/*.test.{ts,tsx}", "../../tests/integration/web/**/*.test.{ts,tsx}"],
    exclude: [...configDefaults.exclude, "../../tests/browser/web/**"]
  }
});
