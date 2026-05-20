import ky from "ky";

export const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

export const api = ky.create({
  prefixUrl: apiBaseUrl,
  credentials: "include",
  timeout: 20000
});

export function assetUrl(path: string): string {
  const origin = apiBaseUrl.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}
