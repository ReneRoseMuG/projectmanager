import type { CatalogEntry, CatalogKind, StatusCatalogKind } from "@taskmanager/shared-types";
import { FEATURE_STATUSES, PRIORITIES, WORK_STATUSES } from "@taskmanager/shared-types";
import { featureStatusLabels, priorityLabels, projectStatusLabels, ticketTypeLabels } from "./domainLabels";
import type { CSSProperties } from "react";

const now = "1970-01-01T00:00:00.000Z";

const ticketTypeFallbackKeys = ["bug", "improvement", "question", "task"] as const;

const defaultCatalogColors: Record<CatalogKind, Record<string, string>> = {
  workStatus: {
    active: "var(--color-fern)",
    todo: "var(--color-fern)",
    open: "var(--color-fern)",
    in_progress: "var(--color-tangerine)",
    in_review: "var(--color-mustard)",
    on_hold: "var(--color-steel-500)",
    completed: "var(--color-steel-500)",
    archived: "var(--color-steel-500)",
    done: "var(--color-steel-500)",
    resolved: "var(--color-steel-500)",
    closed: "var(--color-steel-500)",
    rejected: "var(--color-steel-500)",
  },
  featureStatus: {
    draft: "var(--color-violet)",
    active: "var(--color-tangerine)",
    done: "var(--color-steel-500)",
    archived: "var(--color-steel-500)",
  },
  priority: {
    low: "var(--color-steel-400)",
    medium: "var(--color-mustard)",
    high: "var(--color-tangerine)",
    urgent: "var(--color-crimson)",
  },
  ticketType: {
    bug: "var(--color-crimson)",
    improvement: "var(--color-teal)",
    question: "var(--color-violet)",
    task: "var(--color-steel-500)",
  },
};

const themeColorHex: Record<string, string> = {
  "var(--color-ink)": "#0F2542",
  "var(--color-steel-50)": "#F4F7FA",
  "var(--color-steel-100)": "#E8EFF5",
  "var(--color-steel-200)": "#D5E1EE",
  "var(--color-steel-300)": "#BACDE3",
  "var(--color-steel-400)": "#94B2D1",
  "var(--color-steel-500)": "#6B92BD",
  "var(--color-steel-600)": "#4682B4",
  "var(--color-steel-700)": "#2E5984",
  "var(--color-steel-800)": "#1B355C",
  "var(--color-steel-900)": "#0F2542",
  "var(--color-crimson)": "#D9416A",
  "var(--color-tangerine)": "#ED8C3A",
  "var(--color-mustard)": "#E2BA2C",
  "var(--color-mustard-dark)": "#6E5800",
  "var(--color-fern)": "#4D9359",
  "var(--color-teal)": "#2F8E96",
  "var(--color-violet)": "#6A40BE",
  "var(--color-magenta)": "#C13D9A",
};

export function defaultCatalogColor(kind: CatalogKind, key: string): string {
  return defaultCatalogColors[kind][key] ?? "var(--color-steel-700)";
}

function fallbackEntry(kind: CatalogKind, key: string, label: string, sortOrder: number, isClosed = false): CatalogEntry {
  return {
    id: -sortOrder,
    kind,
    key,
    label,
    sortOrder,
    isClosed,
    color: defaultCatalogColor(kind, key),
    version: 1,
    createdAt: now,
    updatedAt: now
  };
}

export const fallbackCatalogEntries: CatalogEntry[] = [
  ...WORK_STATUSES.map((status, index) => fallbackEntry("workStatus", status, projectStatusLabels[status] ?? status, (index + 1) * 100, ["completed", "archived", "done", "resolved", "closed", "rejected"].includes(status))),
  ...FEATURE_STATUSES.map((status, index) => fallbackEntry("featureStatus", status, featureStatusLabels[status] ?? status, (index + 1) * 100, status === "done" || status === "archived")),
  ...PRIORITIES.map((priority, index) => fallbackEntry("priority", priority, priorityLabels[priority] ?? priority, (index + 1) * 100)),
  ...ticketTypeFallbackKeys.map((type, index) => fallbackEntry("ticketType", type, ticketTypeLabels[type] ?? type, (index + 1) * 100))
];

export function catalogEntriesByKind(entries: CatalogEntry[], kind: CatalogKind): CatalogEntry[] {
  const source = entries.length > 0 ? entries : fallbackCatalogEntries;
  return source.filter((entry) => entry.kind === kind).sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label));
}

export function actualCatalogEntriesByKind(entries: CatalogEntry[], kind: CatalogKind): CatalogEntry[] {
  return entries.filter((entry) => entry.kind === kind).sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label));
}

export function resolveCatalogEntryKey(entries: CatalogEntry[], kind: CatalogKind, value: string | null | undefined, preferredKey: string): string | undefined {
  const actualEntries = actualCatalogEntriesByKind(entries, kind);
  if (actualEntries.length === 0) {
    return undefined;
  }
  if (value && actualEntries.some((entry) => entry.key === value)) {
    return value;
  }
  return actualEntries.find((entry) => entry.key === preferredKey)?.key ?? actualEntries[0]?.key;
}

export function catalogLabel(entries: CatalogEntry[], kind: CatalogKind, key: string): string {
  return catalogEntriesByKind(entries, kind).find((entry) => entry.key === key)?.label ?? key;
}

export function catalogEntry(entries: CatalogEntry[], kind: CatalogKind, key: string): CatalogEntry | undefined {
  return catalogEntriesByKind(entries, kind).find((entry) => entry.key === key);
}

export function catalogColor(entries: CatalogEntry[], kind: CatalogKind, key: string): string {
  return catalogEntry(entries, kind, key)?.color ?? defaultCatalogColor(kind, key);
}

function normalizeHexColor(color: string): string | undefined {
  const value = themeColorHex[color] ?? color;
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return value;
  }
  return undefined;
}

function readableTextColor(color: string): string {
  const normalized = normalizeHexColor(color);
  if (!normalized) {
    return "#ffffff";
  }
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.58 ? "#0F2542" : "#ffffff";
}

export function catalogFillStyle(color: string): CSSProperties {
  return {
    backgroundColor: color,
    borderColor: color,
    color: readableTextColor(color),
  };
}

export function catalogSoftStyle(color: string): CSSProperties {
  return {
    backgroundColor: `color-mix(in srgb, ${color} 14%, white)`,
    borderColor: `color-mix(in srgb, ${color} 50%, white)`,
  };
}

export function isCatalogStatusClosed(entries: CatalogEntry[], kind: StatusCatalogKind, key: string): boolean {
  return catalogEntriesByKind(entries, kind).find((entry) => entry.key === key)?.isClosed ?? false;
}

export function countOpenStatusItems<TItem extends { status?: string | null }>(items: TItem[], entries: CatalogEntry[], kind: StatusCatalogKind): number {
  return items.filter((item) => {
    if (item.status === undefined || item.status === null) {
      return true;
    }
    return !isCatalogStatusClosed(entries, kind, item.status);
  }).length;
}
