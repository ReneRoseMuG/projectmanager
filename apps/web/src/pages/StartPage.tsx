import { CalendarDays } from "lucide-react";
import { CalendarSkeleton } from "../components/calendar/CalendarSkeleton";
import { CalendarView } from "../components/calendar/CalendarView";
import { UpcomingEvents } from "../components/calendar/UpcomingEvents";
import { HomeDashboard } from "../components/dashboard/DashboardView";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHero } from "../components/ui/PageHero";
import { useCalendarTasks } from "../hooks/useCalendarTasks";
import { useEvents } from "../hooks/useEvents";
import { useHasPermission } from "../hooks/usePermissions";
import { ForbiddenPage } from "./ForbiddenPage";

export function StartPage() {
  const canReadDashboards = useHasPermission("dashboards", "read");
  const canReadEvents = useHasPermission("events", "read");
  const canReadTasks = useHasPermission("tasks", "read");
  const events = useEvents(undefined, canReadDashboards && canReadEvents);
  const calendarTasks = useCalendarTasks(canReadDashboards && canReadTasks);
  const calendarEnabled = canReadEvents || canReadTasks;
  const calendarLoading =
    (canReadEvents && events.loading) ||
    (canReadTasks && calendarTasks.loading);
  const calendarError =
    (canReadEvents ? events.error : null) ??
    (canReadTasks ? calendarTasks.error : null);

  if (!canReadDashboards) {
    return <ForbiddenPage />;
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col" data-testid="start-page">
      <PageHero
        variant="list"
        title="Startseite"
        subtitle="Dashboard und Kalender im Überblick"
      />

      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-6 overflow-auto px-4 pt-4 md:px-5 md:pt-5">
        <HomeDashboard />

        <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]" data-testid="start-calendar-preview">
          <div className="xl:col-span-2">
            <h2 className="text-sm font-semibold text-ink">Kalender</h2>
            <p className="mt-1 text-sm text-steel-500">Kommende Termine und fällige Aufgaben.</p>
          </div>
          {!calendarEnabled ? (
            <EmptyState
              icon={<CalendarDays size={22} />}
              title="Kalender nicht verfügbar"
              body="Für die Kalender-Vorschau fehlen die nötigen Leserechte."
              variant="tinted"
              tone="neutral"
              className="xl:col-span-2"
            />
          ) : calendarError ? (
            <div className="rounded-md border border-crimson bg-crimson/10 p-3 text-sm text-crimson xl:col-span-2">
              {calendarError}
            </div>
          ) : calendarLoading ? (
            <div className="xl:col-span-2">
              <CalendarSkeleton />
            </div>
          ) : (
            <>
              <CalendarView
                events={canReadEvents ? events.events : []}
                tasks={canReadTasks ? calendarTasks.tasks : []}
                compact
              />
              <UpcomingEvents events={canReadEvents ? events.events : []} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
