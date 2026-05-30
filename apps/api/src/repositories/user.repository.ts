import { asc, eq, sql } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, mutationAffectedRows } from "../db/query-utils.js";
import { users } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type UserRecord = typeof users.$inferSelect;
export type UserCreateData = Pick<
  typeof users.$inferInsert,
  "firstName" | "lastName" | "address" | "phone" | "email" | "passwordHash" | "roleId" | "isActive"
>;
export type UserUpdateData = Partial<UserCreateData>;

function nowIso(): string {
  return new Date().toISOString();
}

export const userRepository = {
  async findAll(database: DbSession): Promise<UserRecord[]> {
    return database.select().from(users).orderBy(asc(users.lastName), asc(users.firstName), asc(users.email));
  },

  async findActive(database: DbSession): Promise<UserRecord[]> {
    return database.select().from(users).where(eq(users.isActive, true)).orderBy(asc(users.lastName), asc(users.firstName), asc(users.email));
  },

  async findById(database: DbSession, id: number): Promise<UserRecord | undefined> {
    return firstRow(await database.select().from(users).where(eq(users.id, id)));
  },

  async findByEmail(database: DbSession, email: string): Promise<UserRecord | undefined> {
    return firstRow(await database.select().from(users).where(eq(users.email, email)));
  },

  async create(database: DbSession, data: UserCreateData): Promise<UserRecord> {
    const now = nowIso();
    const fullName = data.lastName && data.firstName ? `${data.lastName}, ${data.firstName}` : (data.lastName || data.firstName || "");
    await database.execute(sql`insert into users (name, first_name, last_name, full_name, address, phone, email, password_hash, role_id, is_active, version, created_at, updated_at)
        values ('', ${data.firstName}, ${data.lastName}, ${fullName}, ${data.address ?? null}, ${data.phone ?? null}, ${data.email}, ${data.passwordHash ?? null}, ${data.roleId}, ${data.isActive ? 1 : 0}, 1, ${now}, ${now})`);
    const created = await this.findByEmail(database, data.email);
    if (!created) {
      throw new Error("User insert failed");
    }
    return created;
  },

  async update(database: DbSession, id: number, expectedVersion: number, data: UserUpdateData): Promise<UserRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    await database
      .update(users)
      .set({
        ...data,
        version: current.version + 1,
        updatedAt: nowIso()
      })
      .where(eq(users.id, id));
    return this.findById(database, id);
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(users).where(eq(users.id, id)));
  }
};

