import ky from "ky";

export const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

const clientTabIdKey = "taskmanager.clientTabId";
const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function createClientTabId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getClientTabId(): string {
  if (typeof sessionStorage === "undefined") {
    return createClientTabId();
  }
  const existing = sessionStorage.getItem(clientTabIdKey);
  if (existing) {
    return existing;
  }
  const next = createClientTabId();
  sessionStorage.setItem(clientTabIdKey, next);
  return next;
}

export const api = ky.create({
  prefixUrl: apiBaseUrl,
  credentials: "include",
  timeout: 20000,
  hooks: {
    beforeRequest: [
      (request) => {
        if (mutatingMethods.has(request.method.toUpperCase())) {
          request.headers.set("X-Client-Tab-Id", getClientTabId());
        }
      }
    ]
  }
});

export function assetUrl(path: string): string {
  const origin = apiBaseUrl.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}
