import {
  AUTH_ACTIONS,
  AUTH_RESOURCES,
  type AuthAction,
  type AuthResource,
  type Permission,
  type PermissionCatalog,
  type PermissionInput,
  type Role,
  type RoleInput,
  type RoleUpdate
} from "@taskmanager/shared-types";
import { eq, sql } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { users } from "../db/schema.js";
import {
  roleRepository,
  type PermissionCreateData,
  type PermissionRecord,
  type RoleRecord,
  type RoleUpdateData
} from "../repositories/role.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { requireNonEmpty } from "./helpers.js";

export const SYSTEM_ROLE_PERMISSIONS: Record<"admin" | "editor" | "reader", PermissionInput[]> = {
  admin: [{ resource: "*", action: "*" }],
  editor: [
    { resource: "*", action: "read" },
    { resource: "*", action: "write" }
  ],
  reader: [
    { resource: "*", action: "read" },
    { resource: "notifications", action: "write" }
  ]
};

export const SYSTEM_ROLES = [
  { key: "admin", label: "Administrator", isSystem: true, permissions: SYSTEM_ROLE_PERMISSIONS.admin },
  { key: "editor", label: "Editor", isSystem: true, permissions: SYSTEM_ROLE_PERMISSIONS.editor },
  { key: "reader", label: "Leser", isSystem: true, permissions: SYSTEM_ROLE_PERMISSIONS.reader }
] as const;

const roleKeyPattern = /^[a-z][a-z0-9_]*$/;

function mapPermission(record: PermissionRecord): Permission {
  return {
    id: record.id,
    roleId: record.roleId,
    resource: record.resource as AuthResource,
    action: record.action as AuthAction
  };
}

export function mapRole(record: RoleRecord, permissionRecords: PermissionRecord[]): Role {
  return {
    id: record.id,
    key: record.key,
    label: record.label,
    isSystem: record.isSystem,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    permissions: permissionRecords.filter((permission) => permission.roleId === record.id).map(mapPermission)
  };
}

function normalizeRoleKey(value: string | undefined): string {
  const key = requireNonEmpty(value, "key");
  if (!roleKeyPattern.test(key)) {
    throw badRequest("Role key must start with a lowercase letter and contain only lowercase letters, numbers and underscores");
  }
  return key;
}

function normalizeRoleLabel(value: string | undefined): string {
  return requireNonEmpty(value, "label");
}

function normalizePermission(input: PermissionInput): PermissionCreateData {
  const validResource = input.resource === "*" || (AUTH_RESOURCES as readonly string[]).includes(input.resource);
  const validAction = input.action === "*" || (AUTH_ACTIONS as readonly string[]).includes(input.action);
  if (!validResource) {
    throw badRequest(`Permission resource "${input.resource}" is invalid`);
  }
  if (!validAction) {
    throw badRequest(`Permission action "${input.action}" is invalid`);
  }
  return {
    resource: input.resource,
    action: input.action
  };
}

