import { api } from "./client";

export interface HealthStatus {
  status: "ok";
  uptime: number;
}

export async function getHealth(): Promise<HealthStatus> {
  return api.get("health", { timeout: 3000 }).json<HealthStatus>();
}
