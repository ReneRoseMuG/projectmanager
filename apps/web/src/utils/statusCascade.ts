import type { CatalogEntry } from "@taskmanager/shared-types";
import { catalogEntriesByKind } from "./catalogs";

export type StatusCascadeObjectType = "milestone" | "task" | "ticket";

export interface StatusCascadeCandidate {
  id: number;
  title: string;
  status: string;
  statusLabel: string;
  statusSortOrder: number | null;
  version: number;
}

export interface StatusCascadeDialogItem {
  id: number;
  title: string;
  status: string;
  statusLabel: string;
  version: number;
}

export interface StatusCascadeStep {
  type: StatusCascadeObjectType;
  title: string;
  singularTitle: string;
  items: StatusCascadeDialogItem[];
}

export type StatusCascadeSelection = Record<StatusCascadeObjectType, number[]>;

const stepTitles: Record<StatusCascadeObjectType, { title: string; singularTitle: string }> = {
  milestone: { title: "Meilensteine", singularTitle: "Meilenstein" },
  task: { title: "Aufgaben", singularTitle: "Aufgabe" },
  ticket: { title: "Tickets", singularTitle: "Ticket" },
};

export function workStatusSortOrder(entries: CatalogEntry[], status: string | null | undefined): number | null {
  if (!status) {
    return null;
  }
  const entry = catalogEntriesByKind(entries, "workStatus").find((item) => item.key === status);
  return entry?.sortOrder ?? null;
}

export function isStatusIncrease(entries: CatalogEntry[], oldStatus: string, newStatus: string): { increased: boolean; newSortOrder: number | null } {
  const oldSortOrder = workStatusSortOrder(entries, oldStatus);
  const newSortOrder = workStatusSortOrder(entries, newStatus);
  return {
    increased: oldSortOrder !== null && newSortOrder !== null && newSortOrder > oldSortOrder,
    newSortOrder,
  };
}

export function filterAffectedObjects<TItem extends { statusSortOrder: number | null | undefined }>(
  items: TItem[],
  newStatusSortOrder: number,
): TItem[] {
  return items.filter((item) => typeof item.statusSortOrder === "number" && item.statusSortOrder < newStatusSortOrder);
}

export function buildDialogSteps(
  milestones: StatusCascadeDialogItem[],
  tasks: StatusCascadeDialogItem[],
  tickets: StatusCascadeDialogItem[],
): StatusCascadeStep[] {
  const groups: Array<[StatusCascadeObjectType, StatusCascadeDialogItem[]]> = [
    ["milestone", milestones],
    ["task", tasks],
    ["ticket", tickets],
  ];

  return groups
    .filter(([, items]) => items.length > 0)
    .map(([type, items]) => ({
      type,
      title: stepTitles[type].title,
      singularTitle: stepTitles[type].singularTitle,
      items,
    }));
}
