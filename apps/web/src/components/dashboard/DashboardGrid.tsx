import type { Dashboard, DashboardOwner, DashboardWidgetLayout } from "@taskmanager/shared-types";
import { DashboardWidgetCard } from "./DashboardWidgets";

interface DashboardGridProps {
  dashboard: Dashboard;
  owner?: DashboardOwner;
  dayPlanDate?: string;
}

function sortWidgets(widgets: DashboardWidgetLayout[]): DashboardWidgetLayout[] {
  return [...widgets].sort((left, right) => left.row - right.row || left.col - right.col || left.widgetId.localeCompare(right.widgetId));
}

export function DashboardGrid({ dashboard, owner, dayPlanDate }: DashboardGridProps) {
  return (
    <div className="grid auto-rows-min grid-cols-1 items-stretch gap-4 xl:grid-cols-2" data-testid="dashboard-grid">
      {sortWidgets(dashboard.widgets).map((widget) => (
        <div
          key={widget.widgetId}
          className={`h-full ${widget.colSpan === 2 ? "xl:col-span-2" : ""}`}
          style={{ order: widget.row * 2 + widget.col }}
        >
          <DashboardWidgetCard widget={widget} owner={owner} context={dashboard.context} dayPlanDate={dayPlanDate} />
        </div>
      ))}
    </div>
  );
}
