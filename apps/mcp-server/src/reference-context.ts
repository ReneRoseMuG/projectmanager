import type {
  Attachment,
  AttachmentPreviewInfo,
  Comment,
  Feature,
  FeatureRelation,
  Milestone,
  Note,
  Project,
  Task,
  TaskDetail,
  Ticket,
  TicketDetail,
  TicketRelationEntry,
  UseCase
} from "@taskmanager/shared-types";
import type { ProjectManagerApiClient } from "./api-client.js";

export type ReferenceObjectType = "project" | "milestone" | "task" | "ticket" | "feature" | "useCase";

export type ReferenceObject = Project | Milestone | TaskDetail | TicketDetail | Feature | UseCase;

export interface ParsedReference {
  type: ReferenceObjectType;
  id: number;
  reference: string;
}

export interface ReferenceContextWarning {
  target: string;
  message: string;
}

export interface ReferenceAttachment {
  attachment: Attachment;
  preview: AttachmentPreviewInfo | null;
  previewWarning: string | null;
}

export interface ReferenceSupport {
  notes: Note[];
  attachments: ReferenceAttachment[];
  comments: Comment[];
  featureRelations: FeatureRelation[];
  ticketRelations: TicketRelationEntry[];
}

export interface ReferenceChildren {
  milestones: ReferenceContextNode[];
  features: ReferenceContextNode[];
  useCases: ReferenceContextNode[];
  tasks: ReferenceContextNode[];
  tickets: ReferenceContextNode[];
}

export interface ReferenceContextNode {
  type: ReferenceObjectType;
  id: number;
  reference: string;
  object: ReferenceObject;
  support: ReferenceSupport;
  children: ReferenceChildren;
  alreadyVisited?: boolean;
}

export interface ReferenceContext {
  reference: string;
  normalizedReference: string;
  root: ReferenceContextNode;
  warnings: ReferenceContextWarning[];
}

interface ReferenceContextState {
  client: ProjectManagerApiClient;
  expanded: Set<string>;
  warnings: ReferenceContextWarning[];
}

const referencePrefixes = {
  project: "PROJ",
  milestone: "MS",
  task: "TASK",
  ticket: "TKT",
  feature: "FEAT",
  useCase: "UC"
} satisfies Record<ReferenceObjectType, string>;

const prefixTypes = {
  PROJ: "project",
  MS: "milestone",
  TASK: "task",
  TKT: "ticket",
  FEAT: "feature",
  UC: "useCase"
} satisfies Record<string, ReferenceObjectType>;

const naturalReferenceTypes = {
  projekt: "project",
  project: "project",
  proj: "project",
  meilenstein: "milestone",
  milestone: "milestone",
  ms: "milestone",
  aufgabe: "task",
  task: "task",
  ticket: "ticket",
  tkt: "ticket",
  feature: "feature",
  feat: "feature",
  usecase: "useCase",
  uc: "useCase",
  anwendungsfall: "useCase"
} satisfies Record<string, ReferenceObjectType>;

const textExtensions = new Set([
  "txt",
  "md",
  "markdown",
  "log",
  "json",
  "xml",
  "html",
  "htm",
  "css",
  "js",
  "ts",
  "tsx",
  "jsx",
  "sql",
  "yaml",
  "yml",
  "toml",
  "ini",
  "env",
  "csv",
  "tsv"
]);

const textMimeTypes = new Set([
  "application/json",
  "application/xml",
  "application/x-yaml",
  "application/yaml"
]);

export function objectReference(type: ReferenceObjectType, id: number): string {
  return `${referencePrefixes[type]}-${id}`;
}

