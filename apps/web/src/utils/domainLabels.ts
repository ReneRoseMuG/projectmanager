import type { BacklogStatus, FeatureStatus, Priority, ProjectStatus, TaskStatus } from "@taskmanager/shared-types";
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
