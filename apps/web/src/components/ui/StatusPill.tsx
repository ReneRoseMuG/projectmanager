import type { StatusCatalogKind } from "@taskmanager/shared-types";
import { useCatalogs } from "../../hooks/useCatalogs";
import { catalogEntriesByKind } from "../../utils/catalogs";
import { Pill } from "./Pill";

interface StatusPillProps {
  kind: StatusCatalogKind;
  value: string;
}

/** Compact status display backed by editable status catalogs. */
export function StatusPill({ kind, value }: StatusPillProps) {
  const catalogs = useCatalogs();
  const entry = catalogEntriesByKind(catalogs.entries, kind).find(
    (item) => item.key === value,
  );
  return (
    <Pill color={entry?.color}>
      {entry?.label ?? value}
    </Pill>
  );
}
