import type { StatusCatalogKind } from "@taskmanager/shared-types";
import type { PillTone } from "../components/ui/Pill";

export const statusTonesByKind: Record<
  StatusCatalogKind,
  Record<string, PillTone>
> = {
  workStatus: {
    active: "fern",
    todo: "fern",
    open: "fern",
    in_progress: "tangerine",
    in_review: "mustard",
    on_hold: "steel",
    completed: "steel",
    done: "steel",
    resolved: "steel",
    closed: "steel",
    archived: "steel",
    rejected: "steel",
  },
  featureStatus: {
    draft: "violet",
    planned: "violet",
    active: "tangerine",
    development: "tangerine",
    testing: "mustard",
    done: "steel",
    released: "steel",
    archived: "steel",
  },
};

export function statusToneForKey(
  kind: StatusCatalogKind,
  value: string,
  isClosed?: boolean,
): PillTone {
  if (isClosed) {
    return "steel";
  }

  return statusTonesByKind[kind][value] ?? "fern";
}
