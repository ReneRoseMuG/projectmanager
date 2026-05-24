import { TICKET_RESOLUTIONS } from "@taskmanager/shared-types";
import type {
  Attachment,
  CatalogEntry,
  Comment,
  Feature,
  FeatureInput,
  FeatureUpdate,
  Milestone,
  MilestoneInput,
  MilestoneUpdate,
  Note,
  Project,
  ProjectInput,
  ProjectUpdate,
  Task,
  TaskInput,
  TaskUpdate,
  Ticket,
  TicketInput,
  TicketUpdate,
  UseCase,
  UseCaseInput,
  UseCaseUpdate,
  UserOption
} from "@taskmanager/shared-types";
import { z } from "zod";
import type { ProjectManagerApiClient } from "./api-client.js";
import { plainTextDocument } from "./rich-text.js";

export type ParentType = "project" | "milestone";
export type LinkParentType = ParentType | "feature" | "useCase";
export type ExtendedParentType = ParentType | "task" | "feature" | "useCase" | "ticket";
export type AttachmentParentType = ParentType | "task" | "feature" | "ticket";

export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  execute(input: unknown): Promise<unknown>;
}

function defineTool<Schema extends z.ZodTypeAny>(definition: {
  name: string;
  title: string;
  description: string;
  inputSchema: Schema;
  execute(input: z.infer<Schema>): Promise<unknown>;
}): ToolDefinition {
  return {
    ...definition,
    execute: (input: unknown) => definition.execute(definition.inputSchema.parse(input))
  };
}

const idSchema = z.object({ id: z.number().int().positive() });
const parentSchema = z.object({
  parentType: z.enum(["project", "milestone"]),
  parentId: z.number().int().positive()
});
const linkParentSchema = z.object({
  parentType: z.enum(["project", "milestone", "feature", "useCase"]),
  parentId: z.number().int().positive()
});
const extendedParentSchema = z.object({
  parentType: z.enum(["project", "milestone", "task", "feature", "useCase", "ticket"]),
  parentId: z.number().int().positive()
});
const taskInputSchema = parentSchema.extend({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.string().min(1).optional(),
  priority: z.string().min(1).optional(),
  assignee: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional()
});
const ticketInputSchema = parentSchema.extend({
  title: z.string().min(1),
  type: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.string().min(1).optional(),
  priority: z.string().min(1).optional(),
  reporter: z.string().nullable().optional(),
  assignee: z.string().nullable().optional(),
  environment: z.string().nullable().optional(),
  affectedVersion: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional()
});
const taskLinkSchema = linkParentSchema.extend({
  taskId: z.number().int().positive()
});
const ticketLinkSchema = linkParentSchema.extend({
  ticketId: z.number().int().positive()
});
const editorialTaskSchema = parentSchema.extend({
  title: z.string().min(1),
  editorialBrief: z.string().min(1),
  status: z.string().min(1).default("todo"),
  priority: z.string().min(1).default("medium"),
  assignee: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional()
});
const commentInputSchema = extendedParentSchema.extend({ body: z.string().min(1) });
const noteInputSchema = z
  .object({
    parentType: z.enum(["project", "milestone", "task", "ticket"]),
    parentId: z.number().int().positive()
  })
  .extend({
    title: z.string().optional(),
    text: z.string().min(1)
  });
const attachmentInputSchema = z.object({
  parentType: z.enum(["project", "milestone", "task", "feature", "ticket"]),
  parentId: z.number().int().positive(),
  fileName: z.string().min(1),
  contentBase64: z.string().min(1),
  mimetype: z.string().min(1).optional()
});
const projectCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional()
});
const milestoneCreateSchema = projectCreateSchema.extend({
  projectId: z.number().int().positive()
});
const updateProjectSchema = idSchema.extend({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional()
});
const updateMilestoneSchema = idSchema.extend({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional()
});
const updateTaskSchema = idSchema.extend({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.string().min(1).optional(),
  priority: z.string().min(1).optional(),
  assignee: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional()
});
const updateTicketSchema = idSchema.extend({
  title: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.string().min(1).optional(),
  priority: z.string().min(1).optional(),
  reporter: z.string().nullable().optional(),
  assignee: z.string().nullable().optional(),
  environment: z.string().nullable().optional(),
  affectedVersion: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  resolution: z.enum(TICKET_RESOLUTIONS).nullable().optional()
});
const featureCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  content: z.string().optional(),
  status: z.string().min(1).optional(),
  sortOrder: z.number().int().optional()
});
const updateFeatureSchema = idSchema.extend({
  title: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  content: z.string().optional(),
  sortOrder: z.number().int().optional()
});
const useCaseCreateSchema = z.object({
  featureId: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  content: z.string().optional(),
  status: z.string().min(1).optional(),
  sortOrder: z.number().int().optional()
});
const updateUseCaseSchema = idSchema.extend({
  title: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  content: z.string().optional(),
  sortOrder: z.number().int().optional(),
  featureId: z.number().int().positive().optional()
});
const referenceSchema = z.object({
  reference: z.string().min(1)
});
const featureLinkSchema = parentSchema.extend({
  featureId: z.number().int().positive()
});
const useCaseChildSchema = z.object({
  useCaseId: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.string().min(1).optional(),
  priority: z.string().min(1).optional()
});

