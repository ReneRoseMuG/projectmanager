# Codex-Auftrag: Startseite zu reinem Dashboard vereinfachen

## Voraussetzung

Auftrag `dashboard-v2-02-calendar-widgets.md` muss abgeschlossen sein (Kalender-Widgets sind als Dashboard-Widgets verfügbar und aus `StartPage` ausgebaut).

## Kontext

Nach Abschluss von Auftrag 02 enthält `StartPage.tsx` keinen hardcodierten Kalenderbereich mehr. Dieser Auftrag stellt sicher, dass die Startseite vollständig bereinigt ist und der `HomeDashboard`-Bereich ohne überflüssige Wrapper-Sektion ausgeliefert wird.

## Zu prüfende Datei

`apps/web/src/pages/StartPage.tsx`

## Erwarteter Endzustand

```tsx
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
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-auto px-4 pt-4 md:px-5 md:pt-5">
        <HomeDashboard hideInlineHeader />
      </div>
    </div>
  );
}
```

## Was zu entfernen ist

- Import von `CalendarDays`, `CalendarView`, `CalendarSkeleton`, `UpcomingEvents`
- Import von `EmptyState`
- Import von `useEvents`, `useCalendarTasks`
- Alle zugehörigen `useHasPermission("events", ...)` und `useHasPermission("tasks", ...)` Aufrufe (soweit sie ausschließlich für den Kalenderbereich genutzt wurden)
- Die gesamte `<section data-testid="start-calendar-preview">` inklusive aller konditionalen Verzweigungen (`calendarEnabled`, `calendarError`, `calendarLoading`)
- Die `<section data-testid="start-dashboard-section">` und deren `<h2>` — `HomeDashboard` wird direkt in den Scroll-Container gerendert

## Was zu behalten ist

- `data-testid="start-page"` auf dem Root-Container
- `PageHero` mit Titel und Subtitle
- `HomeDashboard` mit `hideInlineHeader`
- `canReadDashboards`-Guard und `ForbiddenPage`

## Abnahmekriterien

- `StartPage` importiert keine Kalender-Komponenten oder Kalender-Hooks mehr.
- `data-testid="start-calendar-preview"` existiert nicht mehr im DOM.
- `data-testid="start-dashboard-section"` existiert nicht mehr (kein extra `<h2>` über dem Dashboard).
- `data-testid="start-page"` ist weiterhin vorhanden.
- TypeScript-Kompilierung fehlerfrei.
- Existierende Tests, die `start-page` referenzieren, laufen weiterhin durch; Tests, die `start-calendar-preview` referenzieren, müssen angepasst oder entfernt werden.
