import {
  AI_AGENT_ACTION_TYPES,
  AI_TEXT_OPERATIONS,
  COMMENT_ENTITY_TYPES,
  FEATURE_RELATION_TYPES,
  FEATURE_STATUSES,
  PRIORITIES,
  PROJECT_STATUSES,
  TASK_STATUSES,
  TICKET_RELATION_TYPES,
  TICKET_STATUSES,
  type AiAgentAction,
  type AiAgentActionResult,
  type AiAgentExecuteRequest,
  type AiAgentExecuteResponse,
  type AiAgentPlanRequest,
  type AiAgentPlanResponse,
  type AiTextAssistRequest,
  type AiTextAssistResponse,
  type BacklogItemInput,
  type CommentEntityType,
  type EventInput,
  type FeatureInput,
  type FeatureRelationInput,
  type JsonObject,
  type JsonValue,
  type MilestoneInput,
  type NoteInput,
  type ProjectInput,
  type TaskInput,
  type TicketInput,
  type UseCaseInput,
  type WikiPageInput
} from "@taskmanager/shared-types";
import type { AppConfig } from "../config.js";
import type { DbClient } from "../db/client.js";
import { backlogItems, features, milestones, projects, tags, tasks, tickets, useCases, wikiPages } from "../db/schema.js";
import { type AiChatMessage, type AiLocalModelClient } from "./ai-ollama.service.js";
import { createBacklogItem } from "./backlog.service.js";
import { createEntityComment } from "./comments.service.js";
import { setFeatureRelations, setMilestoneFeatures, setProjectFeatures } from "./doc-links.service.js";
import { createEvent } from "./events.service.js";
import { createFeature } from "./features.service.js";
import { createMilestone } from "./milestones.service.js";
import { createMilestoneNote, createProjectNote, createTaskNote, createTicketNote } from "./notes.service.js";
import { createProject } from "./projects.service.js";
import { createTag, setMilestoneTags, setProjectTags, setTaskTags, setTicketTags } from "./tags.service.js";
import { createOwnerTask, createSubtask, linkOwnerTask, type TaskOwner } from "./tasks.service.js";
import { addTicketRelation, createOwnerTicket, createSubTicket, createTicket, linkOwnerTicket, type TicketOwner } from "./tickets.service.js";
import { createUseCase } from "./use-cases.service.js";
import { createWikiPage } from "./wiki.service.js";
import { badRequest, internalError } from "../utils/errors.js";

type AiActionType = AiAgentAction["type"];

type NamedEntityType =
  | "project"
  | "milestone"
  | "task"
  | "feature"
  | "useCase"
  | "ticket"
  | "wikiPage"
  | "backlogItem"
  | "tag";

interface NamedEntity {
  id: number;
  label: string;
}

interface RawAgentAction {
  type: AiActionType;
  label: string;
  description: string;
  payload: JsonObject;
}

interface RawAgentPlan {
  message: string;
  actions: RawAgentAction[];
  blockers: string[];
}

const actionLabels: Record<AiActionType, string> = {
  createProject: "Projekt anlegen",
  createMilestone: "Meilenstein anlegen",
  createTask: "Aufgabe anlegen",
  createSubtask: "Subtask anlegen",
  createTicket: "Ticket anlegen",
  createSubTicket: "Sub-Ticket anlegen",
  createFeature: "Feature anlegen",
  createUseCase: "Use Case anlegen",
  createWikiPage: "Wiki-Seite anlegen",
  createBacklogItem: "Backlog-Eintrag anlegen",
  createComment: "Kommentar anlegen",
  createNote: "Notiz anlegen",
  createTag: "Tag anlegen",
  createEvent: "Kalendereintrag anlegen",
  setProjectFeatures: "Projekt-Features setzen",
  setMilestoneFeatures: "Meilenstein-Features setzen",
  setFeatureRelations: "Feature-Relationen setzen",
  linkOwnerTask: "Aufgabe verknüpfen",
  linkOwnerTicket: "Ticket verknüpfen",
  addTicketRelation: "Ticket-Relation hinzufügen",
  setProjectTags: "Projekt-Tags setzen",
  setMilestoneTags: "Meilenstein-Tags setzen",
  setTaskTags: "Aufgaben-Tags setzen",
  setTicketTags: "Ticket-Tags setzen"
};

const actionCatalog = AI_AGENT_ACTION_TYPES.map((type) => `- ${type}: ${actionLabels[type]}`).join("\n");

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonObject(value: unknown): value is JsonObject {
  return isObject(value);
}

