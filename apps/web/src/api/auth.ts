import type { CurrentUser, LoginRequest, SetPasswordRequest } from "@taskmanager/shared-types";
import { api } from "./client";

export function login(input: LoginRequest): Promise<CurrentUser> {
  return api.post("auth/login", { json: input }).json<CurrentUser>();
}

export function logout(): Promise<void> {
  return api.post("auth/logout").then(() => undefined);
}

export function getCurrentUser(): Promise<CurrentUser> {
  return api.get("auth/me", { retry: 0, timeout: 3000 }).json<CurrentUser>();
}

export function setInitialPassword(input: SetPasswordRequest): Promise<CurrentUser> {
  return api.post("auth/set-password", { json: input }).json<CurrentUser>();
}
