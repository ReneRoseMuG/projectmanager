import { request as playwrightRequest } from "@playwright/test";

/**
 * Per-worker authentication state.
 *
 * Each Playwright worker logs in against its own API server and writes its own
 * storageState file, so workers never share a session. The one-click admin login
 * (`/api/auth/login-as-rene` → loginConfiguredAdmin) is used; it resolves the seeded
 * admin (ADMIN_EMAIL = admin@local) that createWorkerDb seeds into each worker database.
 */
export async function createWorkerAuthState(apiBaseUrl: string, authFile: string): Promise<void> {
  const ctx = await playwrightRequest.newContext();
  try {
    const res = await ctx.post(`${apiBaseUrl}/auth/login-as-rene`);
    if (!res.ok()) {
      throw new Error(
        `Worker login failed against ${apiBaseUrl}: ${res.status()} ${await res.text()}`
      );
    }
    await ctx.storageState({ path: authFile });
  } finally {
    await ctx.dispose();
  }
}
