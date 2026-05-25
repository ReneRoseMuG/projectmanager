import type { DashboardContext, DashboardWidgetId } from "@taskmanager/shared-types";
import { Activity, Bug, CalendarClock, CalendarDays, ChevronRight, FileText, Flag, History, KanbanSquare, List, ListTodo, MessageSquare, Paperclip, type LucideIcon } from "lucide-react";

export interface DashboardWidgetMeta {
  id: DashboardWidgetId;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const dashboardWidgetRegistry: Record<DashboardWidgetId, DashboardWidgetMeta> = {
  taskStatusReport: {
    id: "taskStatusReport",
    label: "Aufgaben nach Status",
    description: "Zählt Aufgaben nach offen, in Arbeit und abgeschlossen.",
    icon: ListTodo,
  },
  ticketStatusReport: {
    id: "ticketStatusReport",
    label: "Tickets nach Status",
    description: "Zählt Tickets nach Bearbeitungsstatus.",
    icon: Bug,
  },
  taskJournal: {
    id: "taskJournal",
    label: "Aktuelle Aufgaben",
    description: "Zeigt zuletzt geänderte Aufgaben.",
    icon: Activity,
  },
  ticketJournal: {
    id: "ticketJournal",
    label: "Aktuelle Tickets",
    description: "Zeigt zuletzt geänderte Tickets.",
    icon: CalendarClock,
  },
  globalJournal: {
    id: "globalJournal",
    label: "Journal",
    description: "Zeigt das fachliche Änderungsjournal.",
    icon: History,
  },
  commentJournal: {
    id: "commentJournal",
    label: "Kommentare",
    description: "Zeigt neue Kommentare im aktuellen Kontext.",
    icon: MessageSquare,
  },
  attachmentJournal: {
    id: "attachmentJournal",
    label: "Dateien",
    description: "Zeigt zuletzt hochgeladene Dateien.",
    icon: Paperclip,
  },
  milestoneProgress: {
    id: "milestoneProgress",
    label: "Meilensteine im Projekt",
    description: "Listet Meilensteine mit Aufgaben- und Ticketfortschritt.",
    icon: Flag,
  },
  overdueTasks: {
    id: "overdueTasks",
    label: "Überfällige Aufgaben",
    description: "Zeigt offene Aufgaben mit überschrittenem Fälligkeitsdatum.",
    icon: FileText,
  },
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
  milestoneListView: {
    id: "milestoneListView",
    label: "Meilensteinliste",
    description: "ListView der Meilensteine im aktuellen Kontext (nur Ansicht).",
    icon: List,
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
};

export const dashboardContextLabels: Record<DashboardContext, string> = {
  global: "Dashboard",
  project: "Projektübersicht",
  milestone: "Meilensteinübersicht",
  task: "Aufgabenübersicht",
  home: "Startseite",
};

export function dashboardWidgetLabel(widgetId: DashboardWidgetId): string {
  return dashboardWidgetRegistry[widgetId].label;
}
