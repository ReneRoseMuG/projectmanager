import type { AdminUser, AdminUserInput, AdminUserUpdate } from "@taskmanager/shared-types";
import { api } from "./client";

export function getAdminUsers(): Promise<AdminUser[]> {
  return api.get("admin/users").json<AdminUser[]>();
}

export function getAdminUser(id: number): Promise<AdminUser> {
  return api.get(`admin/users/${id}`).json<AdminUser>();
}

export function createAdminUser(input: AdminUserInput): Promise<AdminUser> {
  return api.post("admin/users", { json: input }).json<AdminUser>();
}

export function updateAdminUser(id: number, input: AdminUserUpdate): Promise<AdminUser> {
  return api.put(`admin/users/${id}`, { json: input }).json<AdminUser>();
}

export function deleteAdminUser(id: number): Promise<void> {
  return api.delete(`admin/users/${id}`).then(() => undefined);
}
