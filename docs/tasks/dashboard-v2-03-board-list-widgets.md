# Codex-Auftrag: Read-only Board/List-Widgets implementieren

## Voraussetzung

Auftrag `dashboard-v2-01-widget-registry.md` muss abgeschlossen sein (Widget-IDs registriert).

## Hintergrund

Es gibt generische Adapter-Komponenten für Board-/Listenansichten:
- `TaskListBoardView` → `apps/web/src/components/tasks/TaskListBoardView.tsx`
- `TicketListBoardView` → `apps/web/src/components/tickets/TicketListBoardView.tsx`
- `MilestoneListBoardView` → `apps/web/src/components/milestones/MilestoneListBoardView.tsx`
- `ProjectListBoardView` → `apps/web/src/components/projects/ProjectListBoardView.tsx`

Diese Adapter sollen für Dashboard-Widgets im **Read-only-Modus** wiederverwendet werden. Im Read-only-Modus gilt:
- Kein Drag & Drop (kein `onItemStatusChange`)
- Keine Statusänderungen über Karten
- Keine Toolbar (kein Suchfeld, kein View-Toggle, keine Filter-Chips, kein „Hinzufügen"-Button)
- Fester View-Modus: Board-Widget → `board`, List-Widget → `list`

## Schritt 1: `readOnly`-Prop in ListBoardView-Adaptern ergänzen

### `apps/web/src/components/tasks/TaskListBoardView.tsx`

Eine neue optionale Prop `readOnly?: boolean` einführen. Wenn `readOnly === true`:
- `onAdd`, `onAddStatus`, `onDelete`, `onStatusChange`, `onDueDateChange` werden nicht aufgerufen (können als leere Funktionen übergeben oder durch Guard ersetzt werden)
- `showCreateActions` wird auf `false` gesetzt
- `ListBoardView` erhält `showToolbar={false}` (falls diese Prop noch nicht existiert, ergänzen)
- `onModeChange` ist eine No-op

Analog in `TicketListBoardView.tsx`, `MilestoneListBoardView.tsx`, `ProjectListBoardView.tsx`.

### `apps/web/src/components/ui/ListBoardView.tsx`

Neue Prop `showToolbar?: boolean` (Default: `true`). Wenn `false`, wird die gesamte Toolbar-Zeile (Suchfeld, View-Toggle, Primär-Button) nicht gerendert.

## Schritt 2: Widget-Wrapper-Komponenten erstellen

### `apps/web/src/components/dashboard/DashboardWidgets.tsx`

#### Datenabfrage über `useDashboardWidgetData`

Die Board/List-Widgets beziehen ihre Daten über den bestehenden generischen Mechanismus.  
In `apps/web/src/api/dashboard.ts` muss `getDashboardWidgetData` für die neuen Widget-IDs erweitert werden:

```ts
case "taskBoard":
case "taskList":
  return getDashboardRecentTasks(owner, params);
case "ticketBoard":
case "ticketList":
  return getDashboardRecentTickets(owner, params);
case "milestoneBoard":
case "milestoneList":
  return getDashboardMilestones(owner, params);
case "projectBoard":
case "projectList":
  return getDashboardProjects(params);
```

Falls `getDashboardRecentTickets`, `getDashboardMilestones` oder `getDashboardProjects` noch nicht existieren, müssen sie ergänzt werden:

```ts
// tickets/recent analog zu tasks/recent — prüfen ob Endpoint vorhanden
export async function getDashboardRecentTickets(owner?: DashboardOwner, params: DashboardWidgetParams = {}): Promise<Ticket[]> {
  return api.get("tickets/recent", { searchParams: ticketWidgetSearchParams(owner, params) }).json<Ticket[]>();
}

// milestones — bestehenden Listendpunkt verwenden
export async function getDashboardMilestones(owner?: DashboardOwner, params: DashboardWidgetParams = {}): Promise<Milestone[]> {
  return api.get("milestones", { searchParams: { ...ownerSearchParams(owner), ...limitParam(params) } }).json<Milestone[]>();
}

// projects — globale Liste (kein owner-Filter)
export async function getDashboardProjects(params: DashboardWidgetParams = {}): Promise<Project[]> {
  return api.get("projects", { searchParams: limitParam(params) }).json<Project[]>();
}
```

**Hinweis:** Prüfe die API, ob die Endpoints existieren und welche Query-Parameter sie erwarten.

#### Widget-Komponenten in `DashboardWidgets.tsx`

```tsx
import type { Task, Ticket, Milestone, Project } from "@taskmanager/shared-types";
import { TaskListBoardView } from "../tasks/TaskListBoardView";
import { TicketListBoardView } from "../tickets/TicketListBoardView";
import { MilestoneListBoardView } from "../milestones/MilestoneListBoardView";
import { ProjectListBoardView } from "../projects/ProjectListBoardView";

// Board-Widgets rendern als "board", List-Widgets als "list"
{widget.widgetId === "taskBoard" ? (
  <WidgetShell widget={widget}>
    <TaskListBoardView
      tasks={query.data as Task[] ?? []}
      viewMode="kanban"
      onViewModeChange={() => {}}
      onAdd={() => {}} onOpen={() => {}} onDelete={() => {}}
      readOnly
    />
  </WidgetShell>
) : null}
{widget.widgetId === "taskList" ? (
  <WidgetShell widget={widget}>
    <TaskListBoardView
      tasks={query.data as Task[] ?? []}
      viewMode="list"
      onViewModeChange={() => {}} onAdd={() => {}} onOpen={() => {}} onDelete={() => {}}
      readOnly
    />
  </WidgetShell>
) : null}
// analog für ticketBoard, ticketList, milestoneBoard, milestoneList, projectBoard, projectList
```

## Abnahmekriterien

- Jedes der 8 neuen Widgets rendert die passende Listenansicht ohne Toolbar, Suchfeld, Filter und Hinzufügen-Button.
- `taskBoard` / `ticketBoard` / `milestoneBoard` / `projectBoard` zeigen eine Kanban-Spalten-Ansicht.
- `taskList` / `ticketList` / `milestoneList` / `projectList` zeigen eine Listenansicht.
- Kein DnD, keine Statusänderungen per Karte.
- Die `readOnly`-Prop funktioniert; bestehende Nutzungen der Adapter ohne `readOnly` bleiben unverändert.
- TypeScript-Kompilierung fehlerfrei.
