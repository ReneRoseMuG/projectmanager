import type { Priority } from "@taskmanager/shared-types";
import { useCatalogs } from "../../hooks/useCatalogs";
import { catalogLabel } from "../../utils/catalogs";
import { priorityBadgeTones } from "../../utils/domainLabels";
import { Badge } from "./Badge";

interface PriorityBadgeProps {
  value: Priority;
}

/** Compact priority display backed by editable priority catalog entries. */
export function PriorityBadge({ value }: PriorityBadgeProps) {
  const catalogs = useCatalogs();
  return <Badge tone={priorityBadgeTones[value] ?? "steel"}>{catalogLabel(catalogs.entries, "priority", value)}</Badge>;
}
