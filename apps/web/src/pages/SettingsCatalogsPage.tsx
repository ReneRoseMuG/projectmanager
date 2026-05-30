import type { CatalogKind } from "@taskmanager/shared-types";
import { ListChecks } from "lucide-react";
import { useMemo, useState } from "react";
import { CatalogManager, catalogGroups } from "../components/settings/CatalogManager";
import { PageHero } from "../components/ui/PageHero";
import { TabBar } from "../components/ui/TabBar";
import { useCatalogs } from "../hooks/useCatalogs";

const catalogTabLabels: Record<CatalogKind, string> = {
  workStatus: "Arbeitsstatus",
  featureStatus: "Feature-Status",
  priority: "Prioritäten",
  ticketType: "Ticket-Typen",
};

export function SettingsCatalogsPage() {
  const catalogs = useCatalogs();
  const [activeKind, setActiveKind] = useState<CatalogKind>("workStatus");
  const tabs = useMemo(
    () =>
      catalogGroups.map((group) => ({
        value: group.kind,
        label: catalogTabLabels[group.kind],
        count: catalogs.entries.filter((entry) => entry.kind === group.kind).length,
      })),
    [catalogs.entries],
  );

  return (
    <section className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero
        variant="detail"
        title="Kataloge"
        icon={<ListChecks size={22} />}
        subtitle={
          <span className="text-sm font-medium text-white/70">
            {catalogs.entries.length} Einträge
          </span>
        }
      />
      <TabBar tabs={tabs} active={activeKind} onChange={setActiveKind} />
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto bg-white p-5">
        <CatalogManager activeKind={activeKind} />
      </div>
    </section>
  );
}
