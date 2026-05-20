import type { CatalogEntry, CatalogKind, StatusCatalogKind } from "@taskmanager/shared-types";
import { FEATURE_STATUSES, PRIORITIES, WORK_STATUSES } from "@taskmanager/shared-types";
import { featureStatusLabels, priorityLabels, projectStatusLabels } from "./domainLabels";

const now = "1970-01-01T00:00:00.000Z";

function fallbackEntry(kind: CatalogKind, key: string, label: string, sortOrder: number, isClosed = false): CatalogEntry {
  return {
    id: -sortOrder,
    kind,
    key,
    label,
    sortOrder,
    isClosed,
    version: 1,
    createdAt: now,
    updatedAt: now
  };
}

export const fallbackCatalogEntries: CatalogEntry[] = [
  ...WORK_STATUSES.map((status, index) => fallbackEntry("workStatus", status, projectStatusLabels[status] ?? status, (index + 1) * 100, ["completed", "archived", "done", "resolved", "closed", "rejected"].includes(status))),
  ...FEATURE_STATUSES.map((status, index) => fallbackEntry("featureStatus", status, featureStatusLabels[status] ?? status, (index + 1) * 100, status === "done" || status === "archived")),
  ...PRIORITIES.map((priority, index) => fallbackEntry("priority", priority, priorityLabels[priority] ?? priority, (index + 1) * 100))
];

export function catalogEntriesByKind(entries: CatalogEntry[], kind: CatalogKind): CatalogEntry[] {
  const source = entries.length > 0 ? entries : fallbackCatalogEntries;
  return source.filter((entry) => entry.kind === kind).sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label));
}

export function catalogLabel(entries: CatalogEntry[], kind: CatalogKind, key: string): string {
  return catalogEntriesByKind(entries, kind).find((entry) => entry.key === key)?.label ?? key;
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
