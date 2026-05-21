import {
  getSettingDefinition,
  settingsRegistry,
  type CurrentUser,
  type DeleteSettingValueRequest,
  type JsonValue,
  type ResolvedSetting,
  type SettingDefinition,
  type SettingKey,
  type SettingScopeType,
  type SettingScopeValue,
  type SettingsResolvedResponse,
  type SetSettingValueRequest
} from "@taskmanager/shared-types";
import type { DbClient } from "../db/client.js";
import type { SettingsValueRecord } from "../repositories/settings.repository.js";
import { settingsRepository, type SettingScopeCandidate } from "../repositories/settings.repository.js";
import { badRequest, forbidden } from "../utils/errors.js";
import { getRoleByKey, hasPermission } from "./roles.service.js";

const globalScopeId = "global";

function assertExpectedVersion(value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw badRequest("expectedVersion must be an integer greater than or equal to 0");
  }
}

function parseStoredValue(definition: SettingDefinition, record: SettingsValueRecord): JsonValue | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(record.valueJson) as unknown;
  } catch {
    return undefined;
  }
  return definition.validate(parsed) ? parsed : undefined;
}

function recordKey(settingKey: string, scopeType: SettingScopeType, scopeId: string): string {
  return `${settingKey}:${scopeType}:${scopeId}`;
}

function scopeCandidatesForUser(currentUser: CurrentUser): SettingScopeCandidate[] {
  return [
    { scopeType: "GLOBAL", scopeId: globalScopeId },
    { scopeType: "ROLE", scopeId: currentUser.role.key },
    { scopeType: "USER", scopeId: String(currentUser.id) }
  ];
}

function canAdminSettings(currentUser: CurrentUser): boolean {
  return hasPermission(currentUser.role, "settings", "admin");
}

function assertScopeAllowed(definition: SettingDefinition, scopeType: SettingScopeType): void {
  if (!definition.allowedScopes.includes(scopeType)) {
    throw badRequest(`Setting "${definition.key}" does not allow scope ${scopeType}`);
  }
}

function resolveScopeId(database: DbClient, currentUser: CurrentUser, scopeType: SettingScopeType, inputScopeId: string | undefined): string {
  if (scopeType === "GLOBAL") {
    if (inputScopeId !== undefined && inputScopeId !== globalScopeId) {
      throw badRequest("GLOBAL settings must use scopeId global");
    }
    return globalScopeId;
  }

  if (scopeType === "USER") {
    const ownScopeId = String(currentUser.id);
    if (inputScopeId !== undefined && inputScopeId !== ownScopeId) {
      throw forbidden("Users can only change their own settings");
    }
    return ownScopeId;
  }

  const roleKey = inputScopeId?.trim();
  if (!roleKey) {
    throw badRequest("ROLE settings require scopeId");
  }
  if (!getRoleByKey(database, roleKey)) {
    throw badRequest(`Role "${roleKey}" does not exist`);
  }
  return roleKey;
}

function assertCanWriteScope(currentUser: CurrentUser, scopeType: SettingScopeType): void {
  if (scopeType === "USER") {
    return;
  }
  if (!canAdminSettings(currentUser)) {
    throw forbidden("Only settings administrators can change GLOBAL or ROLE settings");
  }
}

function settingRecordMap(records: SettingsValueRecord[]): Map<string, SettingsValueRecord> {
  const result = new Map<string, SettingsValueRecord>();
  for (const record of records) {
    result.set(recordKey(record.settingKey, record.scopeType, record.scopeId), record);
  }
  return result;
}

function scopeValue(definition: SettingDefinition, record: SettingsValueRecord | undefined): SettingScopeValue | undefined {
  if (!record) {
    return undefined;
  }
  const value = parseStoredValue(definition, record);
  if (value === undefined) {
    return undefined;
  }
  return {
    value,
    version: record.version,
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy
  };
}

function resolveSetting(definitionKey: SettingKey, records: Map<string, SettingsValueRecord>, currentUser: CurrentUser): ResolvedSetting {
  const definition: SettingDefinition = settingsRegistry[definitionKey];
  const values: Partial<Record<SettingScopeType, SettingScopeValue>> = {};
  const scopeCandidates = scopeCandidatesForUser(currentUser);

  for (const candidate of scopeCandidates) {
    if (!definition.allowedScopes.includes(candidate.scopeType)) {
      continue;
    }
    const value = scopeValue(definition, records.get(recordKey(definition.key, candidate.scopeType, candidate.scopeId)));
    if (value !== undefined) {
      values[candidate.scopeType] = value;
    }
  }

  const userValue = values.USER;
  const roleValue = values.ROLE;
  const globalValue = values.GLOBAL;
  const resolvedScope: SettingScopeType | "DEFAULT" = userValue ? "USER" : roleValue ? "ROLE" : globalValue ? "GLOBAL" : "DEFAULT";
  const resolved = userValue ?? roleValue ?? globalValue;

  return {
    key: definitionKey,
    label: definition.label,
    description: definition.description,
    valueType: definition.valueType,
    constraints: definition.constraints ?? null,
    allowedScopes: definition.allowedScopes,
    defaultValue: definition.defaultValue,
    values,
    resolvedValue: resolved?.value ?? definition.defaultValue,
    resolvedScope,
    resolvedVersion: resolved?.version ?? null
  };
}

function getDefinitionOrThrow(key: string): SettingDefinition {
  const definition = getSettingDefinition(key);
  if (!definition) {
    throw badRequest(`Setting "${key}" is not registered`);
  }
  return definition;
}

function settingKeys(): SettingKey[] {
  return Object.keys(settingsRegistry) as SettingKey[];
}

export function getResolvedSettingsForUser(database: DbClient, currentUser: CurrentUser): SettingsResolvedResponse {
  const keys = settingKeys();
  const records = settingsRepository.findCandidates(database, keys, scopeCandidatesForUser(currentUser));
  const byScope = settingRecordMap(records);
  return {
    settings: keys.map((key) => resolveSetting(key, byScope, currentUser))
  };
}

export function setSettingValue(database: DbClient, currentUser: CurrentUser, input: SetSettingValueRequest): SettingsResolvedResponse {
  assertExpectedVersion(input.expectedVersion);
  const definition = getDefinitionOrThrow(input.key);
  assertScopeAllowed(definition, input.scopeType);
  assertCanWriteScope(currentUser, input.scopeType);
  const scopeId = resolveScopeId(database, currentUser, input.scopeType, input.scopeId);

  if (!definition.validate(input.value)) {
    throw badRequest(`Value for setting "${definition.key}" is invalid`);
  }

  settingsRepository.upsertWithVersion(database, {
    settingKey: definition.key,
    scopeType: input.scopeType,
    scopeId,
    valueJson: JSON.stringify(input.value),
    updatedBy: currentUser.id,
    expectedVersion: input.expectedVersion
  });

  return getResolvedSettingsForUser(database, currentUser);
}

export function deleteSettingValue(database: DbClient, currentUser: CurrentUser, input: DeleteSettingValueRequest): SettingsResolvedResponse {
  assertExpectedVersion(input.expectedVersion);
  const definition = getDefinitionOrThrow(input.key);
  assertScopeAllowed(definition, input.scopeType);
  assertCanWriteScope(currentUser, input.scopeType);
  const scopeId = resolveScopeId(database, currentUser, input.scopeType, input.scopeId);

  settingsRepository.deleteWithVersion(database, definition.key, input.scopeType, scopeId, input.expectedVersion);

  return getResolvedSettingsForUser(database, currentUser);
}
