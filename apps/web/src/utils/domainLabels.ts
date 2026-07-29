import type {
  TicketRelationType,
  TicketResolution,
  TicketType,
} from "@taskmanager/shared-types";
import type { BadgeTone } from "../components/ui/Badge";
import type { PillTone } from "../components/ui/Pill";
import { statusTonesByKind } from "./statusTones";

export const projectStatusLabels: Record<string, string> = {
  active: "Aktiv",
  on_hold: "Pausiert",
  completed: "Abgeschlossen",
  archived: "Archiviert",
  todo: "Offen",
  open: "Offen",
  in_progress: "In Arbeit",
  in_review: "In Prüfung",
  done: "Erledigt",
  resolved: "Gelöst",
  closed: "Geschlossen",
  rejected: "Verworfen",
};

export const projectStatusTones: Record<string, PillTone> =
  statusTonesByKind.workStatus;

export const milestoneStatusLabels: Record<string, string> =
  projectStatusLabels;

export const milestoneStatusTones: Record<string, PillTone> =
  projectStatusTones;

export const featureStatusLabels: Record<string, string> = {
  draft: "Entwurf",
  active: "Aktiv",
  done: "Erledigt",
  archived: "Archiviert",
};

export const featureStatusTones: Record<string, PillTone> =
  statusTonesByKind.featureStatus;

export const taskStatusLabels: Record<string, string> = projectStatusLabels;

export const taskStatusTones: Record<string, PillTone> = projectStatusTones;

export const backlogStatusLabels: Record<string, string> = projectStatusLabels;

export const backlogStatusTones: Record<string, PillTone> = projectStatusTones;

export const priorityLabels: Record<string, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  urgent: "Dringend",
};

export const priorityPillTones: Record<string, PillTone> = {
  urgent: "crimson",
  high: "tangerine",
  medium: "mustard",
  low: "steel",
};

export const priorityBadgeTones: Record<string, BadgeTone> = {
  urgent: "crimson",
  high: "tangerine",
  medium: "mustard",
  low: "steel",
};

export const ticketStatusLabels: Record<string, string> = projectStatusLabels;

export const ticketStatusTones: Record<string, PillTone> = projectStatusTones;

export const ticketTypeLabels: Record<TicketType, string> = {
  bug: "Bug",
  improvement: "Verbesserung",
  question: "Frage",
  task: "Aufgabe",
};

export const ticketTypeTones: Record<TicketType, BadgeTone> = {
  bug: "crimson",
  improvement: "teal",
  question: "violet",
  task: "steel",
};

export const ticketResolutionLabels: Record<TicketResolution, string> = {
  fixed: "Behoben",
  wont_fix: "Wird nicht behoben",
  duplicate: "Duplikat",
  cant_reproduce: "Nicht reproduzierbar",
  by_design: "Beabsichtigt",
};

export const ticketRelationTypeLabels: Record<TicketRelationType, string> = {
  blocks: "Blockiert",
  related: "Verwandt",
  duplicate: "Duplikat",
};

export const attachmentViewModeLabels = {
  list: "Liste",
  details: "Details",
  small: "Kleine Symbole",
  medium: "Mittelgroße Symbole",
  large: "Große Symbole",
} as const;

export const attachmentActionLabels = {
  archive: "Als ZIP herunterladen",
  bulkDelete: "Endgültig löschen",
  bulkUnlink: "Verknüpfungen lösen",
  createFolder: "Virtuellen Ordner anlegen",
  linkLocalFolder: "Lokalen Ordner verknüpfen",
  removeLocalFolder: "Ordner-Verknüpfung lösen",
  moveToFolder: "In Ordner verschieben",
} as const;