function ownerPath(parentType: ParentType, parentId: number): string {
  return parentType === "project" ? `projects/${parentId}` : `milestones/${parentId}`;
}

function linkOwnerPath(parentType: LinkParentType, parentId: number): string {
  if (parentType === "useCase") {
    return `use-cases/${parentId}`;
  }
  return `${parentType}s/${parentId}`;
}

function extendedOwnerPath(parentType: ExtendedParentType, parentId: number): string {
  if (parentType === "useCase") {
    return `use-cases/${parentId}`;
  }
  return `${parentType}s/${parentId}`;
}

function attachmentOwnerPath(parentType: AttachmentParentType, parentId: number): string {
  return `${parentType}s/${parentId}`;
}

function decodeBase64Content(contentBase64: string): Buffer {
  const normalized = contentBase64.replace(/\s+/g, "");
  const buffer = Buffer.from(normalized, "base64");
  const canonicalContent = buffer.toString("base64").replace(/=+$/, "");
  const canonicalInput = normalized.replace(/=+$/, "");
  if (buffer.length === 0 || canonicalContent !== canonicalInput) {
    throw new Error("contentBase64 must be valid base64 file content");
  }
  return buffer;
}

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);
  return arrayBuffer;
}

function attachmentFormData(input: z.infer<typeof attachmentInputSchema>): FormData {
  const formData = new FormData();
  const blob = new Blob([bufferToArrayBuffer(decodeBase64Content(input.contentBase64))], {
    type: input.mimetype ?? "application/octet-stream"
  });
  formData.append("file", blob, input.fileName);
  return formData;
}

function withoutParent<T extends { parentType: string; parentId: number }>(input: T): Omit<T, "parentType" | "parentId"> {
  const { parentType: _parentType, parentId: _parentId, ...body } = input;
  return body;
}

function withoutId<T extends { id: number }>(input: T): Omit<T, "id"> {
  const { id: _id, ...body } = input;
  return body;
}

async function updateVersioned<T extends { version: number }>(
  client: ProjectManagerApiClient,
  path: string,
  fields: object
): Promise<T> {
  const current = await client.get<T>(path);
  return client.patch<T>(path, { ...fields, expectedVersion: current.version });
}

function referencePath(reference: string): string {
  const normalized = reference.toUpperCase().trim();
  const match = normalized.match(/^(PROJ|MS|TASK|TKT|FEAT|UC)-(\d+)$/);

  if (!match) {
    throw new Error(`Ungültige Referenz "${reference}" - erwartet z. B. TASK-10`);
  }

  const id = Number.parseInt(match[2] ?? "", 10);
  switch (match[1]) {
    case "PROJ":
      return `projects/${id}`;
    case "MS":
      return `milestones/${id}`;
    case "TASK":
      return `tasks/${id}`;
    case "TKT":
      return `tickets/${id}`;
    case "FEAT":
      return `features/${id}`;
    case "UC":
      return `use-cases/${id}`;
    default:
      throw new Error(`Ungültige Referenz "${reference}" - erwartet z. B. TASK-10`);
  }
}

