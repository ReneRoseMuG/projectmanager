import type { PermissionCatalog, Role, RoleInput, RoleUpdate } from "@taskmanager/shared-types";
import { api } from "./client";

export function getAdminRoles(): Promise<Role[]> {
  return api.get("admin/roles").json<Role[]>();
}

export function getAdminRole(id: number): Promise<Role> {
  return api.get(`admin/roles/${id}`).json<Role>();
}

export function createAdminRole(input: RoleInput): Promise<Role> {
  return api.post("admin/roles", { json: input }).json<Role>();
}

export function updateAdminRole(id: number, input: RoleUpdate): Promise<Role> {
  return api.put(`admin/roles/${id}`, { json: input }).json<Role>();
}

export function deleteAdminRole(id: number): Promise<void> {
  return api.delete(`admin/roles/${id}`).then(() => undefined);
}

export function getPermissionCatalog(): Promise<PermissionCatalog> {
  return api.get("admin/permissions/catalog").json<PermissionCatalog>();
}
