import { useState } from "react";
import { GlobalDashboard, HomeDashboard } from "../components/dashboard/DashboardView";
import { PageHeader } from "../components/ui/PageHeader";
import { SegmentedControl } from "../components/ui/SegmentedControl";

type EditableDashboardContext = "global" | "home";

const dashboardContextOptions: Array<{ value: EditableDashboardContext; label: string }> = [
  { value: "global", label: "Dashboard" },
  { value: "home", label: "Startseite" },
];

export function DashboardPage() {
  const [activeContext, setActiveContext] = useState<EditableDashboardContext>("global");

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Dashboards"
        subtitle="Globale Übersicht und Startseite bearbeiten."
        actions={
          <SegmentedControl
            value={activeContext}
            options={dashboardContextOptions}
            onChange={setActiveContext}
          />
        }
      />
      {activeContext === "global" ? <GlobalDashboard showHeader={false} /> : <HomeDashboard />}
    </div>
  );
}
