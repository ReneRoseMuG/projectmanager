import { HomeDashboard } from "../components/dashboard/DashboardView";
import { PageHero } from "../components/ui/PageHero";
import { useHasPermission } from "../hooks/usePermissions";
import { ForbiddenPage } from "./ForbiddenPage";

export function StartPage() {
  const canReadDashboards = useHasPermission("dashboards", "read");

  if (!canReadDashboards) {
    return <ForbiddenPage />;
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col" data-testid="start-page">
      <PageHero
        variant="list"
        title="Startseite"
        subtitle="Dein persönliches Dashboard"
      />
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-auto p-4">
        <HomeDashboard hideInlineHeader />
      </div>
    </div>
  );
}
