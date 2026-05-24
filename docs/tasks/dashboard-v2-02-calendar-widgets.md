# Codex-Auftrag: Kalender-Widgets implementieren (`calendar` & `upcomingEvents`)

## Voraussetzung

Auftrag `dashboard-v2-01-widget-registry.md` muss abgeschlossen sein (Widget-IDs registriert).

## Hintergrund

Die bestehenden Komponenten `CalendarView` und `UpcomingEvents` werden bereits auf der Startseite (`StartPage.tsx`) verwendet. Sie erhalten ihre Daten über die Hooks `useEvents` und `useCalendarTasks`. Da diese Daten nicht über den generischen `useDashboardWidgetData`-Mechanismus abrufbar sind, benötigen die Kalender-Widgets eine eigene Datenanbindung direkt in `DashboardWidgets.tsx`.

## Implementierung

### `apps/web/src/components/dashboard/DashboardWidgets.tsx`

#### 1. Imports ergänzen

```ts
import { CalendarView } from "../calendar/CalendarView";
import { UpcomingEvents } from "../calendar/UpcomingEvents";
import { useCalendarTasks } from "../../hooks/useCalendarTasks";
import { useEvents } from "../../hooks/useEvents";
import { useHasPermission } from "../../hooks/usePermissions";
import { CalendarSkeleton } from "../calendar/CalendarSkeleton";
```

#### 2. `CalendarWidget`-Komponente

```tsx
function CalendarWidget() {
  const canReadEvents = useHasPermission("events", "read");
  const canReadTasks = useHasPermission("tasks", "read");
  const events = useEvents(undefined, canReadEvents);
  const calendarTasks = useCalendarTasks(canReadTasks);

  if (events.loading || calendarTasks.loading) {
    return <CalendarSkeleton />;
  }

  return (
    <CalendarView
      events={canReadEvents ? events.events : []}
      tasks={canReadTasks ? calendarTasks.tasks : []}
      compact
    />
  );
}
```

- `onDateClick`, `onEventClick`, `onEventMove` werden **nicht** übergeben → Kalender ist im Widget rein lesend (keine Navigation, kein DnD).

#### 3. `UpcomingEventsWidget`-Komponente

```tsx
function UpcomingEventsWidget() {
  const canReadEvents = useHasPermission("events", "read");
  const events = useEvents(undefined, canReadEvents);

  if (events.loading) {
    return <WidgetLoading />;
  }

  return <UpcomingEvents events={canReadEvents ? events.events : []} />;
}
```

- `onOpen` wird **nicht** übergeben → keine Navigation beim Klick auf einen Termin im Widget-Kontext.

#### 4. `DashboardWidgetCard` erweitern

In der `return`-Anweisung von `DashboardWidgetCard` die neuen Widget-IDs einhängen:

```tsx
{widget.widgetId === "calendar" ? (
  <WidgetShell widget={widget}>
    <CalendarWidget />
  </WidgetShell>
) : null}
{widget.widgetId === "upcomingEvents" ? (
  <WidgetShell widget={widget}>
    <UpcomingEventsWidget />
  </WidgetShell>
) : null}
```

**Hinweis:** Die Kalender-Widgets rufen `useDashboardWidgetData` **nicht** auf — sie holen ihre Daten eigenständig. Der `query`-Aufruf am Anfang von `DashboardWidgetCard` läuft weiterhin für alle anderen Widgets. Kalender-Widgets sollten früh per `if`-Zweig behandelt werden, bevor `useDashboardWidgetData` ausgewertet wird — oder `useDashboardWidgetData` muss `null` zurückgeben, wenn `widgetId` kein API-Widget ist. Prüfe die bestehende Implementierung von `useDashboardWidgetData`/`getDashboardWidgetData` und passe sie so an, dass Kalender-Widget-IDs übersprungen werden (z. B. früher `return null`).

### `apps/web/src/pages/StartPage.tsx`

Da Kalender und Nächste Termine nun als Dashboard-Widgets verfügbar sind, wird der hardcodierte Kalenderbereich aus der Startseite entfernt. Die gesamte `<section data-testid="start-calendar-preview">` inklusive aller Importe (`CalendarView`, `UpcomingEvents`, `CalendarSkeleton`, `useEvents`, `useCalendarTasks`) kann entfernt werden.

Die `StartPage` reduziert sich auf:

```tsx
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
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-6 overflow-auto px-4 pt-4 md:px-5 md:pt-5">
        <HomeDashboard hideInlineHeader />
      </div>
    </div>
  );
}
```

**Hinweis:** `PageHero` und `HomeDashboard`-Import bleiben erhalten.

## Abnahmekriterien

- `calendar`-Widget zeigt die FullCalendar-Monatsansicht im kompakten Modus, ohne Klick-Handler.
- `upcomingEvents`-Widget zeigt die nächsten 4 Termine, ohne Klick-Handler.
- Die Startseite zeigt keinen hardcodierten Kalenderbereich mehr.
- `data-testid="start-calendar-preview"` existiert nicht mehr im DOM.
- TypeScript-Kompilierung fehlerfrei.
