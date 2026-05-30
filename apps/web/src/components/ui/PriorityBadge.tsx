import type { Priority } from "@taskmanager/shared-types";
import { useCatalogs } from "../../hooks/useCatalogs";
import { catalogColor, catalogLabel } from "../../utils/catalogs";
import { Badge } from "./Badge";

interface PriorityBadgeProps {
  value: Priority;
}

/** Compact priority display backed by editable priority catalog entries. */
export function PriorityBadge({ value }: PriorityBadgeProps) {
  const catalogs = useCatalogs();
  return <Badge color={catalogColor(catalogs.entries, "priority", value)} filled>{catalogLabel(catalogs.entries, "priority", value)}</Badge>;
}
