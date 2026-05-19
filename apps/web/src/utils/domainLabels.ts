import type {
  BacklogStatus,
  FeatureStatus,
  Priority,
  ProjectStatus,
  TaskStatus,
  TicketRelationType,
  TicketResolution,
  TicketStatus,
  TicketType
} from "@taskmanager/shared-types";
import type { BadgeTone } from "../components/ui/Badge";
import type { PillTone } from "../components/ui/Pill";

export const projectStatusLabels: Record<ProjectStatus, string> = {
  active: "Aktiv",
  on_hold: "Pausiert",
  completed: "Abgeschlossen",
  archived: "Archiviert"
};

export const projectStatusTones: Record<ProjectStatus, PillTone> = {
  active: "fern",
  on_hold: "tangerine",
  completed: "violet",
  archived: "steel"
};

export const milestoneStatusLabels: Record<ProjectStatus, string> = projectStatusLabels;

export const milestoneStatusTones: Record<ProjectStatus, PillTone> = projectStatusTones;

export const featureStatusLabels: Record<FeatureStatus, string> = {
  draft: "Entwurf",
  active: "Aktiv",
  done: "Erledigt",
  archived: "Archiviert"
};

export const featureStatusTones: Record<FeatureStatus, PillTone> = {
  draft: "mustard",
  active: "fern",
  done: "violet",
  archived: "steel"
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "Offen",
  in_progress: "In Arbeit",
  done: "Erledigt"
};

export const taskStatusTones: Record<TaskStatus, PillTone> = {
  todo: "crimson",
  in_progress: "tangerine",
  done: "fern"
};

export const backlogStatusLabels: Record<BacklogStatus, string> = {
  open: "Offen",
  in_progress: "In Arbeit",
  done: "Erledigt",
  rejected: "Verworfen"
};

export const backlogStatusTones: Record<BacklogStatus, PillTone> = {
  open: "steel",
  in_progress: "tangerine",
  done: "fern",
  rejected: "crimson"
};

export const priorityLabels: Record<Priority, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  urgent: "Dringend"
};

export const priorityPillTones: Record<Priority, PillTone> = {
  urgent: "crimson",
  high: "tangerine",
  medium: "mustard",
  low: "steel"
};

export const priorityBadgeTones: Record<Priority, BadgeTone> = {
  urgent: "crimson",
  high: "tangerine",
  medium: "mustard",
  low: "steel"
};

export const ticketStatusLabels: Record<TicketStatus, string> = {
  open: "Offen",
  in_progress: "In Arbeit",
  in_review: "In Prüfung",
  resolved: "Gelöst",
  closed: "Geschlossen"
};

export const ticketStatusTones: Record<TicketStatus, PillTone> = {
  open: "steel",
  in_progress: "tangerine",
  in_review: "mustard",
  resolved: "fern",
  closed: "violet"
};

export const ticketTypeLabels: Record<TicketType, string> = {
  bug: "Bug",
  improvement: "Verbesserung",
  question: "Frage",
  task: "Aufgabe"
};

export const ticketTypeTones: Record<TicketType, BadgeTone> = {
  bug: "crimson",
  improvement: "teal",
  question: "violet",
  task: "steel"
};

export const ticketResolutionLabels: Record<TicketResolution, string> = {
  fixed: "Behoben",
  wont_fix: "Wird nicht behoben",
  duplicate: "Duplikat",
  cant_reproduce: "Nicht reproduzierbar",
  by_design: "Beabsichtigt"
};

export const ticketRelationTypeLabels: Record<TicketRelationType, string> = {
  blocks: "Blockiert",
  related: "Verwandt",
  duplicate: "Duplikat"
};