function normalizePermissions(input: PermissionInput[] | undefined): PermissionCreateData[] {
  const values = input ?? [];
  const seen = new Set<string>();
  const result: PermissionCreateData[] = [];
  for (const permission of values) {
    const normalized = normalizePermission(permission);
    const key = `${normalized.resource}:${normalized.action}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  }
  return result;
}

function roleUserCount(database: DbClient, roleId: number): number {
  const row = database.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.roleId, roleId)).get();
  return Number(row?.count ?? 0);
}

export function listRoles(database: DbClient): Role[] {
  const records = roleRepository.findAll(database);
  const permissionRecords = roleRepository.findPermissionsByRoleIds(database, records.map((role) => role.id));
  return records.map((role) => mapRole(role, permissionRecords));
}

export function getRole(database: DbClient, id: number): Role {
  const role = roleRepository.findById(database, id);
  if (!role) {
    throw notFound(`Role with id ${id} not found`);
  }
  return mapRole(role, roleRepository.findPermissionsByRoleId(database, id));
}

export function getRoleByKey(database: DbClient, key: string): Role | undefined {
  const role = roleRepository.findByKey(database, key);
  return role ? mapRole(role, roleRepository.findPermissionsByRoleId(database, role.id)) : undefined;
}

export function createRole(database: DbClient, input: RoleInput): Role {
  const key = normalizeRoleKey(input.key);
  if (roleRepository.findByKey(database, key)) {
    throw conflict(`Role "${key}" already exists`);
  }

  const label = normalizeRoleLabel(input.label);
  const permissionValues = normalizePermissions(input.permissions);
  const created = database.transaction((tx) => {
    const role = roleRepository.create(tx as unknown as DbClient, { key, label, isSystem: false });
    const createdPermissions = roleRepository.replacePermissions(tx as unknown as DbClient, role.id, permissionValues);
    return mapRole(role, createdPermissions);
  });
  return created;
}

export function updateRole(database: DbClient, id: number, input: RoleUpdate): Role {
  const current = roleRepository.findById(database, id);
  if (!current) {
    throw notFound(`Role with id ${id} not found`);
  }

  const values: RoleUpdateData = {};
  if (input.key !== undefined) {
    if (current.isSystem) {
      throw badRequest("System role keys cannot be changed");
    }
    const key = normalizeRoleKey(input.key);
    const existing = roleRepository.findByKey(database, key);
    if (existing && existing.id !== id) {
      throw conflict(`Role "${key}" already exists`);
    }
    values.key = key;
  }
  if (input.label !== undefined) {
    values.label = normalizeRoleLabel(input.label);
  }

  const permissionValues = input.permissions !== undefined ? normalizePermissions(input.permissions) : undefined;
  const updated = database.transaction((tx) => {
    const role = roleRepository.update(tx as unknown as DbClient, id, input.expectedVersion, values);
    if (!role) {
      throw notFound(`Role with id ${id} not found`);
    }
    const permissions = permissionValues
      ? roleRepository.replacePermissions(tx as unknown as DbClient, role.id, permissionValues)
      : roleRepository.findPermissionsByRoleId(tx as unknown as DbClient, role.id);
    return mapRole(role, permissions);
  });
  return updated;
}

export function deleteRole(database: DbClient, id: number): void {
  const role = roleRepository.findById(database, id);
  if (!role) {
    throw notFound(`Role with id ${id} not found`);
  }
  if (role.isSystem) {
    throw badRequest("System roles cannot be deleted");
  }
  if (roleUserCount(database, id) > 0) {
    throw conflict("Cannot delete a role that is assigned to users");
  }
  roleRepository.delete(database, id);
}

export function getPermissionCatalog(): PermissionCatalog {
  return {
    resources: AUTH_RESOURCES,
    actions: AUTH_ACTIONS
  };
}

export function hasPermission(role: Role, resource: AuthResource, action: AuthAction): boolean {
  return role.permissions.some(
    (permission) =>
      (permission.resource === "*" || permission.resource === resource) &&
      (permission.action === "*" || permission.action === action || permission.action === "admin")
  );
}

export function hasAnotherActiveAdmin(database: DbClient, userId: number): boolean {
  const adminRole = roleRepository.findByKey(database, "admin");
  if (!adminRole) {
    return false;
  }
  const row = database
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(sql`${users.roleId} = ${adminRole.id} and ${users.isActive} = 1 and ${users.id} <> ${userId}`)
    .get();
  return Number(row?.count ?? 0) > 0;
}

export function activeAdminCount(database: DbClient): number {
  const adminRole = roleRepository.findByKey(database, "admin");
  if (!adminRole) {
    return 0;
  }
  const row = database
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(sql`${users.roleId} = ${adminRole.id} and ${users.isActive} = 1`)
    .get();
  return Number(row?.count ?? 0);
}