function asJsonObject(value: unknown): JsonObject {
  if (!isJsonObject(value)) {
    return {};
  }
  return value;
}

function jsonPayload(values: Record<string, JsonValue | undefined>): JsonObject {
  const payload: JsonObject = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) {
      payload[key] = value;
    }
  }
  return payload;
}

function textField(payload: JsonObject, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" ? value : undefined;
}

function cleanTextField(payload: JsonObject, key: string): string | undefined {
  const value = textField(payload, key)?.trim();
  return value ? value : undefined;
}

function nullableTextField(payload: JsonObject, key: string): string | null | undefined {
  const value = payload[key];
  if (value === null) {
    return null;
  }
  if (typeof value === "string") {
    return value.trim() || null;
  }
  return undefined;
}

function requiredText(payload: JsonObject, key: string): string {
  const value = cleanTextField(payload, key);
  if (!value) {
    throw badRequest(`AI action payload requires ${key}`);
  }
  return value;
}

function numberField(payload: JsonObject, key: string): number | undefined {
  const value = payload[key];
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
}

function requiredNumber(payload: JsonObject, key: string): number {
  const value = numberField(payload, key);
  if (value === undefined) {
    throw badRequest(`AI action payload requires ${key}`);
  }
  return value;
}

function numberArrayField(payload: JsonObject, key: string): number[] | undefined {
  const value = payload[key];
  if (!Array.isArray(value)) {
    return undefined;
  }

  const numbers = value
    .map((item) => (typeof item === "number" && Number.isInteger(item) && item > 0 ? item : undefined))
    .filter((item): item is number => item !== undefined);
  return numbers.length === value.length ? [...new Set(numbers)] : undefined;
}

function stringArrayField(payload: JsonObject, key: string): string[] | undefined {
  const value = payload[key];
  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
  return strings.length === value.length ? [...new Set(strings)] : undefined;
}

function booleanField(payload: JsonObject, key: string): boolean | undefined {
  const value = payload[key];
  return typeof value === "boolean" ? value : undefined;
}

function enumField<T extends readonly string[]>(payload: JsonObject, key: string, allowed: T): T[number] | undefined {
  const value = textField(payload, key);
  return value && allowed.includes(value) ? value : undefined;
}

function jsonObjectField(payload: JsonObject, key: string): JsonObject | undefined {
  const value = payload[key];
  return isJsonObject(value) ? value : undefined;
}

function ensurePromptSize(text: string, appConfig: Pick<AppConfig, "aiMaxInputChars">): string {
  const trimmed = text.trim();
  if (!trimmed) {
    throw badRequest("Prompt is required");
  }
  if (trimmed.length > appConfig.aiMaxInputChars) {
    throw badRequest(`Prompt is too long. Maximum is ${appConfig.aiMaxInputChars} characters`);
  }
  return trimmed;
}

function selectedModel(model: string | null | undefined, appConfig: Pick<AppConfig, "aiDefaultModel">): string {
  return model?.trim() || appConfig.aiDefaultModel;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("de-DE");
}

function entityRows(database: DbClient, type: NamedEntityType): NamedEntity[] {
  if (type === "project") {
    return database.select({ id: projects.id, label: projects.name }).from(projects).all();
  }
  if (type === "milestone") {
    return database.select({ id: milestones.id, label: milestones.name }).from(milestones).all();
  }
  if (type === "task") {
    return database.select({ id: tasks.id, label: tasks.title }).from(tasks).all();
  }
  if (type === "feature") {
    return database.select({ id: features.id, label: features.title }).from(features).all();
  }
  if (type === "useCase") {
    return database.select({ id: useCases.id, label: useCases.title }).from(useCases).all();
  }
  if (type === "ticket") {
    return database.select({ id: tickets.id, label: tickets.title }).from(tickets).all();
  }
  if (type === "wikiPage") {
    return database.select({ id: wikiPages.id, label: wikiPages.title }).from(wikiPages).all();
  }
  if (type === "backlogItem") {
    return database.select({ id: backlogItems.id, label: backlogItems.title }).from(backlogItems).all();
  }
  return database.select({ id: tags.id, label: tags.name }).from(tags).all();
}

