import { Plus } from "lucide-react";
import { CalendarDashboardProvider, useCalendarDashboard } from "../components/calendar/CalendarDashboardProvider";
import { DashboardView } from "../components/dashboard/DashboardView";
import { Button } from "../components/ui/Button";
import { PageHero } from "../components/ui/PageHero";
import { useHasPermission } from "../hooks/usePermissions";
import { ForbiddenPage } from "./ForbiddenPage";

function CalendarDashboardPageContent() {
  const calendar = useCalendarDashboard();

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero
        variant="list"
        title="Kalender"
        subtitle={`${calendar.events.length} Termine`}
        actions={
          calendar.canWriteEvents ? (
            <Button
              variant="primary"
              icon={<Plus size={17} />}
              onClick={() => calendar.openCreate()}
            >
              Neuer Termin
            </Button>
          ) : undefined
        }
      />

      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-6 overflow-auto px-4 pt-4 md:px-5 md:pt-5">
        {calendar.error ? (
          <div className="rounded-md border border-crimson bg-crimson/10 p-3 text-sm text-crimson">
            {calendar.error}
          </div>
        ) : null}
        <DashboardView context="calendar" hideInlineHeader />
      </div>
    </div>
  );
}

export function CalendarPage() {
  const canReadDashboards = useHasPermission("dashboards", "read");
  const canReadEvents = useHasPermission("events", "read");

  if (!canReadDashboards || !canReadEvents) {
    return <ForbiddenPage />;
  }

  return (
    <CalendarDashboardProvider>
      <CalendarDashboardPageContent />
    </CalendarDashboardProvider>
  );
}
