import {
  FEATURE_STATUSES,
  PROJECT_STATUSES,
  TASK_STATUSES,
  type BacklogItem,
  type Feature,
  type Milestone,
  type Project,
  type ProjectStatus,
  type Tag,
  type TaskBoardItem,
  type TaskStatus,
  type Ticket,
  type UseCase
} from "@taskmanager/shared-types";

const createdAt = "2026-05-17T08:00:00.000Z";
const updatedAt = "2026-05-17T09:30:00.000Z";

const projectStatusLabels: Record<ProjectStatus, string> = {
  active: "Aktiv",
  on_hold: "Pausiert",
  completed: "Abgeschlossen",
  archived: "Archiviert"
};

const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "Offen",
  in_progress: "In Arbeit",
  done: "Erledigt"
};

const featureStatusLabels: Record<Feature["status"], string> = {
  draft: "Entwurf",
  active: "Aktiv",
  done: "Erledigt",
  archived: "Archiviert"
};

export function buildTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: 1,
    name: "Qualität",
    color: "#0f766e",
    version: 1,
    ...overrides
  };
}

export function buildProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    name: "Projekt Aktiv",
    description: "Projekt zur Verbesserung der Aufgabenplanung",
    status: "active",
    color: "#4f46e5",
    startDate: "2026-01-01",
    dueDate: "2026-12-31",
    wikiPageId: null,
    version: 1,
    createdAt,
    updatedAt,
    milestoneCount: 2,
    openTaskCount: 3,
    doneTaskCount: 2,
    totalTaskCount: 5,
    ticketCount: 1,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    tags: [buildTag()],
    ...overrides
  };
}

export function buildMilestone(overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: 1,
    projectId: 1,
    name: "Meilenstein Aktiv",
    description: "Meilenstein zur Bündelung der Projektarbeit",
    status: "active",
    color: "#0f766e",
    startDate: "2026-02-01",
    dueDate: "2026-03-01",
    version: 1,
    createdAt,
    updatedAt,
    taskCount: 5,
    openTaskCount: 3,
    doneTaskCount: 2,
    totalTaskCount: 5,
    ticketCount: 1,
    featureCount: 2,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    tags: [buildTag()],
    ...overrides
  };
}

export function buildTask(overrides: Partial<TaskBoardItem> = {}): TaskBoardItem {
  return {
    id: 1,
    parentId: null,
    title: "Aufgabe Offen",
    description: "Eine vollständig beschriebene Aufgabe",
    status: "todo",
    priority: "high",
    assignee: "Max Mustermann",
    dueDate: "2026-12-31",
    boardPosition: 1,
    version: 1,
    createdAt,
    updatedAt,
    tags: [buildTag()],
    subtaskCount: 2,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    ...overrides
  };
}

export function buildFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 1,
    title: "Feature Aktiv",
    status: "active",
    description: "Ermöglicht die Benutzeranmeldung",
    content: "Ausführliche Beschreibung des Login-Features.",
    sortOrder: 1,
    useCaseCount: 3,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    version: 1,
    createdAt,
    updatedAt,
    ...overrides
  };
}

export function buildUseCase(overrides: Partial<UseCase> = {}): UseCase {
  return {
    id: 1,
    featureId: 1,
    title: "Use Case Anmeldung erfolgreich",
    status: "active",
    description: "Normaler Anmeldeablauf",
    content: "Der Nutzer meldet sich mit gültigen Zugangsdaten an.",
    sortOrder: 1,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    version: 1,
    createdAt,
    updatedAt,
    ...overrides
  };
}

export function buildBacklogItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  return {
    id: 1,
    projectId: 1,
    featureId: 1,
    useCaseId: 1,
    title: "Passwort-Reset",
    description: "Passwort-Reset implementieren",
    status: "open",
    importKey: null,
    sortOrder: 1,
    version: 1,
    createdAt,
    updatedAt,
    ...overrides
  };
}

export function buildProjectSet(): Project[] {
  return PROJECT_STATUSES.map((status, index) =>
    buildProject({
      id: index + 1,
      name: `Projekt ${projectStatusLabels[status]}`,
      status,
      color: ["#4f46e5", "#b45309", "#15803d", "#475569"][index],
      tags: [buildTag({ id: index + 1, name: `Tag ${projectStatusLabels[status]}` })]
    })
  );
}

export function buildTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 1,
    parentId: null,
    type: "bug",
    title: "Ticket Offen",
    description: "Ein vollständig beschriebenes Ticket",
    status: "open",
    priority: "high",
    resolution: null,
    reporter: "Max Mustermann",
    assignee: "Erika Musterfrau",
    environment: "Test",
    affectedVersion: "1.0.0",
    dueDate: "2026-12-31",
    resolvedAt: null,
    position: 1,
    version: 1,
    createdAt,
    updatedAt,
    tags: [buildTag()],
    subTicketCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    ...overrides
  };
}

export function buildMilestoneSet(): Milestone[] {
  return PROJECT_STATUSES.map((status, index) =>
    buildMilestone({
      id: index + 1,
      name: `Meilenstein ${projectStatusLabels[status]}`,
      status,
      color: ["#0f766e", "#b45309", "#7c3aed", "#475569"][index],
      tags: [buildTag({ id: index + 1, name: `Tag ${projectStatusLabels[status]}` })]
    })
  );
}

export function buildTaskSet(): TaskBoardItem[] {
  return TASK_STATUSES.map((status, index) =>
    buildTask({
      id: index + 1,
      title: `Aufgabe ${taskStatusLabels[status]}`,
      status,
      boardPosition: index + 1,
      tags: [buildTag({ id: index + 1, name: `Tag ${taskStatusLabels[status]}` })]
    })
  );
}

export function buildFeatureSet(): Feature[] {
  return FEATURE_STATUSES.map((status, index) =>
    buildFeature({
      id: index + 1,
      title: `Feature ${featureStatusLabels[status]}`,
      status,
      sortOrder: index + 1
    })
  );
}

export function buildTicketSet(): Ticket[] {
  return TASK_STATUSES.map((status, index) =>
    buildTicket({
      id: index + 1,
      title: `Ticket ${taskStatusLabels[status]}`,
      status,
      position: index + 1,
      tags: [buildTag({ id: index + 1, name: `Tag ${taskStatusLabels[status]}` })]
    })
  );
}
