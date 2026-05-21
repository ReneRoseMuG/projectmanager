import { and, eq, inArray } from "drizzle-orm";
import type { SettingScopeType } from "@taskmanager/shared-types";
import type { DbSession } from "../db/client.js";
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
  findCandidates(database: DbSession, settingKeys: string[], scopes: SettingScopeCandidate[]): SettingsValueRecord[] {
    if (settingKeys.length === 0 || scopes.length === 0) {
      return [];
    }
    const allowedScopes = new Set(scopes.map((scope) => scopeKey(scope.scopeType, scope.scopeId)));
    return database
      .select()
      .from(settingsValues)
      .where(inArray(settingsValues.settingKey, settingKeys))
      .all()
      .filter((record) => allowedScopes.has(scopeKey(record.scopeType, record.scopeId)));
  },

  findByScope(database: DbSession, settingKey: string, scopeType: SettingScopeType, scopeId: string): SettingsValueRecord | undefined {
    return database
      .select()
      .from(settingsValues)
      .where(and(eq(settingsValues.settingKey, settingKey), eq(settingsValues.scopeType, scopeType), eq(settingsValues.scopeId, scopeId)))
      .get();
  },

  upsertWithVersion(database: DbSession, data: SettingValueData): SettingsValueRecord {
    const current = this.findByScope(database, data.settingKey, data.scopeType, data.scopeId);
    const now = nowIso();
    if (!current) {
      assertVersion(0, data.expectedVersion);
      return database
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
        })
        .returning()
        .get();
    }

    assertVersion(current.version, data.expectedVersion);
    return database
      .update(settingsValues)
      .set({
        valueJson: data.valueJson,
        version: current.version + 1,
        updatedBy: data.updatedBy,
        updatedAt: now
      })
      .where(eq(settingsValues.id, current.id))
      .returning()
      .get();
  },

  deleteWithVersion(database: DbSession, settingKey: string, scopeType: SettingScopeType, scopeId: string, expectedVersion: number): number {
    const current = this.findByScope(database, settingKey, scopeType, scopeId);
    if (!current) {
      assertVersion(0, expectedVersion);
      return 0;
    }
    assertVersion(current.version, expectedVersion);
    return database.delete(settingsValues).where(eq(settingsValues.id, current.id)).run().changes;
  }
};
