import type { JsonObject, JsonValue } from "@taskmanager/shared-types";
import { badRequest } from "../utils/errors.js";

export function nowIso(): string {
  return new Date().toISOString();
}

export function cleanNullable(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function requireNonEmpty(value: string | undefined, field: string): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    throw badRequest(`${field} is required`);
  }
  return trimmed;
}

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) {
    return true;
  }

  const valueType = typeof value;
  if (valueType === "string" || valueType === "number" || valueType === "boolean") {
    return Number.isFinite(value as number) || valueType !== "number";
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (valueType === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }

  return false;
}

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.values(value).every(isJsonValue);
}

export function parseJsonObject(value: string): JsonObject {
  const parsed: unknown = JSON.parse(value);
  if (!isJsonObject(parsed)) {
    throw badRequest("contentJson must be a JSON object");
  }
  return parsed;
}

export function stringifyJsonObject(value: JsonObject | undefined): string {
  return JSON.stringify(value ?? {});
}