function resolveEntityId(database: DbClient, type: NamedEntityType, name: string | undefined, blockers: string[], label: string): number | undefined {
  if (!name) {
    return undefined;
  }

  const normalizedName = normalize(name);
  const rows = entityRows(database, type);
  const exact = rows.filter((row) => normalize(row.label) === normalizedName);
  const candidates = exact.length > 0 ? exact : rows.filter((row) => normalize(row.label).includes(normalizedName));

  if (candidates.length === 1) {
    return candidates[0]?.id;
  }
  if (candidates.length === 0) {
    blockers.push(`${label} "${name}" wurde nicht gefunden.`);
    return undefined;
  }

  blockers.push(`${label} "${name}" ist mehrdeutig: ${candidates.map((item) => `${item.label} (#${item.id})`).join(", ")}.`);
  return undefined;
}

function resolveIds(database: DbClient, type: NamedEntityType, ids: number[] | undefined, names: string[] | undefined, blockers: string[], label: string): number[] | undefined {
  if (ids && ids.length > 0) {
    return ids;
  }
  if (!names || names.length === 0) {
    return undefined;
  }

  const resolved = names
    .map((name) => resolveEntityId(database, type, name, blockers, label))
    .filter((id): id is number => id !== undefined);
  return resolved.length === names.length ? resolved : undefined;
}

function ownerNameField(type: string): string {
  if (type === "project") {
    return "projectName";
  }
  if (type === "milestone") {
    return "milestoneName";
  }
  if (type === "task") {
    return "taskTitle";
  }
  if (type === "feature") {
    return "featureTitle";
  }
  if (type === "useCase") {
    return "useCaseTitle";
  }
  if (type === "ticket") {
    return "ticketTitle";
  }
  if (type === "wikiPage") {
    return "wikiPageTitle";
  }
  return "backlogItemTitle";
}

function resolveOwner(database: DbClient, payload: JsonObject, allowedTypes: readonly string[], blockers: string[], label: string): { type: string; id: number } | undefined {
  const explicitType = cleanTextField(payload, "ownerType");
  const inferredType =
    cleanTextField(payload, "projectName") !== undefined
      ? "project"
      : cleanTextField(payload, "milestoneName") !== undefined
        ? "milestone"
        : cleanTextField(payload, "taskTitle") !== undefined || cleanTextField(payload, "taskName") !== undefined
          ? "task"
          : cleanTextField(payload, "featureTitle") !== undefined || cleanTextField(payload, "featureName") !== undefined
            ? "feature"
            : cleanTextField(payload, "useCaseTitle") !== undefined || cleanTextField(payload, "useCaseName") !== undefined
              ? "useCase"
              : cleanTextField(payload, "ticketTitle") !== undefined || cleanTextField(payload, "ticketName") !== undefined
                ? "ticket"
                : undefined;
  const type = explicitType ?? inferredType;

  if (!type || !allowedTypes.includes(type)) {
    blockers.push(`${label}: Owner-Typ fehlt oder ist nicht erlaubt.`);
    return undefined;
  }

  const explicitId = numberField(payload, "ownerId");
  if (explicitId !== undefined) {
    return { type, id: explicitId };
  }

  const nameKey = ownerNameField(type);
  const name = cleanTextField(payload, nameKey) ?? cleanTextField(payload, "ownerName") ?? cleanTextField(payload, "taskName") ?? cleanTextField(payload, "featureName") ?? cleanTextField(payload, "useCaseName") ?? cleanTextField(payload, "ticketName");
  const resolved = resolveEntityId(database, type as NamedEntityType, name, blockers, `${label} Owner`);
  return resolved === undefined ? undefined : { type, id: resolved };
}

function rawActionsFromModel(value: unknown): RawAgentPlan {
  if (!isObject(value)) {
    return { message: "Die KI hat keinen strukturierten Plan geliefert.", actions: [], blockers: ["Ungültige KI-Antwort."] };
  }

  const rawActions = Array.isArray(value.actions) ? value.actions : [];
  const actions: RawAgentAction[] = [];
  const blockers = Array.isArray(value.blockers) ? value.blockers.filter((item): item is string => typeof item === "string") : [];

  for (const item of rawActions) {
    if (!isObject(item)) {
      blockers.push("Eine geplante Aktion war nicht lesbar.");
      continue;
    }

    const rawType = typeof item.type === "string" ? item.type : "";
    if (!AI_AGENT_ACTION_TYPES.includes(rawType as AiActionType)) {
      blockers.push(`Nicht erlaubte Aktion: ${rawType || "unbekannt"}.`);
      continue;
    }

    const type = rawType as AiActionType;
    actions.push({
      type,
      label: typeof item.label === "string" && item.label.trim() ? item.label.trim() : actionLabels[type],
      description: typeof item.description === "string" && item.description.trim() ? item.description.trim() : actionLabels[type],
      payload: asJsonObject(item.payload)
    });
  }

  const message = typeof value.message === "string" && value.message.trim() ? value.message.trim() : "Ich habe einen Aktionsplan vorbereitet.";
  return { message, actions, blockers };
}

function withResolvedPayload(database: DbClient, action: RawAgentAction, blockers: string[]): AiAgentAction {
  const payload = { ...action.payload };

  if (action.type === "createTask") {
    const owner = resolveOwner(database, payload, ["project", "milestone", "feature", "useCase"], blockers, action.label);
    if (owner) {
      payload.ownerType = owner.type;
      payload.ownerId = owner.id;
    }
  }

  if (action.type === "createMilestone" || action.type === "createBacklogItem") {
    const projectId = numberField(payload, "projectId") ?? resolveEntityId(database, "project", cleanTextField(payload, "projectName"), blockers, "Projekt");
    if (projectId !== undefined) {
      payload.projectId = projectId;
    }
  }

  if (action.type === "createUseCase") {
    const featureId = numberField(payload, "featureId") ?? resolveEntityId(database, "feature", cleanTextField(payload, "featureTitle") ?? cleanTextField(payload, "featureName"), blockers, "Feature");
    if (featureId !== undefined) {
      payload.featureId = featureId;
    }
  }

  if (action.type === "createComment" || action.type === "createNote") {
    const owner = resolveOwner(database, payload, COMMENT_ENTITY_TYPES, blockers, action.label);
    if (owner) {
      payload.ownerType = owner.type;
      payload.ownerId = owner.id;
    }
  }

  if (action.type === "createTicket" || action.type === "linkOwnerTicket") {
    const owner = resolveOwner(database, payload, ["project", "milestone", "task", "feature", "useCase"], blockers, action.label);
    if (owner) {
      payload.ownerType = owner.type;
      payload.ownerId = owner.id;
    }
  }

  if (action.type === "linkOwnerTask") {
    const owner = resolveOwner(database, payload, ["project", "milestone", "feature", "useCase"], blockers, action.label);
    if (owner) {
      payload.ownerType = owner.type;
      payload.ownerId = owner.id;
    }
    const taskId = numberField(payload, "taskId") ?? resolveEntityId(database, "task", cleanTextField(payload, "taskTitle") ?? cleanTextField(payload, "taskName"), blockers, "Aufgabe");
    if (taskId !== undefined) {
      payload.taskId = taskId;
    }
  }

  if (action.type === "linkOwnerTicket") {
    const ticketId = numberField(payload, "ticketId") ?? resolveEntityId(database, "ticket", cleanTextField(payload, "ticketTitle") ?? cleanTextField(payload, "ticketName"), blockers, "Ticket");
    if (ticketId !== undefined) {
      payload.ticketId = ticketId;
    }
  }

  if (action.type === "setProjectFeatures") {
    const projectId = numberField(payload, "projectId") ?? resolveEntityId(database, "project", cleanTextField(payload, "projectName"), blockers, "Projekt");
    const featureIds = resolveIds(database, "feature", numberArrayField(payload, "featureIds"), stringArrayField(payload, "featureTitles") ?? stringArrayField(payload, "featureNames"), blockers, "Feature");
    if (projectId !== undefined) {
      payload.projectId = projectId;
    }
    if (featureIds) {
      payload.featureIds = featureIds;
    }
  }

  if (action.type === "setMilestoneFeatures") {
    const milestoneId = numberField(payload, "milestoneId") ?? resolveEntityId(database, "milestone", cleanTextField(payload, "milestoneName"), blockers, "Meilenstein");
    const featureIds = resolveIds(database, "feature", numberArrayField(payload, "featureIds"), stringArrayField(payload, "featureTitles") ?? stringArrayField(payload, "featureNames"), blockers, "Feature");
    if (milestoneId !== undefined) {
      payload.milestoneId = milestoneId;
    }
    if (featureIds) {
      payload.featureIds = featureIds;
    }
  }

  if (action.type === "setProjectTags" || action.type === "setTaskTags" || action.type === "setMilestoneTags" || action.type === "setTicketTags") {
    const tagIds = resolveIds(database, "tag", numberArrayField(payload, "tagIds"), stringArrayField(payload, "tagNames"), blockers, "Tag");
    if (tagIds) {
      payload.tagIds = tagIds;
    }
  }

  return {
    type: action.type,
    label: action.label,
    description: action.description,
    payload,
    requiresConfirmation: true
  };
}

function projectInput(payload: JsonObject): ProjectInput {
  return {
    name: requiredText(payload, "name"),
    description: nullableTextField(payload, "description"),
    status: enumField(payload, "status", PROJECT_STATUSES),
    color: nullableTextField(payload, "color"),
    startDate: nullableTextField(payload, "startDate"),
    dueDate: nullableTextField(payload, "dueDate")
  };
}

function milestoneInput(payload: JsonObject): MilestoneInput {
  return {
    projectId: requiredNumber(payload, "projectId"),
    name: requiredText(payload, "name"),
    description: nullableTextField(payload, "description"),
    status: enumField(payload, "status", PROJECT_STATUSES),
    color: nullableTextField(payload, "color"),
    startDate: nullableTextField(payload, "startDate"),
    dueDate: nullableTextField(payload, "dueDate")
  };
}

function taskInput(payload: JsonObject): TaskInput {
  return {
    title: requiredText(payload, "title"),
    description: nullableTextField(payload, "description"),
    status: enumField(payload, "status", TASK_STATUSES),
    priority: enumField(payload, "priority", PRIORITIES),
    assignee: nullableTextField(payload, "assignee"),
    dueDate: nullableTextField(payload, "dueDate")
  };
}

function ticketInput(payload: JsonObject): TicketInput {
  return {
    title: requiredText(payload, "title"),
    type: cleanTextField(payload, "type"),
    description: nullableTextField(payload, "description"),
    status: enumField(payload, "status", TICKET_STATUSES),
    priority: enumField(payload, "priority", PRIORITIES),
    reporter: nullableTextField(payload, "reporter"),
    assignee: nullableTextField(payload, "assignee"),
    environment: nullableTextField(payload, "environment"),
    affectedVersion: nullableTextField(payload, "affectedVersion"),
    dueDate: nullableTextField(payload, "dueDate")
  };
}

function featureInput(payload: JsonObject): FeatureInput {
  return {
    title: requiredText(payload, "title"),
    slug: requiredText(payload, "slug"),
    status: enumField(payload, "status", FEATURE_STATUSES),
    description: nullableTextField(payload, "description"),
    content: textField(payload, "content"),
    sortOrder: numberField(payload, "sortOrder")
  };
}

function useCaseInput(payload: JsonObject): UseCaseInput {
  return {
    featureId: numberField(payload, "featureId"),
    title: requiredText(payload, "title"),
    slug: requiredText(payload, "slug"),
    status: enumField(payload, "status", FEATURE_STATUSES),
    description: nullableTextField(payload, "description"),
    content: textField(payload, "content"),
    sortOrder: numberField(payload, "sortOrder")
  };
}

function wikiPageInput(payload: JsonObject): WikiPageInput {
  return {
    title: requiredText(payload, "title"),
    slug: requiredText(payload, "slug"),
    parentId: numberField(payload, "parentId") ?? null,
    projectId: numberField(payload, "projectId") ?? null,
    content: textField(payload, "content"),
    sortOrder: numberField(payload, "sortOrder")
  };
}

function backlogInput(payload: JsonObject): BacklogItemInput {
  return {
    title: requiredText(payload, "title"),
    description: nullableTextField(payload, "description"),
    featureId: numberField(payload, "featureId") ?? null,
    useCaseId: numberField(payload, "useCaseId") ?? null,
    status: enumField(payload, "status", TASK_STATUSES),
    importKey: nullableTextField(payload, "importKey"),
    sortOrder: numberField(payload, "sortOrder")
  };
}

function noteInput(payload: JsonObject): NoteInput {
  const contentJson = jsonObjectField(payload, "contentJson") ?? jsonPayload({ html: textField(payload, "html") ?? textField(payload, "content") ?? textField(payload, "body") ?? "" });
  return {
    title: textField(payload, "title"),
    contentJson
  };
}

function eventInput(payload: JsonObject): EventInput {
  return {
    title: requiredText(payload, "title"),
    description: nullableTextField(payload, "description"),
    startTime: requiredText(payload, "startTime"),
    endTime: requiredText(payload, "endTime"),
    isAllDay: booleanField(payload, "isAllDay"),
    color: nullableTextField(payload, "color"),
    owners: Array.isArray(payload.owners)
      ? payload.owners.filter(isJsonObject).map((owner) => ({
          type: requiredText(owner, "type") as "project" | "milestone" | "task",
          id: requiredNumber(owner, "id")
        }))
      : undefined
  };
}

function taskOwner(payload: JsonObject): TaskOwner {
  const type = requiredText(payload, "ownerType");
  if (type !== "project" && type !== "milestone" && type !== "feature" && type !== "useCase") {
    throw badRequest("Invalid task owner type");
  }
  return { type, id: requiredNumber(payload, "ownerId") };
}

function ticketOwner(payload: JsonObject): TicketOwner {
  const type = requiredText(payload, "ownerType");
  if (type !== "project" && type !== "milestone" && type !== "task" && type !== "feature" && type !== "useCase") {
    throw badRequest("Invalid ticket owner type");
  }
  return { type, id: requiredNumber(payload, "ownerId") };
}

function commentOwnerType(payload: JsonObject): CommentEntityType {
  const type = requiredText(payload, "ownerType");
  if (!COMMENT_ENTITY_TYPES.includes(type as CommentEntityType)) {
    throw badRequest("Invalid comment owner type");
  }
  return type as CommentEntityType;
}

function resultFromEntity(action: AiAgentAction, entityType: string | null, entityId: number | null, message: string): AiAgentActionResult {
  return {
    type: action.type,
    label: action.label,
    success: true,
    entityType,
    entityId,
    message
  };
}

function actionPrompt(prompt: string): AiChatMessage[] {
  return [
    {
      role: "system",
      content: `Du bist ein lokaler App-Agent für den Projekt Manager. Gib ausschließlich JSON zurück. Plane nur erlaubte fachliche Create- und Relation-Aktionen. Niemals Updates, Deletes, Unlinks, Dateiaktionen, Imports, Backups oder Restore. Verwende diese Action-Typen:\n${actionCatalog}\n\nAntwortformat: {"message":"kurz","actions":[{"type":"createTask","label":"...","description":"...","payload":{}}],"blockers":[]}. Nutze Namen wie projectName, featureTitle, taskTitle, ticketTitle oder tagNames, wenn der Nutzer Namen nennt. Erfinde keine IDs.`
    },
    {
      role: "user",
      content: prompt
    }
  ];
}

export async function assistText(client: AiLocalModelClient, appConfig: Pick<AppConfig, "aiDefaultModel" | "aiMaxInputChars">, input: AiTextAssistRequest): Promise<AiTextAssistResponse> {
  if (!AI_TEXT_OPERATIONS.includes(input.operation)) {
    throw badRequest("Unsupported AI text operation");
  }

  const html = ensurePromptSize(input.html, appConfig);
  const plainText = htmlToPlainText(html);
  const model = selectedModel(input.model, appConfig);
  const instruction = input.instruction?.trim() ?? "";
  const operationInstruction =
    input.operation === "rewrite"
      ? "Formuliere den Text besser, präzise und in natürlichem Deutsch. Behalte Bedeutung und fachliche Fakten bei."
      : "Strukturiere den Text als gut lesbaren HTML-Absatz oder kurze HTML-Absätze. Nutze nur p, ul, ol, li, strong und em, wenn sinnvoll.";

  const response = await client.chatJson(model, [
    {
      role: "system",
      content: "Du bist eine lokale Textassistenz. Gib ausschließlich JSON im Format {\"html\":\"...\"} zurück. Keine Erklärungen."
    },
    {
      role: "user",
      content: `${operationInstruction}\nZusatzanweisung: ${instruction || "Keine"}\n\nAktueller HTML-Text:\n${html}\n\nPlaintext zur Orientierung:\n${plainText}`
    }
  ]);

  if (!isObject(response) || typeof response.html !== "string") {
    throw internalError("AI text response did not contain HTML");
  }

  return { model, html: response.html };
}

export async function planAgentActions(database: DbClient, client: AiLocalModelClient, appConfig: Pick<AppConfig, "aiDefaultModel" | "aiMaxInputChars">, input: AiAgentPlanRequest): Promise<AiAgentPlanResponse> {
  const prompt = ensurePromptSize(input.prompt, appConfig);
  const model = selectedModel(input.model, appConfig);
  const raw = rawActionsFromModel(await client.chatJson(model, actionPrompt(prompt)));
  const blockers = [...raw.blockers];
  const actions = raw.actions.map((action) => withResolvedPayload(database, action, blockers));

  if (raw.actions.length === 0 && blockers.length === 0) {
    blockers.push("Die KI hat keine ausführbare fachliche Aktion erkannt.");
  }

  return {
    status: blockers.length > 0 ? "blocked" : "ready",
    model,
    message: raw.message,
    actions: blockers.length > 0 ? [] : actions,
    blockers
  };
}

export function executeAgentActions(database: DbClient, input: AiAgentExecuteRequest): AiAgentExecuteResponse {
  if (!Array.isArray(input.actions) || input.actions.length === 0) {
    throw badRequest("At least one confirmed AI action is required");
  }

  const results = input.actions.map((action) => executeAction(database, action));
  return {
    message: `${results.length} Aktion(en) ausgeführt.`,
    results
  };
}

function executeAction(database: DbClient, action: AiAgentAction): AiAgentActionResult {
  if (!AI_AGENT_ACTION_TYPES.includes(action.type)) {
    throw badRequest("Unsupported AI action type");
  }
  if (action.requiresConfirmation !== true) {
    throw badRequest("AI action requires explicit confirmation");
  }

  const payload = action.payload;

  if (action.type === "createProject") {
    const created = createProject(database, projectInput(payload));
    return resultFromEntity(action, "project", created.id, `Projekt "${created.name}" wurde angelegt.`);
  }
  if (action.type === "createMilestone") {
    const created = createMilestone(database, milestoneInput(payload));
    return resultFromEntity(action, "milestone", created.id, `Meilenstein "${created.name}" wurde angelegt.`);
  }
  if (action.type === "createTask") {
    const created = createOwnerTask(database, taskOwner(payload), taskInput(payload));
    return resultFromEntity(action, "task", created.id, `Aufgabe "${created.title}" wurde angelegt.`);
  }
  if (action.type === "createSubtask") {
    const created = createSubtask(database, requiredNumber(payload, "parentTaskId"), taskInput(payload));
    return resultFromEntity(action, "task", created.id, `Subtask "${created.title}" wurde angelegt.`);
  }
  if (action.type === "createTicket") {
    const ownerType = textField(payload, "ownerType");
    const created = ownerType ? createOwnerTicket(database, ticketOwner(payload), ticketInput(payload)) : createTicket(database, ticketInput(payload));
    return resultFromEntity(action, "ticket", created.id, `Ticket "${created.title}" wurde angelegt.`);
  }
  if (action.type === "createSubTicket") {
    const created = createSubTicket(database, requiredNumber(payload, "parentTicketId"), ticketInput(payload));
    return resultFromEntity(action, "ticket", created.id, `Sub-Ticket "${created.title}" wurde angelegt.`);
  }
  if (action.type === "createFeature") {
    const created = createFeature(database, featureInput(payload));
    return resultFromEntity(action, "feature", created.id, `Feature "${created.title}" wurde angelegt.`);
  }
  if (action.type === "createUseCase") {
    const featureId = requiredNumber(payload, "featureId");
    const created = createUseCase(database, featureId, useCaseInput(payload));
    return resultFromEntity(action, "useCase", created.id, `Use Case "${created.title}" wurde angelegt.`);
  }
  if (action.type === "createWikiPage") {
    const created = createWikiPage(database, wikiPageInput(payload));
    return resultFromEntity(action, "wikiPage", created.id, `Wiki-Seite "${created.title}" wurde angelegt.`);
  }
  if (action.type === "createBacklogItem") {
    const created = createBacklogItem(database, requiredNumber(payload, "projectId"), backlogInput(payload));
    return resultFromEntity(action, "backlogItem", created.id, `Backlog-Eintrag "${created.title}" wurde angelegt.`);
  }
  if (action.type === "createComment") {
    const created = createEntityComment(database, commentOwnerType(payload), requiredNumber(payload, "ownerId"), { body: requiredText(payload, "body") });
    return resultFromEntity(action, "comment", created.id, "Kommentar wurde angelegt.");
  }
  if (action.type === "createNote") {
    const ownerType = requiredText(payload, "ownerType");
    const ownerId = requiredNumber(payload, "ownerId");
    const input = noteInput(payload);
    const created =
      ownerType === "project"
        ? createProjectNote(database, ownerId, input)
        : ownerType === "task"
          ? createTaskNote(database, ownerId, input)
          : ownerType === "milestone"
            ? createMilestoneNote(database, ownerId, input)
            : ownerType === "ticket"
              ? createTicketNote(database, ownerId, input)
              : undefined;
    if (!created) {
      throw badRequest("Invalid note owner type");
    }
    return resultFromEntity(action, "note", created.id, `Notiz "${created.title}" wurde angelegt.`);
  }
  if (action.type === "createTag") {
    const created = createTag(database, { name: requiredText(payload, "name"), color: textField(payload, "color") });
    return resultFromEntity(action, "tag", created.id, `Tag "${created.name}" wurde angelegt.`);
  }
  if (action.type === "createEvent") {
    const created = createEvent(database, eventInput(payload));
    return resultFromEntity(action, "event", created.id, `Kalendereintrag "${created.title}" wurde angelegt.`);
  }
  if (action.type === "setProjectFeatures") {
    setProjectFeatures(database, requiredNumber(payload, "projectId"), numberArrayField(payload, "featureIds") ?? []);
    return resultFromEntity(action, "project", requiredNumber(payload, "projectId"), "Projekt-Features wurden gesetzt.");
  }
  if (action.type === "setMilestoneFeatures") {
    setMilestoneFeatures(database, requiredNumber(payload, "milestoneId"), numberArrayField(payload, "featureIds") ?? []);
    return resultFromEntity(action, "milestone", requiredNumber(payload, "milestoneId"), "Meilenstein-Features wurden gesetzt.");
  }
  if (action.type === "setFeatureRelations") {
    const relations = Array.isArray(payload.relations) ? payload.relations.filter(isJsonObject).map(featureRelationInput) : [];
    setFeatureRelations(database, requiredNumber(payload, "featureId"), relations);
    return resultFromEntity(action, "feature", requiredNumber(payload, "featureId"), "Feature-Relationen wurden gesetzt.");
  }
  if (action.type === "linkOwnerTask") {
    const linked = linkOwnerTask(database, taskOwner(payload), requiredNumber(payload, "taskId"));
    return resultFromEntity(action, "task", linked.id, `Aufgabe "${linked.title}" wurde verknüpft.`);
  }
  if (action.type === "linkOwnerTicket") {
    const linked = linkOwnerTicket(database, ticketOwner(payload), requiredNumber(payload, "ticketId"));
    return resultFromEntity(action, "ticket", linked.id, `Ticket "${linked.title}" wurde verknüpft.`);
  }
  if (action.type === "addTicketRelation") {
    addTicketRelation(database, requiredNumber(payload, "ticketId"), {
      targetTicketId: requiredNumber(payload, "targetTicketId"),
      relationType: enumField(payload, "relationType", TICKET_RELATION_TYPES) ?? "related"
    });
    return resultFromEntity(action, "ticket", requiredNumber(payload, "ticketId"), "Ticket-Relation wurde hinzugefügt.");
  }
  if (action.type === "setProjectTags") {
    setProjectTags(database, requiredNumber(payload, "projectId"), numberArrayField(payload, "tagIds") ?? []);
    return resultFromEntity(action, "project", requiredNumber(payload, "projectId"), "Projekt-Tags wurden gesetzt.");
  }
  if (action.type === "setMilestoneTags") {
    setMilestoneTags(database, requiredNumber(payload, "milestoneId"), numberArrayField(payload, "tagIds") ?? []);
    return resultFromEntity(action, "milestone", requiredNumber(payload, "milestoneId"), "Meilenstein-Tags wurden gesetzt.");
  }
  if (action.type === "setTaskTags") {
    setTaskTags(database, requiredNumber(payload, "taskId"), numberArrayField(payload, "tagIds") ?? []);
    return resultFromEntity(action, "task", requiredNumber(payload, "taskId"), "Aufgaben-Tags wurden gesetzt.");
  }

  setTicketTags(database, requiredNumber(payload, "ticketId"), numberArrayField(payload, "tagIds") ?? []);
  return resultFromEntity(action, "ticket", requiredNumber(payload, "ticketId"), "Ticket-Tags wurden gesetzt.");
}

function featureRelationInput(payload: JsonObject): FeatureRelationInput {
  return {
    targetFeatureId: requiredNumber(payload, "targetFeatureId"),
    relationType: enumField(payload, "relationType", FEATURE_RELATION_TYPES),
    description: nullableTextField(payload, "description")
  };
}

export type { AiLocalModelClient };
