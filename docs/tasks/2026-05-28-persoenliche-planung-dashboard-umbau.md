# Codex-Auftrag: DayPlanPage → Persönliche Planung als Dashboard

**Datum:** 2026-05-28
**Projekt:** PROJ-3 (Projekt Manager App)
**Meilenstein:** Persönliche Planung (Umbau)
**Feature:** FEAT-42 — Tagesplanung / Persönliche Planung

---

## Ziel

Die bestehende `DayPlanPage` ist eine monolithische Custom-Seite. Sie wird zu einer konfigurierbaren Dashboard-Seite umgebaut — analog zur `CalendarPage`, die `<DashboardView context="calendar" />` verwendet.

Gleichzeitig wird die Entität durchgehend von **„Tagesplanung" / „Tagesplan"** in **„Persönliche Planung"** umbenannt.

**Voraussetzung:** Auftrag 1 (Schema) und Auftrag 2 (noteList-Widget) sollten abgeschlossen sein.

---

## Kontext & Muster

### CalendarPage als Referenz

```tsx
// CalendarPage.tsx
export function CalendarPage() {
  return (
    <CalendarDashboardProvider>
      <CalendarDashboardPageContent />
    </CalendarDashboardProvider>
  );
}

function CalendarDashboardPageContent() {
  return (
    <div className="flex h-full ...">
      <PageHero title="Kalender" ... />
      <DashboardView context="calendar" hideInlineHeader />
    </div>
  );
}
```

Die `DashboardView`-Komponente übernimmt Widget-Rendering, Layout-Verwaltung und den Dashboard-Picker automatisch.

---

## Aufgaben

### 1. `packages/shared-types/src/index.ts`

- `"dayPlan"` in `DASHBOARD_CONTEXTS` eintragen
- `dashboardContextLabels`: `dayPlan: "Persönliche Planung"` (in `widgetRegistry.tsx`)
- `DASHBOARD_ALLOWED_WIDGETS["dayPlan"]` definieren:
  ```ts
  dayPlan: ["taskList", "taskBoard", "upcomingEvents", "overdueTasks",
            "commentJournal", "noteList", "globalJournal", "attachmentJournal"]
  ```
- `DEFAULT_DASHBOARD_LAYOUTS["dayPlan"]` definieren (Vorschlag):
  ```ts
  dayPlan: [
    { widgetId: "taskList",       col: 0, row: 0, colSpan: 1 },
    { widgetId: "upcomingEvents", col: 1, row: 0, colSpan: 1 },
    { widgetId: "globalJournal",  col: 0, row: 1, colSpan: 2, params: { limit: 15 } },
  ]
  ```

### 2. `apps/web/src/components/dashboard/widgetRegistry.tsx`

- `dashboardContextLabels`: `dayPlan: "Persönliche Planung"` eintragen

### 3. `apps/web/src/pages/DayPlanPage.tsx` — Umbau

Die gesamte bisherige Implementierung (Aufgaben-Formular, Termin-Formular, Datums-Navigation, Status-Toggle, manuelle Listen) wird durch das Dashboard-Pattern ersetzt:

```tsx
import { DashboardView } from "../components/dashboard/DashboardView";
import { PageHero } from "../components/ui/PageHero";
import { Tabs } from "../components/ui/Tabs"; // sofern vorhanden

export function DayPlanPage() {
  const canRead = useHasPermission("dayPlans", "read");
  const canReadDashboards = useHasPermission("dashboards", "read");

  if (!canRead || !canReadDashboards) return <ForbiddenPage />;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero variant="list" title="Persönliche Planung" />
      <div className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-auto px-4 pt-4 md:px-5 md:pt-5">
        {/* Dashboard-Übersicht */}
        <DashboardView context="dayPlan" hideInlineHeader />

        {/* Tabs: Aufgaben | Notizen | Kommentare | Journal */}
        <DayPlanTabs />
      </div>
    </div>
  );
}
```

**Tabs-Struktur (`DayPlanTabs`):**
- **Aufgaben** — Liste der verknüpften Tasks mit Formular zum Hinzufügen/Lösen
- **Notizen** — Liste der verknüpften Notes (`NoteList`-Komponente) mit Erstellen/Lösen
- **Kommentare** — Kommentarliste mit Eingabe (analog zu anderen Detail-Pages)
- **Journal** — Read-only Journal-Einträge für `dayPlan`-Objekte

Die Tab-Komponente existiert bereits im Projekt (prüfe `apps/web/src/components/ui/` auf vorhandene Tab-Implementierung).

### 4. Umbenennung: alle „Tagesplan" / „Tagesplanung"-Labels ersetzen

Folgende Stellen durchsuchen und auf „Persönliche Planung" / „Persönlicher Plan" aktualisieren:

```bash
grep -rn "Tagesplan\|tagesplan\|day.plan\|dayPlan" apps/web/src --include="*.tsx" --include="*.ts"
```

Konkrete bekannte Stellen:
- `apps/web/src/components/layout/Sidebar.tsx` — Nav-Label
- `apps/web/src/components/calendar/WeekCalendar.tsx` — Owner-Label „Tagesplan"
- `apps/web/src/components/journal/JournalPanel.tsx` — Label „Tagesplan"
- `apps/web/src/App.tsx` — Route-Kommentar (Route `/day-plan` kann vorerst bleiben)
- Alle `ownerLabel`-Funktionen die `"dayPlan"` übersetzen

### 5. `apps/web/src/hooks/useDayPlan.ts`

- Überprüfen ob der Hook noch gebraucht wird oder durch DashboardView abgelöst werden kann
- Tabs-Komponente braucht weiterhin einen Hook für Note/Comment-Operationen auf dem aktuellen `dayPlan`

---

## Hinweise zur bestehenden Implementierung

- Die `day_plans`-Tabelle hat weiterhin ein `date`-Feld und eine `(userId, date)`-Unique-Constraint. Für die Persönliche Planung wird **heute** als Datum verwendet (`format(new Date(), "yyyy-MM-dd")`). Die Datums-Navigation entfällt in der UI.
- Der Status (`open`/`closed`) des Tagesplans ist vorerst nicht mehr zentral in der UI exponiert — kann intern erhalten bleiben.
- `dayPlanAccess`-Permission-Check in `App.tsx` bleibt erhalten.

---

## Akzeptanzkriterien

- `tsc` läuft ohne Fehler durch
- Route `/day-plan` öffnet die neue Seite mit `PageHero "Persönliche Planung"`
- Dashboard-Übersicht mit konfigurierbaren Widgets wird korrekt gerendert
- Alle vier Tabs (Aufgaben, Notizen, Kommentare, Journal) sind navigierbar und zeigen Inhalte
- Sidebar-Eintrag lautet „Persönliche Planung"
- Kein UI-Label enthält mehr „Tagesplan" oder „Tagesplanung"
- Kalender-WeekView zeigt für `dayPlan`-Owner den Text „Persönliche Planung"