export function createToolDefinitions(client: ProjectManagerApiClient): ToolDefinition[] {
  return [
    defineTool({
      name: "list_projects",
      title: "Projekte listen",
      description: "Liest alle Projekte inklusive Stammdaten und Zählern.",
      inputSchema: z.object({}),
      execute: () => client.get<Project[]>("projects")
    }),
    defineTool({
      name: "get_project",
      title: "Projekt lesen",
      description: "Liest ein einzelnes Projekt mit Beschreibung, Status, Version und Tags.",
      inputSchema: idSchema,
      execute: ({ id }) => client.get<Project>(`projects/${id}`)
    }),
    defineTool({
      name: "list_milestones",
      title: "Meilensteine listen",
      description: "Liest alle Meilensteine.",
      inputSchema: z.object({ projectId: z.number().int().positive().optional() }),
      execute: ({ projectId }) => client.get<Milestone[]>(projectId ? `projects/${projectId}/milestones` : "milestones")
    }),
    defineTool({
      name: "get_milestone",
      title: "Meilenstein lesen",
      description: "Liest einen einzelnen Meilenstein mit Beschreibung, Status, Version und Tags.",
      inputSchema: idSchema,
      execute: ({ id }) => client.get<Milestone>(`milestones/${id}`)
    }),
    defineTool({
      name: "list_tasks_for_parent",
      title: "Aufgaben am Parent lesen",
      description: "Liest Aufgaben für ein Projekt oder einen Meilenstein.",
      inputSchema: parentSchema,
      execute: ({ parentType, parentId }) => client.get<Task[]>(`${ownerPath(parentType, parentId)}/tasks`)
    }),
    defineTool({
      name: "list_tickets_for_parent",
      title: "Tickets am Parent lesen",
      description: "Liest Tickets für ein Projekt oder einen Meilenstein.",
      inputSchema: parentSchema,
      execute: ({ parentType, parentId }) => client.get<Ticket[]>(`${ownerPath(parentType, parentId)}/tickets`)
    }),
    defineTool({
      name: "get_task",
      title: "Aufgabe lesen",
      description: "Liest eine einzelne Aufgabe mit aktueller Version.",
      inputSchema: idSchema,
      execute: ({ id }) => client.get<Task>(`tasks/${id}`)
    }),
    defineTool({
      name: "get_ticket",
      title: "Ticket lesen",
      description: "Liest ein einzelnes Ticket mit aktueller Version.",
      inputSchema: idSchema,
      execute: ({ id }) => client.get<Ticket>(`tickets/${id}`)
    }),
    defineTool({
      name: "list_features",
      title: "Features listen",
      description: "Liest alle Features ohne Content.",
      inputSchema: z.object({}),
      execute: () => client.get<Feature[]>("features")
    }),
    defineTool({
      name: "get_feature",
      title: "Feature lesen",
      description: "Liest ein Feature inklusive Content.",
      inputSchema: idSchema,
      execute: ({ id }) => client.get<Feature>(`features/${id}`)
    }),
    defineTool({
      name: "list_use_cases",
      title: "Use Cases listen",
      description: "Liest Use Cases eines Features.",
      inputSchema: z.object({ featureId: z.number().int().positive() }),
      execute: ({ featureId }) => client.get<UseCase[]>(`features/${featureId}/use-cases`)
    }),
    defineTool({
      name: "get_use_case",
      title: "Use Case lesen",
      description: "Liest einen Use Case inklusive Content.",
      inputSchema: idSchema,
      execute: ({ id }) => client.get<UseCase>(`use-cases/${id}`)
    }),
    defineTool({
      name: "resolve_reference",
      title: "Objekt per Referenz laden",
      description: "Lädt ein Domänenobjekt anhand seines Kurzbezeichners, z. B. TASK-10, FEAT-3 oder PROJ-1.",
      inputSchema: referenceSchema,
      execute: async ({ reference }) => client.get(referencePath(reference))
    }),
    defineTool({
      name: "list_catalogs",
      title: "Kataloge lesen",
      description: "Liest Status-, Prioritäts- und Tickettyp-Kataloge als Lookup für Schreibtools.",
      inputSchema: z.object({}),
      execute: () => client.get<CatalogEntry[]>("catalogs")
    }),
    defineTool({
      name: "list_users",
      title: "Nutzer listen",
      description: "Liest aktive Nutzeroptionen für Assignee-/Reporter-Felder.",
      inputSchema: z.object({}),
      execute: () => client.get<UserOption[]>("users")
    }),
    defineTool({
      name: "create_project",
      title: "Projekt erstellen",
      description: "Erstellt ein neues Projekt mit Stammdaten, Beschreibung, Status, Farbe und Zeitraum.",
      inputSchema: projectCreateSchema,
      execute: (input) => client.post<Project>("projects", input satisfies ProjectInput)
    }),
    defineTool({
      name: "create_milestone",
      title: "Meilenstein erstellen",
      description: "Erstellt einen neuen Meilenstein unter einem Projekt mit Stammdaten, Beschreibung, Status, Farbe und Zeitraum.",
      inputSchema: milestoneCreateSchema,
      execute: ({ projectId, ...body }) => client.post<Milestone>(`projects/${projectId}/milestones`, body satisfies Omit<MilestoneInput, "projectId">)
    }),
    defineTool({
      name: "add_task_to_parent",
      title: "Aufgabe hinzufügen",
      description: "Legt eine normale Aufgabe an einem Projekt oder Meilenstein an und befüllt die Stammdatenfelder.",
      inputSchema: taskInputSchema,
      execute: (input) => client.post<Task>(`${ownerPath(input.parentType, input.parentId)}/tasks`, withoutParent(input) satisfies TaskInput)
    }),
    defineTool({
      name: "link_task_to_parent",
      title: "Aufgabe verknüpfen",
      description: "Verknüpft eine bestehende Aufgabe mit Projekt, Meilenstein, Feature oder Use Case, ohne die Aufgabe neu anzulegen.",
      inputSchema: taskLinkSchema,
      execute: ({ parentType, parentId, taskId }) => client.post<Task>(`${linkOwnerPath(parentType, parentId)}/tasks/${taskId}`, {})
    }),
    defineTool({
      name: "assign_editorial_task",
      title: "Redaktionelle Aufgabe vergeben",
      description: "Legt eine redaktionelle Aufgabe als normale Task mit Briefing, Status, Priorität, Assignee und DueDate an.",
      inputSchema: editorialTaskSchema,
      execute: (input) =>
        client.post<Task>(`${ownerPath(input.parentType, input.parentId)}/tasks`, {
          title: input.title,
          description: input.editorialBrief,
          status: input.status,
          priority: input.priority,
          assignee: input.assignee,
          dueDate: input.dueDate
        } satisfies TaskInput)
    }),
    defineTool({
      name: "add_ticket_to_parent",
      title: "Ticket hinzufügen",
      description: "Legt ein Ticket an einem Projekt oder Meilenstein an und befüllt die Stammdatenfelder.",
      inputSchema: ticketInputSchema,
      execute: (input) => client.post<Ticket>(`${ownerPath(input.parentType, input.parentId)}/tickets`, withoutParent(input) satisfies TicketInput)
    }),
    defineTool({
      name: "link_ticket_to_parent",
      title: "Ticket verknüpfen",
      description: "Verknüpft ein bestehendes Ticket mit Projekt, Meilenstein, Feature oder Use Case, ohne das Ticket neu anzulegen.",
      inputSchema: ticketLinkSchema,
      execute: ({ parentType, parentId, ticketId }) => client.post<Ticket>(`${linkOwnerPath(parentType, parentId)}/tickets/${ticketId}`, {})
    }),
    defineTool({
      name: "add_comment_to_parent",
      title: "Kommentar hinzufügen",
      description: "Legt einen Kommentar an Projekt, Meilenstein, Task, Ticket, Feature oder Use Case an.",
      inputSchema: commentInputSchema,
      execute: (input) => client.post<Comment>(`${extendedOwnerPath(input.parentType, input.parentId)}/comments`, { body: input.body })
    }),
    defineTool({
      name: "add_note_to_parent",
      title: "Notiz hinzufügen",
      description: "Legt eine Textnotiz an Projekt, Meilenstein, Task oder Ticket an.",
      inputSchema: noteInputSchema,
      execute: (input) =>
        client.post<Note>(`${extendedOwnerPath(input.parentType, input.parentId)}/notes`, {
          title: input.title,
          contentJson: plainTextDocument(input.text)
        })
    }),
    defineTool({
      name: "add_attachment_to_parent",
      title: "Attachment hinzufügen",
      description: "Hängt eine Base64-codierte Datei an Projekt, Meilenstein, Task, Feature oder Ticket.",
      inputSchema: attachmentInputSchema,
      execute: (input) => client.postForm<Attachment>(`${attachmentOwnerPath(input.parentType, input.parentId)}/attachments`, attachmentFormData(input))
    }),
    defineTool({
      name: "update_project",
      title: "Projekt aktualisieren",
      description: "Aktualisiert Projektstammdaten und Beschreibung versionsgeschützt.",
      inputSchema: updateProjectSchema,
      execute: (input) => updateVersioned<Project>(client, `projects/${input.id}`, withoutId(input) satisfies Omit<ProjectUpdate, "expectedVersion">)
    }),
    defineTool({
      name: "update_milestone",
      title: "Meilenstein aktualisieren",
      description: "Aktualisiert Meilenstein-Stammdaten und Beschreibung versionsgeschützt.",
      inputSchema: updateMilestoneSchema,
      execute: (input) => updateVersioned<Milestone>(client, `milestones/${input.id}`, withoutId(input) satisfies Omit<MilestoneUpdate, "expectedVersion">)
    }),
    defineTool({
      name: "update_task",
      title: "Aufgabe aktualisieren",
      description: "Aktualisiert Aufgabenstammdaten und Beschreibung versionsgeschützt.",
      inputSchema: updateTaskSchema,
      execute: (input) => updateVersioned<Task>(client, `tasks/${input.id}`, withoutId(input) satisfies Omit<TaskUpdate, "expectedVersion">)
    }),
    defineTool({
      name: "update_ticket",
      title: "Ticket aktualisieren",
      description: "Aktualisiert Ticketstammdaten, Beschreibung und Lösung versionsgeschützt.",
      inputSchema: updateTicketSchema,
      execute: (input) => updateVersioned<Ticket>(client, `tickets/${input.id}`, withoutId(input) satisfies Omit<TicketUpdate, "expectedVersion">)
    }),
    defineTool({
      name: "create_feature",
      title: "Feature erstellen",
      description: "Erstellt ein neues Feature mit Beschreibung und optionalem Content.",
      inputSchema: featureCreateSchema,
      execute: (input) => client.post<Feature>("features", input satisfies FeatureInput)
    }),
    defineTool({
      name: "update_feature",
      title: "Feature aktualisieren",
      description: "Aktualisiert Feature-Stammdaten, Beschreibung und Content versionsgeschützt.",
      inputSchema: updateFeatureSchema,
      execute: (input) => updateVersioned<Feature>(client, `features/${input.id}`, withoutId(input) satisfies Omit<FeatureUpdate, "expectedVersion">)
    }),
    defineTool({
      name: "link_feature_to_parent",
      title: "Feature verknüpfen",
      description: "Verknüpft ein Feature mit Projekt oder Meilenstein, ohne bestehende Feature-Links zu entfernen.",
      inputSchema: featureLinkSchema,
      execute: async ({ parentType, parentId, featureId }) => {
        const path = `${ownerPath(parentType, parentId)}/features`;
        const current = await client.get<Feature[]>(path);
        const featureIds = Array.from(new Set([...current.map((feature) => feature.id), featureId]));
        return client.put<Feature[]>(path, { featureIds });
      }
    }),
    defineTool({
      name: "create_use_case",
      title: "Use Case erstellen",
      description: "Erstellt einen neuen Use Case unter einem Feature.",
      inputSchema: useCaseCreateSchema,
      execute: (input) => client.post<UseCase>(`features/${input.featureId}/use-cases`, input satisfies UseCaseInput)
    }),
    defineTool({
      name: "update_use_case",
      title: "Use Case aktualisieren",
      description: "Aktualisiert Use-Case-Stammdaten, Feature-Zuordnung, Beschreibung und Content versionsgeschützt.",
      inputSchema: updateUseCaseSchema,
      execute: (input) => updateVersioned<UseCase>(client, `use-cases/${input.id}`, withoutId(input) satisfies Omit<UseCaseUpdate, "expectedVersion">)
    }),
    defineTool({
      name: "add_task_to_use_case",
      title: "Use-Case-Aufgabe hinzufügen",
      description: "Legt eine Aufgabe an einem Use Case an.",
      inputSchema: useCaseChildSchema,
      execute: ({ useCaseId, ...body }) => client.post<Task>(`use-cases/${useCaseId}/tasks`, body satisfies TaskInput)
    }),
    defineTool({
      name: "add_ticket_to_use_case",
      title: "Use-Case-Ticket hinzufügen",
      description: "Legt ein Ticket an einem Use Case an.",
      inputSchema: useCaseChildSchema,
      execute: ({ useCaseId, ...body }) => client.post<Ticket>(`use-cases/${useCaseId}/tickets`, body satisfies TicketInput)
    })
  ];
}
