import type { UserOption } from "@taskmanager/shared-types";
import { api } from "./client";

export function getUsers(): Promise<UserOption[]> {
  return api.get("users").json<UserOption[]>();
}
