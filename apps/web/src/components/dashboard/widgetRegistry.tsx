import type { DashboardContext, DashboardWidgetId } from "@taskmanager/shared-types";
import { Activity, Bug, CalendarClock, FileText, Flag, History, ListTodo, MessageSquare, Paperclip, type LucideIcon } from "lucide-react";

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
