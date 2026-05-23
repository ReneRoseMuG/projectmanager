import type {
  CatalogEntry,
  Comment,
  Feature,
  FeatureInput,
  Milestone,
  Note,
  Project,
  Task,
  TaskInput,
  Ticket,
  TicketInput,
  UseCase,
  UseCaseInput,
  UserOption
} from "@taskmanager/shared-types";
import { z } from "zod";
import type { ProjectManagerApiClient } from "./api-client.js";
import { plainTextDocument } from "./rich-text.js";

export type ParentType = "project" | "milestone";
export type ExtendedParentType = ParentType | "task" | "feature" | "useCase" | "ticket";

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
const descriptionUpdateSchema = z.object({
  id: z.number().int().positive(),
  description: z.string().nullable()
});
const contentUpdateSchema = z.object({
  id: z.number().int().positive(),
  description: z.string().nullable().optional(),
  content: z.string().optional()
});
const featureCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  content: z.string().optional(),
  status: z.string().min(1).optional(),
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

function extendedOwnerPath(parentType: ExtendedParentType, parentId: number): string {
  if (parentType === "useCase") {
    return `use-cases/${parentId}`;
  }
  return `${parentType}s/${parentId}`;
}

function withoutParent<T extends { parentType: string; parentId: number }>(input: T): Omit<T, "parentType" | "parentId"> {
  const { parentType: _parentType, parentId: _parentId, ...body } = input;
  return body;
}

async function updateVersionedDescription<T extends { version: number }>(
  client: ProjectManagerApiClient,
  detailPath: string,
  updatePath: string,
  description: string | null
): Promise<T> {
  const current = await client.get<T>(detailPath);
  return client.patch<T>(updatePath, { description, expectedVersion: current.version });
}

async function updateVersionedContent<T extends { version: number }>(
  client: ProjectManagerApiClient,
  detailPath: string,
  updatePath: string,
  input: z.infer<typeof contentUpdateSchema>
): Promise<T> {
  const current = await client.get<T>(detailPath);
  return client.patch<T>(updatePath, { description: input.description, content: input.content, expectedVersion: current.version });
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
      name: "add_task_to_parent",
      title: "Aufgabe hinzufügen",
      description: "Legt eine normale Aufgabe an einem Projekt oder Meilenstein an und befüllt die Stammdatenfelder.",
      inputSchema: taskInputSchema,
      execute: (input) => client.post<Task>(`${ownerPath(input.parentType, input.parentId)}/tasks`, withoutParent(input) satisfies TaskInput)
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
      name: "update_project_description",
      title: "Projektbeschreibung überarbeiten",
      description: "Aktualisiert die Projektbeschreibung versionsgeschützt.",
      inputSchema: descriptionUpdateSchema,
      execute: ({ id, description }) => updateVersionedDescription<Project>(client, `projects/${id}`, `projects/${id}`, description)
    }),
    defineTool({
      name: "update_milestone_description",
      title: "Meilensteinbeschreibung überarbeiten",
      description: "Aktualisiert die Meilensteinbeschreibung versionsgeschützt.",
      inputSchema: descriptionUpdateSchema,
      execute: ({ id, description }) => updateVersionedDescription<Milestone>(client, `milestones/${id}`, `milestones/${id}`, description)
    }),
    defineTool({
      name: "update_task_description",
      title: "Aufgabenbeschreibung überarbeiten",
      description: "Aktualisiert die Aufgabenbeschreibung versionsgeschützt.",
      inputSchema: descriptionUpdateSchema,
      execute: ({ id, description }) => updateVersionedDescription<Task>(client, `tasks/${id}`, `tasks/${id}`, description)
    }),
    defineTool({
      name: "update_ticket_description",
      title: "Ticketbeschreibung überarbeiten",
      description: "Aktualisiert die Ticketbeschreibung versionsgeschützt.",
      inputSchema: descriptionUpdateSchema,
      execute: ({ id, description }) => updateVersionedDescription<Ticket>(client, `tickets/${id}`, `tickets/${id}`, description)
    }),
    defineTool({
      name: "create_feature",
      title: "Feature erstellen",
      description: "Erstellt ein neues Feature mit Beschreibung und optionalem Content.",
      inputSchema: featureCreateSchema,
      execute: (input) => client.post<Feature>("features", input satisfies FeatureInput)
    }),
    defineTool({
      name: "update_feature_content",
      title: "Feature-Inhalt überarbeiten",
      description: "Aktualisiert Feature-Beschreibung und/oder Feature-Content versionsgeschützt.",
      inputSchema: contentUpdateSchema,
      execute: (input) => updateVersionedContent<Feature>(client, `features/${input.id}`, `features/${input.id}`, input)
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
      name: "update_use_case_content",
      title: "Use-Case-Inhalt überarbeiten",
      description: "Aktualisiert Use-Case-Beschreibung und/oder Use-Case-Content versionsgeschützt.",
      inputSchema: contentUpdateSchema,
      execute: (input) => updateVersionedContent<UseCase>(client, `use-cases/${input.id}`, `use-cases/${input.id}`, input)
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
