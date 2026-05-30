import { asc, eq, inArray } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
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
  async findAll(database: DbSession): Promise<RoleRecord[]> {
    return database.select().from(roles).orderBy(asc(roles.label));
  },

  async findById(database: DbSession, id: number): Promise<RoleRecord | undefined> {
    return firstRow(await database.select().from(roles).where(eq(roles.id, id)));
  },

  async findByKey(database: DbSession, key: string): Promise<RoleRecord | undefined> {
    return firstRow(await database.select().from(roles).where(eq(roles.key, key)));
  },

  async findPermissionsByRoleId(database: DbSession, roleId: number): Promise<PermissionRecord[]> {
    return database.select().from(permissions).where(eq(permissions.roleId, roleId)).orderBy(asc(permissions.resource), asc(permissions.action));
  },

  async findPermissionsByRoleIds(database: DbSession, roleIds: number[]): Promise<PermissionRecord[]> {
    if (roleIds.length === 0) {
      return [];
    }
    return database.select().from(permissions).where(inArray(permissions.roleId, roleIds)).orderBy(asc(permissions.resource), asc(permissions.action));
  },

  async create(database: DbSession, data: RoleCreateData): Promise<RoleRecord> {
    const now = nowIso();
    const result = await database
      .insert(roles)
      .values({
        ...data,
        version: 1,
        createdAt: now,
        updatedAt: now
      });
    const created = await this.findById(database, insertId(result));
    if (!created) {
      throw new Error("Created role could not be loaded");
    }
    return created;
  },

  async update(database: DbSession, id: number, expectedVersion: number, data: RoleUpdateData): Promise<RoleRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    await database
      .update(roles)
      .set({
        ...data,
        version: current.version + 1,
        updatedAt: nowIso()
      })
      .where(eq(roles.id, id));
    return this.findById(database, id);
  },

  async replacePermissions(database: DbSession, roleId: number, permissionValues: PermissionCreateData[]): Promise<PermissionRecord[]> {
    await database.delete(permissions).where(eq(permissions.roleId, roleId));
    if (permissionValues.length > 0) {
      await database
        .insert(permissions)
        .values(permissionValues.map((permission) => ({ ...permission, roleId })));
    }
    return this.findPermissionsByRoleId(database, roleId);
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(roles).where(eq(roles.id, id)));
  }
};

