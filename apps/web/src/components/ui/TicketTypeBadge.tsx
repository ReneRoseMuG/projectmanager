import type { TicketType } from "@taskmanager/shared-types";
import { useCatalogs } from "../../hooks/useCatalogs";
import { catalogColor, catalogLabel } from "../../utils/catalogs";
import { Badge } from "./Badge";

interface TicketTypeBadgeProps {
  value: TicketType;
}

/** Compact ticket type display backed by editable ticket type catalog entries. */
export function TicketTypeBadge({ value }: TicketTypeBadgeProps) {
  const catalogs = useCatalogs();
  return (
    <Badge color={catalogColor(catalogs.entries, "ticketType", value)} filled>
      {catalogLabel(catalogs.entries, "ticketType", value)}
    </Badge>
  );
}
