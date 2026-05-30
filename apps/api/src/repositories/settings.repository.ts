import { and, eq, inArray } from "drizzle-orm";
import type { SettingScopeType } from "@taskmanager/shared-types";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import { settingsValues } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type SettingsValueRecord = typeof settingsValues.$inferSelect;

export interface SettingScopeCandidate {
  scopeType: SettingScopeType;
  scopeId: string;
}

export interface SettingValueData {
  settingKey: string;
  scopeType: SettingScopeType;
  scopeId: string;
  valueJson: string;
  updatedBy: number;
  expectedVersion: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

function scopeKey(scopeType: SettingScopeType, scopeId: string): string {
  return `${scopeType}:${scopeId}`;
}

export const settingsRepository = {
  async findCandidates(database: DbSession, settingKeys: string[], scopes: SettingScopeCandidate[]): Promise<SettingsValueRecord[]> {
    if (settingKeys.length === 0 || scopes.length === 0) {
      return [];
    }
    const allowedScopes = new Set(scopes.map((scope) => scopeKey(scope.scopeType, scope.scopeId)));
    return (await database
      .select()
      .from(settingsValues)
      .where(inArray(settingsValues.settingKey, settingKeys)))
      .filter((record) => allowedScopes.has(scopeKey(record.scopeType, record.scopeId)));
  },

  async findByScope(database: DbSession, settingKey: string, scopeType: SettingScopeType, scopeId: string): Promise<SettingsValueRecord | undefined> {
    return firstRow(await database
      .select()
      .from(settingsValues)
      .where(and(eq(settingsValues.settingKey, settingKey), eq(settingsValues.scopeType, scopeType), eq(settingsValues.scopeId, scopeId))));
  },

  async upsertWithVersion(database: DbSession, data: SettingValueData): Promise<SettingsValueRecord> {
    const current = await this.findByScope(database, data.settingKey, data.scopeType, data.scopeId);
    const now = nowIso();
    if (!current) {
      assertVersion(0, data.expectedVersion);
      const result = await database
        .insert(settingsValues)
        .values({
          settingKey: data.settingKey,
          scopeType: data.scopeType,
          scopeId: data.scopeId,
          valueJson: data.valueJson,
          version: 1,
          createdBy: data.updatedBy,
          updatedBy: data.updatedBy,
          createdAt: now,
          updatedAt: now
        });
      const created = await firstRow(await database.select().from(settingsValues).where(eq(settingsValues.id, insertId(result))));
      if (!created) {
        throw new Error("Created setting could not be loaded");
      }
      return created;
    }

    assertVersion(current.version, data.expectedVersion);
    await database
      .update(settingsValues)
      .set({
        valueJson: data.valueJson,
        version: current.version + 1,
        updatedBy: data.updatedBy,
        updatedAt: now
      })
      .where(eq(settingsValues.id, current.id));
    const updated = await firstRow(await database.select().from(settingsValues).where(eq(settingsValues.id, current.id)));
    if (!updated) {
      throw new Error("Updated setting could not be loaded");
    }
    return updated;
  },

  async deleteWithVersion(database: DbSession, settingKey: string, scopeType: SettingScopeType, scopeId: string, expectedVersion: number): Promise<number> {
    const current = await this.findByScope(database, settingKey, scopeType, scopeId);
    if (!current) {
      assertVersion(0, expectedVersion);
      return 0;
    }
    assertVersion(current.version, expectedVersion);
    return mutationAffectedRows(await database.delete(settingsValues).where(eq(settingsValues.id, current.id)));
  }
};
