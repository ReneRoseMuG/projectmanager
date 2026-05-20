import { asc, eq, sql } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
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
  findAll(database: DbClient): UserRecord[] {
    return database.select().from(users).orderBy(asc(users.lastName), asc(users.firstName), asc(users.email)).all();
  },

  findById(database: DbClient, id: number): UserRecord | undefined {
    return database.select().from(users).where(eq(users.id, id)).get();
  },

  findByEmail(database: DbClient, email: string): UserRecord | undefined {
    return database.select().from(users).where(eq(users.email, email)).get();
  },

  create(database: DbClient, data: UserCreateData): UserRecord {
    const now = nowIso();
    database
      .run(sql`insert into users (name, first_name, last_name, address, phone, email, password_hash, role_id, is_active, version, created_at, updated_at)
        values ('', ${data.firstName}, ${data.lastName}, ${data.address ?? null}, ${data.phone ?? null}, ${data.email}, ${data.passwordHash ?? null}, ${data.roleId}, ${data.isActive ? 1 : 0}, 1, ${now}, ${now})`);
    const created = this.findByEmail(database, data.email);
    if (!created) {
      throw new Error("User insert failed");
    }
    return created;
  },

  update(database: DbClient, id: number, expectedVersion: number, data: UserUpdateData): UserRecord | undefined {
    const current = this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    return database
      .update(users)
      .set({
        ...data,
        version: current.version + 1,
        updatedAt: nowIso()
      })
      .where(eq(users.id, id))
      .returning()
      .get();
  },

  delete(database: DbClient, id: number): number {
    return database.delete(users).where(eq(users.id, id)).run().changes;
  }
};
