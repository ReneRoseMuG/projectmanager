import { asc, eq, inArray } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { permissions, roles } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type RoleRecord = typeof roles.$inferSelect;
export type PermissionRecord = typeof permissions.$inferSelect;
export type RoleCreateData = Pick<typeof roles.$inferInsert, "key" | "label" | "isSystem">;
export type RoleUpdateData = Partial<Pick<RoleCreateData, "key" | "label">>;
export type PermissionCreateData = Pick<typeof permissions.$inferInsert, "resource" | "action">;

function nowIso(): string {
  return new Date().toISOString();
}

export const roleRepository = {
  findAll(database: DbClient): RoleRecord[] {
    return database.select().from(roles).orderBy(asc(roles.label)).all();
  },

  findById(database: DbClient, id: number): RoleRecord | undefined {
    return database.select().from(roles).where(eq(roles.id, id)).get();
  },

  findByKey(database: DbClient, key: string): RoleRecord | undefined {
    return database.select().from(roles).where(eq(roles.key, key)).get();
  },

  findPermissionsByRoleId(database: DbClient, roleId: number): PermissionRecord[] {
    return database.select().from(permissions).where(eq(permissions.roleId, roleId)).orderBy(asc(permissions.resource), asc(permissions.action)).all();
  },

  findPermissionsByRoleIds(database: DbClient, roleIds: number[]): PermissionRecord[] {
    if (roleIds.length === 0) {
      return [];
    }
    return database.select().from(permissions).where(inArray(permissions.roleId, roleIds)).orderBy(asc(permissions.resource), asc(permissions.action)).all();
  },

  create(database: DbClient, data: RoleCreateData): RoleRecord {
    const now = nowIso();
    return database
      .insert(roles)
      .values({
        ...data,
        version: 1,
        createdAt: now,
        updatedAt: now
      })
      .returning()
      .get();
  },

  update(database: DbClient, id: number, expectedVersion: number, data: RoleUpdateData): RoleRecord | undefined {
    const current = this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    return database
      .update(roles)
      .set({
        ...data,
        version: current.version + 1,
        updatedAt: nowIso()
      })
      .where(eq(roles.id, id))
      .returning()
      .get();
  },

  replacePermissions(database: DbClient, roleId: number, permissionValues: PermissionCreateData[]): PermissionRecord[] {
    database.delete(permissions).where(eq(permissions.roleId, roleId)).run();
    if (permissionValues.length > 0) {
      database
        .insert(permissions)
        .values(permissionValues.map((permission) => ({ ...permission, roleId })))
        .run();
    }
    return this.findPermissionsByRoleId(database, roleId);
  },

  delete(database: DbClient, id: number): number {
    return database.delete(roles).where(eq(roles.id, id)).run().changes;
  }
};
