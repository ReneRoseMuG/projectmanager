import type { VisibleParentContext } from "@taskmanager/shared-types";
import { Badge } from "./Badge";

const parentTypeLabels: Record<VisibleParentContext["type"], string> = {
  project: "Projekt",
  milestone: "Meilenstein",
  task: "Aufgabe",
  ticket: "Ticket",
  feature: "Feature",
  useCase: "Use Case",
  wikiPage: "Wiki-Seite",
};

export function ParentBadge({ parent }: { parent?: VisibleParentContext | null }) {
  if (!parent) {
    return null;
  }

  const prefix = parent.origin === "inherited" ? "Über" : parentTypeLabels[parent.type];
  return (
    <Badge tone={parent.origin === "inherited" ? "teal" : "steel"}>
      {prefix}: {parent.label}
    </Badge>
  );
}
