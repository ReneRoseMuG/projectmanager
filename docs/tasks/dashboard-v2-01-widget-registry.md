# Codex-Auftrag: Widget-Registry und shared-types erweitern

## Ziel

Die Konstanten in `packages/shared-types/src/index.ts` und die Widget-Registry in `apps/web/src/components/dashboard/widgetRegistry.tsx` um 10 neue Widget-IDs erweitern, damit die folgenden Aufträge (02–03) darauf aufbauen können.

## Neue Widget-IDs

```
calendar
upcomingEvents
taskBoard
taskList
ticketBoard
ticketList
milestoneBoard
milestoneList
projectBoard
projectList
```

## Implementierung

### `packages/shared-types/src/index.ts`

#### 1. `DASHBOARD_WIDGET_IDS` erweitern

```ts
export const DASHBOARD_WIDGET_IDS = [
  // bestehende IDs …
  "taskStatusReport",
  "ticketStatusReport",
  "taskJournal",
  "ticketJournal",
  "globalJournal",
  "commentJournal",
  "attachmentJournal",
  "milestoneProgress",
  "overdueTasks",
  // NEU:
  "calendar",
  "upcomingEvents",
  "taskBoard",
  "taskList",
  "ticketBoard",
  "ticketList",
  "milestoneBoard",
  "milestoneList",
  "projectBoard",
  "projectList",
] as const;
```

#### 2. `DASHBOARD_ALLOWED_WIDGETS` aktualisieren

- `home`: alle 10 neuen IDs hinzufügen
- `global`: alle 10 neuen IDs hinzufügen
- `project`: `calendar`, `upcomingEvents`, `taskBoard`, `taskList`, `ticketBoard`, `ticketList`, `milestoneBoard`, `milestoneList` hinzufügen (kein `projectBoard`/`projectList`, da sie keinen Projekt-Kontext haben)
- `milestone`: `taskBoard`, `taskList`, `ticketBoard`, `ticketList` hinzufügen
- `task`: keine Änderung (Board/List-Widgets für Subtasks sind nicht vorgesehen)

#### 3. `DEFAULT_DASHBOARD_LAYOUTS` für `home` aktualisieren

Das Standard-Layout der Startseite soll Kalender-Widgets enthalten:

```ts
home: [
  { widgetId: "taskStatusReport", col: 0, row: 0, colSpan: 1 },
  { widgetId: "ticketStatusReport", col: 1, row: 0, colSpan: 1 },
  { widgetId: "calendar", col: 0, row: 1, colSpan: 1 },
  { widgetId: "upcomingEvents", col: 1, row: 1, colSpan: 1 },
]
```

### `apps/web/src/components/dashboard/widgetRegistry.tsx`

Für jede neue Widget-ID einen Eintrag in `dashboardWidgetRegistry` hinzufügen:

```ts
import {
  Activity, Bug, CalendarClock, CalendarDays, ChevronRight,
  FileText, Flag, History, KanbanSquare, List,
  ListTodo, MessageSquare, Paperclip, type LucideIcon,
} from "lucide-react";

// NEU:
calendar: {
  id: "calendar",
  label: "Kalender",
  description: "Monatsansicht mit Terminen und Aufgaben-Fälligkeiten.",
  icon: CalendarDays,
},
upcomingEvents: {
  id: "upcomingEvents",
  label: "Nächste Termine",
  description: "Zeigt die nächsten 4 anstehenden Termine.",
  icon: CalendarClock,
},
taskBoard: {
  id: "taskBoard",
  label: "Aufgaben-Board",
  description: "Kanban-Board der Aufgaben im aktuellen Kontext (nur Ansicht).",
  icon: KanbanSquare,
},
taskList: {
  id: "taskList",
  label: "Aufgabenliste",
  description: "Listenansicht der Aufgaben im aktuellen Kontext (nur Ansicht).",
  icon: ListTodo,
},
ticketBoard: {
  id: "ticketBoard",
  label: "Ticket-Board",
  description: "Kanban-Board der Tickets im aktuellen Kontext (nur Ansicht).",
  icon: KanbanSquare,
},
ticketList: {
  id: "ticketList",
  label: "Ticketliste",
  description: "Listenansicht der Tickets im aktuellen Kontext (nur Ansicht).",
  icon: List,
},
milestoneBoard: {
  id: "milestoneBoard",
  label: "Meilenstein-Board",
  description: "Kanban-Board der Meilensteine (nur Ansicht).",
  icon: KanbanSquare,
},
milestoneList: {
  id: "milestoneList",
  label: "Meilensteinkarte",
  description: "Listenansicht der Meilensteine (nur Ansicht).",
  icon: Flag,
},
projectBoard: {
  id: "projectBoard",
  label: "Projekt-Board",
  description: "Kanban-Board der Projekte (nur Ansicht).",
  icon: KanbanSquare,
},
projectList: {
  id: "projectList",
  label: "Projektliste",
  description: "Listenansicht der Projekte (nur Ansicht).",
  icon: ChevronRight,
},
```

## Abnahmekriterien

- `DASHBOARD_WIDGET_IDS` enthält alle 19 Widget-IDs.
- `DASHBOARD_ALLOWED_WIDGETS` lässt `projectBoard`/`projectList` im `project`-Kontext nicht zu.
- `DEFAULT_DASHBOARD_LAYOUTS.home` enthält `calendar` und `upcomingEvents`.
- `dashboardWidgetRegistry` hat Einträge für alle 19 Widget-IDs.
- TypeScript-Kompilierung fehlerfrei.