export function parseReferenceInput(input: string): ParsedReference {
  const trimmed = input.trim();
  const directMatch = trimmed.toUpperCase().match(/^(PROJ|MS|TASK|TKT|FEAT|UC)-(\d+)$/);
  if (directMatch) {
    const prefix = directMatch[1];
    const idText = directMatch[2];
    if (!prefix || !idText) {
      throw invalidReference(input);
    }
    const type = lookupPrefixType(prefix);
    if (!type) {
      throw invalidReference(input);
    }
    const id = Number.parseInt(idText, 10);
    return { type, id, reference: objectReference(type, id) };
  }

  const naturalMatch = trimmed
    .toLowerCase()
    .replace(/use\s+case/g, "usecase")
    .match(/\b(projekt|project|proj|meilenstein|milestone|ms|aufgabe|task|ticket|tkt|feature|feat|usecase|uc|anwendungsfall)\b[\s-]*(?:id|nr\.?|nummer|#)?\s*[-:]?\s*(\d+)\b/);
  if (naturalMatch) {
    const typeText = naturalMatch[1];
    const idText = naturalMatch[2];
    if (!typeText || !idText) {
      throw invalidReference(input);
    }
    const type = lookupNaturalReferenceType(typeText);
    if (!type) {
      throw invalidReference(input);
    }
    const id = Number.parseInt(idText, 10);
    return { type, id, reference: objectReference(type, id) };
  }

  throw invalidReference(input);
}

export async function buildReferenceContext(client: ProjectManagerApiClient, reference: string): Promise<ReferenceContext> {
  const parsed = parseReferenceInput(reference);
  const state: ReferenceContextState = {
    client,
    expanded: new Set<string>(),
    warnings: []
  };

  return {
    reference,
    normalizedReference: parsed.reference,
    root: await loadNode(state, parsed.type, parsed.id),
    warnings: state.warnings
  };
}

function invalidReference(input: string): Error {
  return new Error(`Ungültige Referenz "${input}" - erwartet z. B. TASK-10 oder Meilenstein ID 12`);
}

function lookupPrefixType(prefix: string): ReferenceObjectType | undefined {
  return Object.hasOwn(prefixTypes, prefix) ? prefixTypes[prefix as keyof typeof prefixTypes] : undefined;
}

function lookupNaturalReferenceType(typeText: string): ReferenceObjectType | undefined {
  return Object.hasOwn(naturalReferenceTypes, typeText) ? naturalReferenceTypes[typeText as keyof typeof naturalReferenceTypes] : undefined;
}

function nodeKey(type: ReferenceObjectType, id: number): string {
  return `${type}:${id}`;
}

function emptySupport(): ReferenceSupport {
  return {
    notes: [],
    attachments: [],
    comments: [],
    featureRelations: [],
    ticketRelations: []
  };
}

function emptyChildren(): ReferenceChildren {
  return {
    milestones: [],
    features: [],
    useCases: [],
    tasks: [],
    tickets: []
  };
}

function createNode(
  type: ReferenceObjectType,
  id: number,
  object: ReferenceObject,
  support: ReferenceSupport,
  children: ReferenceChildren,
  alreadyVisited: boolean
): ReferenceContextNode {
  const node: ReferenceContextNode = {
    type,
    id,
    reference: objectReference(type, id),
    object,
    support,
    children
  };
  if (alreadyVisited) {
    node.alreadyVisited = true;
  }
  return node;
}

async function loadNode(state: ReferenceContextState, type: ReferenceObjectType, id: number): Promise<ReferenceContextNode> {
  const key = nodeKey(type, id);
  const alreadyVisited = state.expanded.has(key);
  if (!alreadyVisited) {
    state.expanded.add(key);
  }

  switch (type) {
    case "project":
      return loadProject(state, id, alreadyVisited);
    case "milestone":
      return loadMilestone(state, id, alreadyVisited);
    case "task":
      return loadTask(state, id, alreadyVisited);
    case "ticket":
      return loadTicket(state, id, alreadyVisited);
    case "feature":
      return loadFeature(state, id, alreadyVisited);
    case "useCase":
      return loadUseCase(state, id, alreadyVisited);
  }
}

async function loadProject(state: ReferenceContextState, id: number, alreadyVisited: boolean): Promise<ReferenceContextNode> {
  const object = await state.client.get<Project>(`projects/${id}`);
  if (alreadyVisited) {
    return createNode("project", id, object, emptySupport(), emptyChildren(), true);
  }

  const children = emptyChildren();
  children.milestones = await loadChildNodes(state, "milestone", await readOptionalList<Milestone>(state, `projects/${id}/milestones`));
  children.tasks = await loadChildNodes(state, "task", await readOptionalList<Task>(state, `projects/${id}/tasks`));
  children.tickets = await loadChildNodes(state, "ticket", await readOptionalList<Ticket>(state, `projects/${id}/tickets`));
  children.features = await loadChildNodes(state, "feature", await readOptionalList<Feature>(state, `projects/${id}/features`));

  return createNode("project", id, object, await loadOwnerSupport(state, "projects", id, { notes: true, attachments: true, comments: true }), children, false);
}

async function loadMilestone(state: ReferenceContextState, id: number, alreadyVisited: boolean): Promise<ReferenceContextNode> {
  const object = await state.client.get<Milestone>(`milestones/${id}`);
  if (alreadyVisited) {
    return createNode("milestone", id, object, emptySupport(), emptyChildren(), true);
  }

  const children = emptyChildren();
  children.tasks = await loadChildNodes(state, "task", await readOptionalList<Task>(state, `milestones/${id}/tasks`));
  children.tickets = await loadChildNodes(state, "ticket", await readOptionalList<Ticket>(state, `milestones/${id}/tickets`));
  children.features = await loadChildNodes(state, "feature", await readOptionalList<Feature>(state, `milestones/${id}/features`));

  return createNode("milestone", id, object, await loadOwnerSupport(state, "milestones", id, { notes: true, attachments: true, comments: true }), children, false);
}

async function loadFeature(state: ReferenceContextState, id: number, alreadyVisited: boolean): Promise<ReferenceContextNode> {
  const object = await state.client.get<Feature>(`features/${id}`);
  if (alreadyVisited) {
    return createNode("feature", id, object, emptySupport(), emptyChildren(), true);
  }

  const children = emptyChildren();
  children.useCases = await loadChildNodes(state, "useCase", await readOptionalList<UseCase>(state, `features/${id}/use-cases`));
  children.tasks = await loadChildNodes(state, "task", await readOptionalList<Task>(state, `features/${id}/tasks`));
  children.tickets = await loadChildNodes(state, "ticket", await readOptionalList<Ticket>(state, `features/${id}/tickets`));

  const support = await loadOwnerSupport(state, "features", id, { notes: false, attachments: true, comments: true });
  support.featureRelations = await readOptionalList<FeatureRelation>(state, `features/${id}/relations`);
  return createNode("feature", id, object, support, children, false);
}

async function loadUseCase(state: ReferenceContextState, id: number, alreadyVisited: boolean): Promise<ReferenceContextNode> {
  const object = await state.client.get<UseCase>(`use-cases/${id}`);
  if (alreadyVisited) {
    return createNode("useCase", id, object, emptySupport(), emptyChildren(), true);
  }

  const children = emptyChildren();
  children.tasks = await loadChildNodes(state, "task", await readOptionalList<Task>(state, `use-cases/${id}/tasks`));
  children.tickets = await loadChildNodes(state, "ticket", await readOptionalList<Ticket>(state, `use-cases/${id}/tickets`));

  return createNode("useCase", id, object, await loadOwnerSupport(state, "use-cases", id, { notes: false, attachments: false, comments: true }), children, false);
}

async function loadTask(state: ReferenceContextState, id: number, alreadyVisited: boolean): Promise<ReferenceContextNode> {
  const object = await state.client.get<TaskDetail>(`tasks/${id}`);
  if (alreadyVisited) {
    return createNode("task", id, object, emptySupport(), emptyChildren(), true);
  }

  const children = emptyChildren();
  children.tasks = await loadChildNodes(state, "task", object.subtasks);
  children.tickets = await loadChildNodes(state, "ticket", await readOptionalList<Ticket>(state, `tasks/${id}/tickets`));

  return createNode("task", id, object, await supportFromDetail(state, object), children, false);
}

async function loadTicket(state: ReferenceContextState, id: number, alreadyVisited: boolean): Promise<ReferenceContextNode> {
  const object = await state.client.get<TicketDetail>(`tickets/${id}`);
  if (alreadyVisited) {
    return createNode("ticket", id, object, emptySupport(), emptyChildren(), true);
  }

  const children = emptyChildren();
  children.tickets = await loadChildNodes(state, "ticket", object.subTickets);
  const support = await supportFromDetail(state, object);
  support.ticketRelations = object.relations;
  return createNode("ticket", id, object, support, children, false);
}

async function loadChildNodes<T extends { id: number }>(
  state: ReferenceContextState,
  type: ReferenceObjectType,
  items: T[]
): Promise<ReferenceContextNode[]> {
  const nodes: ReferenceContextNode[] = [];
  for (const item of items) {
    try {
      nodes.push(await loadNode(state, type, item.id));
    } catch (error) {
      addWarning(state, objectReference(type, item.id), error);
    }
  }
  return nodes;
}

async function loadOwnerSupport(
  state: ReferenceContextState,
  ownerPath: string,
  ownerId: number,
  options: { notes: boolean; attachments: boolean; comments: boolean }
): Promise<ReferenceSupport> {
  const support = emptySupport();
  if (options.notes) {
    support.notes = await readOptionalList<Note>(state, `${ownerPath}/${ownerId}/notes`);
  }
  if (options.comments) {
    support.comments = await readOptionalList<Comment>(state, `${ownerPath}/${ownerId}/comments`);
  }
  if (options.attachments) {
    support.attachments = await loadAttachmentPreviews(state, await readOptionalList<Attachment>(state, `${ownerPath}/${ownerId}/attachments`));
  }
  return support;
}

async function supportFromDetail(state: ReferenceContextState, detail: TaskDetail | TicketDetail): Promise<ReferenceSupport> {
  const support = emptySupport();
  support.notes = detail.notes;
  support.comments = detail.comments;
  support.attachments = await loadAttachmentPreviews(state, detail.attachments);
  return support;
}

async function readOptionalList<T>(state: ReferenceContextState, path: string): Promise<T[]> {
  try {
    return await state.client.get<T[]>(path);
  } catch (error) {
    addWarning(state, path, error);
    return [];
  }
}

async function loadAttachmentPreviews(state: ReferenceContextState, attachments: Attachment[]): Promise<ReferenceAttachment[]> {
  const results: ReferenceAttachment[] = [];
  for (const attachment of attachments) {
    results.push(await loadAttachmentPreview(state, attachment));
  }
  return results;
}

async function loadAttachmentPreview(state: ReferenceContextState, attachment: Attachment): Promise<ReferenceAttachment> {
  if (!isTextPreviewCandidate(attachment)) {
    return { attachment, preview: null, previewWarning: null };
  }

  try {
    return {
      attachment,
      preview: await state.client.get<AttachmentPreviewInfo>(`attachments/${attachment.id}/preview`),
      previewWarning: null
    };
  } catch (error) {
    const message = errorMessage(error);
    state.warnings.push({ target: `attachments/${attachment.id}/preview`, message });
    return { attachment, preview: null, previewWarning: message };
  }
}

function isTextPreviewCandidate(attachment: Attachment): boolean {
  const mimetype = attachment.mimetype.toLowerCase();
  const extension = extensionOf(attachment.originalName || attachment.filename);
  return mimetype.startsWith("text/") || textMimeTypes.has(mimetype) || textExtensions.has(extension);
}

function extensionOf(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index + 1).toLowerCase() : "";
}

function addWarning(state: ReferenceContextState, target: string, error: unknown): void {
  state.warnings.push({ target, message: errorMessage(error) });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
