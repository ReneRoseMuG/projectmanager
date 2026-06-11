import { TICKET_RESOLUTIONS } from "@taskmanager/shared-types";
import type {
  Attachment,
  BacklogItem,
  BacklogItemInput,
  BacklogItemUpdate,
  CatalogEntry,
  Comment,
  Feature,
  FeatureInput,
  FeatureUpdate,
  JournalContextRelation,
  JournalEntry,
  JournalListResponse,
  JournalObjectType,
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
  UserOption,
  VisibleParentContext
} from "@taskmanager/shared-types";
import { z } from "zod";
import { ProjectManagerApiError, type ProjectManagerApiClient } from "./api-client.js";
import { buildReferenceContext, type ReferenceContext, type ReferenceContextNode } from "./reference-context.js";
import { htmlDocument, textToHtml } from "./rich-text.js";
import { buildWorkDossier } from "./work-dossier.js";

export type ParentType = "project" | "milestone";
export type LinkParentType = ParentType | "feature" | "useCase";
export type ExtendedParentType = ParentType | "task" | "feature" | "useCase" | "ticket";
export type AttachmentParentType = ParentType | "task" | "feature" | "ticket";
export type TaskCreateParentType = ParentType | "feature" | "useCase";
export type TicketCreateParentType = ParentType | "task" | "feature" | "useCase";

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
const taskCreateParentSchema = z.object({
  parentType: z.enum(["project", "milestone", "feature", "useCase"]),
  parentId: z.number().int().positive()
});
const ticketCreateParentSchema = z.object({
  parentType: z.enum(["project", "milestone", "task", "feature", "useCase"]),
  parentId: z.number().int().positive()
});
const ticketListParentSchema = z.object({
  parentType: z.enum(["project", "milestone", "task", "feature", "useCase"]),
  parentId: z.number().int().positive()
});
const attachmentFileSchema = z.object({
  fileName: z.string().min(1),
  contentBase64: z.string().min(1),
  mimetype: z.string().min(1).optional()
});
const taskInputSchema = parentSchema.extend({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.string().min(1).optional(),
  priority: z.string().min(1).optional(),
  responsibleUserId: z.number().int().positive().nullable().optional(),
  dueDate: z.string().nullable().optional()
});
const ticketInputSchema = parentSchema.extend({
  title: z.string().min(1),
  type: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.string().min(1).optional(),
  priority: z.string().min(1).optional(),
  reporterUserId: z.number().int().positive().nullable().optional(),
  responsibleUserId: z.number().int().positive().nullable().optional(),
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
  responsibleUserId: z.number().int().positive().nullable().optional(),
  dueDate: z.string().nullable().optional()
});
const commentInputSchema = extendedParentSchema.extend({ body: z.string().min(1) });
const commentListInputSchema = extendedParentSchema.extend({
  comments: z.array(z.object({ body: z.string().min(1) })).min(1)
});
const noteInputSchema = z
  .object({
    parentType: z.enum(["project", "milestone", "task", "ticket"]),
    parentId: z.number().int().positive()
  })
  .extend({
    title: z.string().optional(),
    text: z.string().min(1)
  });
const noteListInputSchema = z
  .object({
    parentType: z.enum(["project", "milestone", "task", "ticket"]),
    parentId: z.number().int().positive()
  })
  .extend({
    notes: z.array(noteInputSchema.omit({ parentType: true, parentId: true })).min(1)
  });
const attachmentInputSchema = z
  .object({
    parentType: z.enum(["project", "milestone", "task", "feature", "ticket"]),
    parentId: z.number().int().positive()
  })
  .merge(attachmentFileSchema);
const attachmentListInputSchema = z.object({
  parentType: z.enum(["project", "milestone", "task", "feature", "ticket"]),
  parentId: z.number().int().positive(),
  attachments: z.array(attachmentFileSchema).min(1)
});
const taskListInputSchema = taskCreateParentSchema.extend({
  tasks: z.array(taskInputSchema.omit({ parentType: true, parentId: true }).extend({ attachment: attachmentFileSchema.optional() })).min(1)
});
const ticketListInputSchema = ticketCreateParentSchema.extend({
  tickets: z.array(ticketInputSchema.omit({ parentType: true, parentId: true }).extend({ attachment: attachmentFileSchema.optional() })).min(1)
});
const projectCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  responsibleUserId: z.number().int().positive().nullable().optional()
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
  dueDate: z.string().nullable().optional(),
  responsibleUserId: z.number().int().positive().nullable().optional()
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
  responsibleUserId: z.number().int().positive().nullable().optional(),
  dueDate: z.string().nullable().optional()
});
const updateTicketSchema = idSchema.extend({
  title: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.string().min(1).optional(),
  priority: z.string().min(1).optional(),
  reporterUserId: z.number().int().positive().nullable().optional(),
  responsibleUserId: z.number().int().positive().nullable().optional(),
  environment: z.string().nullable().optional(),
  affectedVersion: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  resolution: z.enum(TICKET_RESOLUTIONS).nullable().optional()
});
const featureCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional().describe("Zusammenfassung des redaktionellen Feature-Inhalts."),
  content: z.string().optional().describe("Redaktioneller Hauptinhalt des Features."),
  status: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
  responsibleUserId: z.number().int().positive().nullable().optional()
});
const updateFeatureSchema = idSchema.extend({
  title: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  description: z.string().nullable().optional().describe("Zusammenfassung des redaktionellen Feature-Inhalts."),
  content: z.string().optional().describe("Redaktioneller Hauptinhalt des Features."),
  sortOrder: z.number().int().optional(),
  responsibleUserId: z.number().int().positive().nullable().optional()
});
const useCaseCreateSchema = z.object({
  featureId: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  content: z.string().optional(),
  status: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
  responsibleUserId: z.number().int().positive().nullable().optional()
});
const updateUseCaseSchema = idSchema.extend({
  title: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  content: z.string().optional(),
  sortOrder: z.number().int().optional(),
  responsibleUserId: z.number().int().positive().nullable().optional(),
  featureId: z.number().int().positive().optional()
});
const backlogCreateSchema = z.object({
  projectId: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.string().min(1).optional(),
  importKey: z.string().nullable().optional(),
  featureId: z.number().int().positive().nullable().optional(),
  useCaseId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().optional(),
  responsibleUserId: z.number().int().positive().nullable().optional()
});
const updateBacklogSchema = idSchema.extend({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.string().min(1).optional(),
  importKey: z.string().nullable().optional(),
  featureId: z.number().int().positive().nullable().optional(),
  useCaseId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().optional(),
  responsibleUserId: z.number().int().positive().nullable().optional()
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
  priority: z.string().min(1).optional(),
  responsibleUserId: z.number().int().positive().nullable().optional()
});

function ownerPath(parentType: ParentType, parentId: number): string {
  return parentType === "project" ? `projects/${parentId}` : `milestones/${parentId}`;
}

function taskCreateOwnerPath(parentType: TaskCreateParentType, parentId: number): string {
  return linkOwnerPath(parentType, parentId);
}

function ticketCreateOwnerPath(parentType: TicketCreateParentType, parentId: number): string {
  return extendedOwnerPath(parentType, parentId);
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

function attachmentFileFormData(input: z.infer<typeof attachmentFileSchema>): FormData {
  const formData = new FormData();
  const blob = new Blob([bufferToArrayBuffer(decodeBase64Content(input.contentBase64))], {
    type: input.mimetype ?? "application/octet-stream"
  });
  formData.append("file", blob, input.fileName);
  return formData;
}

function attachmentFormData(input: z.infer<typeof attachmentInputSchema>): FormData {
  return attachmentFileFormData(input);
}

function withoutParent<T extends { parentType: string; parentId: number }>(input: T): Omit<T, "parentType" | "parentId"> {
  const { parentType: _parentType, parentId: _parentId, ...body } = input;
  return body;
}

type DescriptionPayload = { description?: string | null };

function withHtmlDescription<T extends DescriptionPayload>(input: T): T {
  if (input.description === undefined) {
    return input;
  }
  return { ...input, description: textToHtml(input.description) } as T;
}

function withoutParentWithHtmlDescription<T extends { parentType: string; parentId: number } & DescriptionPayload>(input: T): Omit<T, "parentType" | "parentId"> {
  return withHtmlDescription(withoutParent(input) as Omit<T, "parentType" | "parentId"> & DescriptionPayload) as Omit<T, "parentType" | "parentId">;
}

function withoutIdWithHtmlDescription<T extends { id: number } & DescriptionPayload>(input: T): Omit<T, "id"> {
  return withHtmlDescription(withoutId(input) as Omit<T, "id"> & DescriptionPayload) as Omit<T, "id">;
}

function withoutAttachment<T extends { attachment?: unknown }>(input: T): Omit<T, "attachment"> {
  const { attachment: _attachment, ...body } = input;
  return body;
}

function withoutAttachmentWithHtmlDescription<T extends { attachment?: unknown } & DescriptionPayload>(input: T): Omit<T, "attachment"> {
  return withHtmlDescription(withoutAttachment(input) as Omit<T, "attachment"> & DescriptionPayload) as Omit<T, "attachment">;
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

interface BulkFailure {
  index: number;
  stage: "create" | "attachment";
  message: string;
  code?: string;
  statusCode?: number;
}

interface BulkCreated<Result> {
  index: number;
  result: Result;
}

interface BulkToolResult<Result> {
  requested: number;
  createdCount: number;
  errorCount: number;
  created: Array<BulkCreated<Result>>;
  errors: BulkFailure[];
}

function bulkFailure(index: number, stage: BulkFailure["stage"], error: unknown): BulkFailure {
  const failure: BulkFailure = {
    index,
    stage,
    message: error instanceof Error ? error.message : String(error)
  };
  if (error instanceof ProjectManagerApiError) {
    failure.code = error.code;
    failure.statusCode = error.statusCode;
  }
  return failure;
}

function bulkResult<Result>(requested: number, created: Array<BulkCreated<Result>>, errors: BulkFailure[]): BulkToolResult<Result> {
  return {
    requested,
    createdCount: created.length,
    errorCount: errors.length,
    created,
    errors
  };
}

async function uploadAttachmentFile(
  client: ProjectManagerApiClient,
  parentType: AttachmentParentType,
  parentId: number,
  attachment: z.infer<typeof attachmentFileSchema>
): Promise<Attachment> {
  return client.postForm<Attachment>(`${attachmentOwnerPath(parentType, parentId)}/attachments`, attachmentFileFormData(attachment));
}

async function createNotesBulk(client: ProjectManagerApiClient, input: z.infer<typeof noteListInputSchema>): Promise<BulkToolResult<Note>> {
  const created: Array<BulkCreated<Note>> = [];
  const errors: BulkFailure[] = [];
  for (const [index, note] of input.notes.entries()) {
    try {
      created.push({
        index,
        result: await client.post<Note>(`${extendedOwnerPath(input.parentType, input.parentId)}/notes`, {
          title: note.title,
          contentJson: htmlDocument(note.text)
        })
      });
    } catch (error) {
      errors.push(bulkFailure(index, "create", error));
    }
  }
  return bulkResult(input.notes.length, created, errors);
}

async function createCommentsBulk(client: ProjectManagerApiClient, input: z.infer<typeof commentListInputSchema>): Promise<BulkToolResult<Comment>> {
  const created: Array<BulkCreated<Comment>> = [];
  const errors: BulkFailure[] = [];
  for (const [index, comment] of input.comments.entries()) {
    try {
      created.push({
        index,
        result: await client.post<Comment>(`${extendedOwnerPath(input.parentType, input.parentId)}/comments`, { body: textToHtml(comment.body) ?? "" })
      });
    } catch (error) {
      errors.push(bulkFailure(index, "create", error));
    }
  }
  return bulkResult(input.comments.length, created, errors);
}

async function createAttachmentsBulk(client: ProjectManagerApiClient, input: z.infer<typeof attachmentListInputSchema>): Promise<BulkToolResult<Attachment>> {
  const created: Array<BulkCreated<Attachment>> = [];
  const errors: BulkFailure[] = [];
  for (const [index, attachment] of input.attachments.entries()) {
    try {
      created.push({
        index,
        result: await uploadAttachmentFile(client, input.parentType, input.parentId, attachment)
      });
    } catch (error) {
      errors.push(bulkFailure(index, "attachment", error));
    }
  }
  return bulkResult(input.attachments.length, created, errors);
}

async function createTasksBulk(
  client: ProjectManagerApiClient,
  input: z.infer<typeof taskListInputSchema>
): Promise<BulkToolResult<{ task: Task; attachment?: Attachment }>> {
  const created: Array<BulkCreated<{ task: Task; attachment?: Attachment }>> = [];
  const errors: BulkFailure[] = [];
  const path = `${taskCreateOwnerPath(input.parentType, input.parentId)}/tasks`;
  for (const [index, task] of input.tasks.entries()) {
    if (task.attachment) {
      try {
        decodeBase64Content(task.attachment.contentBase64);
      } catch (error) {
        errors.push(bulkFailure(index, "attachment", error));
        continue;
      }
    }

    try {
      const createdTask = await client.post<Task>(path, withoutAttachmentWithHtmlDescription(task) satisfies TaskInput);
      const result: { task: Task; attachment?: Attachment } = { task: createdTask };
      if (task.attachment) {
        try {
          result.attachment = await uploadAttachmentFile(client, "task", createdTask.id, task.attachment);
        } catch (error) {
          errors.push(bulkFailure(index, "attachment", error));
        }
      }
      created.push({ index, result });
    } catch (error) {
      errors.push(bulkFailure(index, "create", error));
    }
  }
  return bulkResult(input.tasks.length, created, errors);
}

async function createTicketsBulk(
  client: ProjectManagerApiClient,
  input: z.infer<typeof ticketListInputSchema>
): Promise<BulkToolResult<{ ticket: Ticket; attachment?: Attachment }>> {
  const created: Array<BulkCreated<{ ticket: Ticket; attachment?: Attachment }>> = [];
  const errors: BulkFailure[] = [];
  const path = `${ticketCreateOwnerPath(input.parentType, input.parentId)}/tickets`;
  for (const [index, ticket] of input.tickets.entries()) {
    if (ticket.attachment) {
      try {
        decodeBase64Content(ticket.attachment.contentBase64);
      } catch (error) {
        errors.push(bulkFailure(index, "attachment", error));
        continue;
      }
    }

    try {
      const createdTicket = await client.post<Ticket>(path, withoutAttachmentWithHtmlDescription(ticket) satisfies TicketInput);
      const result: { ticket: Ticket; attachment?: Attachment } = { ticket: createdTicket };
      if (ticket.attachment) {
        try {
          result.attachment = await uploadAttachmentFile(client, "ticket", createdTicket.id, ticket.attachment);
        } catch (error) {
          errors.push(bulkFailure(index, "attachment", error));
        }
      }
      created.push({ index, result });
    } catch (error) {
      errors.push(bulkFailure(index, "create", error));
    }
  }
  return bulkResult(input.tickets.length, created, errors);
}

interface DeletionImpact {
  milestones: number;
  features: number;
  useCases: number;
  tasks: number;
  tickets: number;
  notes: number;
  comments: number;
  attachments: number;
  total: number;
}

function countNodeByType(impact: DeletionImpact, type: ReferenceContextNode["type"]): void {
  switch (type) {
    case "milestone":
      impact.milestones += 1;
      break;
    case "feature":
      impact.features += 1;
      break;
    case "useCase":
      impact.useCases += 1;
      break;
    case "task":
      impact.tasks += 1;
      break;
    case "ticket":
      impact.tickets += 1;
      break;
    case "project":
      break;
  }
}

function addSupportCounts(impact: DeletionImpact, node: ReferenceContextNode): void {
  impact.notes += node.support.notes.length;
  impact.comments += node.support.comments.length;
  impact.attachments += node.support.attachments.length;
}

function summarizeDeletionImpact(context: ReferenceContext): DeletionImpact {
  const impact: DeletionImpact = {
    milestones: 0,
    features: 0,
    useCases: 0,
    tasks: 0,
    tickets: 0,
    notes: 0,
    comments: 0,
    attachments: 0,
    total: 0
  };
  const counted = new Set<string>();

  const walkChildren = (node: ReferenceContextNode): void => {
    const groups = [node.children.milestones, node.children.features, node.children.useCases, node.children.tasks, node.children.tickets];
    for (const group of groups) {
      for (const child of group) {
        const key = `${child.type}:${child.id}`;
        if (child.alreadyVisited || counted.has(key)) {
          continue;
        }
        counted.add(key);
        countNodeByType(impact, child.type);
        impact.total += 1;
        addSupportCounts(impact, child);
        walkChildren(child);
      }
    }
  };

  addSupportCounts(impact, context.root);
  walkChildren(context.root);
  return impact;
}

interface ReportGroup<Item> {
  context: VisibleParentContext | null;
  itemCount: number;
  items: Item[];
}

function groupByParentContexts<Row extends { parentContexts?: VisibleParentContext[] }, Item>(rows: Row[], toItem: (row: Row) => Item): ReportGroup<Item>[] {
  const groups = new Map<string, ReportGroup<Item>>();
  const order: string[] = [];
  const ensure = (key: string, context: VisibleParentContext | null): ReportGroup<Item> => {
    let group = groups.get(key);
    if (!group) {
      group = { context, itemCount: 0, items: [] };
      groups.set(key, group);
      order.push(key);
    }
    return group;
  };
  for (const row of rows) {
    const contexts = row.parentContexts ?? [];
    if (contexts.length === 0) {
      ensure("none", null).items.push(toItem(row));
      continue;
    }
    for (const context of contexts) {
      ensure(`${context.type}:${context.id}`, context).items.push(toItem(row));
    }
  }
  return order.map((key) => {
    const group = groups.get(key) as ReportGroup<Item>;
    group.itemCount = group.items.length;
    return group;
  });
}

function closedWorkStatusKeys(catalogs: CatalogEntry[]): Set<string> {
  return new Set(catalogs.filter((entry) => entry.kind === "workStatus" && entry.isClosed).map((entry) => entry.key));
}

function taskReportItem(task: Task) {
  return {
    reference: `TASK-${task.id}`,
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    updatedAt: task.updatedAt,
    responsibleUser: task.responsibleUser?.fullName ?? null
  };
}

function ticketReportItem(ticket: Ticket) {
  return {
    reference: `TKT-${ticket.id}`,
    id: ticket.id,
    title: ticket.title,
    type: ticket.type,
    status: ticket.status,
    priority: ticket.priority,
    dueDate: ticket.dueDate,
    updatedAt: ticket.updatedAt,
    responsibleUser: ticket.responsibleUser?.fullName ?? null
  };
}

interface ActivityContext {
  type: JournalObjectType;
  id: number;
  label: string;
}

function primaryActivityContext(entry: JournalEntry): ActivityContext {
  const byRelation = (relation: JournalContextRelation): JournalEntry["contexts"][number] | undefined =>
    entry.contexts.find((context) => context.relation === relation);
  const chosen = byRelation("parent") ?? byRelation("owner") ?? byRelation("self") ?? entry.contexts[0];
  if (chosen) {
    return { type: chosen.objectType, id: chosen.objectId, label: chosen.objectLabel };
  }
  return { type: entry.objectType, id: entry.objectId, label: entry.objectLabel };
}

function groupActivityByContext(entries: JournalEntry[]) {
  const groups = new Map<string, { context: ActivityContext; entryCount: number; entries: Array<ReturnType<typeof activityEntryItem>> }>();
  const order: string[] = [];
  for (const entry of entries) {
    const context = primaryActivityContext(entry);
    const key = `${context.type}:${context.id}`;
    let group = groups.get(key);
    if (!group) {
      group = { context, entryCount: 0, entries: [] };
      groups.set(key, group);
      order.push(key);
    }
    group.entries.push(activityEntryItem(entry));
  }
  return order.map((key) => {
    const group = groups.get(key);
    if (!group) {
      throw new Error(`Missing activity group ${key}`);
    }
    group.entryCount = group.entries.length;
    return group;
  });
}

function activityEntryItem(entry: JournalEntry) {
  return {
    id: entry.id,
    operation: entry.operation,
    objectType: entry.objectType,
    objectId: entry.objectId,
    objectLabel: entry.objectLabel,
    summary: entry.summary,
    actorName: entry.actorName,
    createdAt: entry.createdAt
  };
}

const activityReportSchema = z.object({
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
  limit: z.number().int().positive().max(100).optional()
});

const workDossierSchema = z.object({
  reference: z.string().min(1).describe("Projekt- oder Meilenstein-Referenz, z. B. PROJ-3 oder MS-12."),
  closedWithinDays: z.number().int().positive().max(90).optional().describe("Kalendertage-Fenster für kürzlich erledigte Items. Default 3.")
});

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
      description: "Liest Aufgaben für ein Projekt, einen Meilenstein, ein Feature oder einen Use Case. Subtasks einer Aufgabe liefert get_task.",
      inputSchema: linkParentSchema,
      execute: ({ parentType, parentId }) => client.get<Task[]>(`${linkOwnerPath(parentType, parentId)}/tasks`)
    }),
    defineTool({
      name: "list_tickets_for_parent",
      title: "Tickets am Parent lesen",
      description: "Liest Tickets für ein Projekt, einen Meilenstein, eine Aufgabe, ein Feature oder einen Use Case. Subtickets eines Tickets liefert get_ticket.",
      inputSchema: ticketListParentSchema,
      execute: ({ parentType, parentId }) => client.get<Ticket[]>(`${extendedOwnerPath(parentType, parentId)}/tickets`)
    }),
    defineTool({
      name: "list_all_tasks",
      title: "Alle Aufgaben listen",
      description: "Liest alle Root-Aufgaben global inklusive parentContexts, ohne Parent-Einschränkung. Subtasks erscheinen über parentContexts bzw. get_task.",
      inputSchema: z.object({}),
      execute: () => client.get<Task[]>("tasks")
    }),
    defineTool({
      name: "list_all_tickets",
      title: "Alle Tickets listen",
      description: "Liest alle Root-Tickets global inklusive parentContexts, ohne Parent-Einschränkung. Subtickets erscheinen über parentContexts bzw. get_ticket.",
      inputSchema: z.object({}),
      execute: () => client.get<Ticket[]>("tickets")
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
      name: "get_reference_context",
      title: "Objektkontext per Referenz laden",
      description: "Lädt ein Projekt-Manager-Objekt anhand seiner Referenz inklusive rekursiver Kinder, Notes, Attachments, Comments und Relationen.",
      inputSchema: referenceSchema,
      execute: async ({ reference }) => buildReferenceContext(client, reference)
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
      execute: (input) => client.post<Project>("projects", withHtmlDescription(input) satisfies ProjectInput)
    }),
    defineTool({
      name: "create_milestone",
      title: "Meilenstein erstellen",
      description: "Erstellt einen neuen Meilenstein unter einem Projekt mit Stammdaten, Beschreibung, Status, Farbe und Zeitraum.",
      inputSchema: milestoneCreateSchema,
      execute: ({ projectId, ...body }) => client.post<Milestone>(`projects/${projectId}/milestones`, withHtmlDescription(body) satisfies Omit<MilestoneInput, "projectId">)
    }),
    defineTool({
      name: "add_task_to_parent",
      title: "Aufgabe hinzufügen",
      description: "Legt eine normale Aufgabe an einem Projekt oder Meilenstein an und befüllt die Stammdatenfelder.",
      inputSchema: taskInputSchema,
      execute: (input) => client.post<Task>(`${ownerPath(input.parentType, input.parentId)}/tasks`, withoutParentWithHtmlDescription(input) satisfies TaskInput)
    }),
    defineTool({
      name: "add_task_list_to_parent",
      title: "Aufgabenliste hinzufügen",
      description: "Legt mehrere Aufgaben seriell an einem Projekt, Meilenstein, Feature oder Use Case an. Pro Aufgabe kann optional ein Attachment hochgeladen werden.",
      inputSchema: taskListInputSchema,
      execute: (input) => createTasksBulk(client, input)
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
      description: "Legt eine redaktionelle Aufgabe als normale Task mit Briefing, Status, Priorität, Verantwortlichem und DueDate an.",
      inputSchema: editorialTaskSchema,
      execute: (input) =>
        client.post<Task>(`${ownerPath(input.parentType, input.parentId)}/tasks`, {
          title: input.title,
          description: textToHtml(input.editorialBrief),
          status: input.status,
          priority: input.priority,
          responsibleUserId: input.responsibleUserId,
          dueDate: input.dueDate
        } satisfies TaskInput)
    }),
    defineTool({
      name: "add_ticket_to_parent",
      title: "Ticket hinzufügen",
      description: "Legt ein Ticket an einem Projekt oder Meilenstein an und befüllt die Stammdatenfelder.",
      inputSchema: ticketInputSchema,
      execute: (input) => client.post<Ticket>(`${ownerPath(input.parentType, input.parentId)}/tickets`, withoutParentWithHtmlDescription(input) satisfies TicketInput)
    }),
    defineTool({
      name: "add_ticket_list_to_parent",
      title: "Ticketliste hinzufügen",
      description: "Legt mehrere Tickets seriell an einem Projekt, Meilenstein, Task, Feature oder Use Case an. Pro Ticket kann optional ein Attachment hochgeladen werden.",
      inputSchema: ticketListInputSchema,
      execute: (input) => createTicketsBulk(client, input)
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
      execute: (input) => client.post<Comment>(`${extendedOwnerPath(input.parentType, input.parentId)}/comments`, { body: textToHtml(input.body) ?? "" })
    }),
    defineTool({
      name: "add_comments_to_parent",
      title: "Kommentare hinzufügen",
      description: "Legt mehrere Kommentare seriell an Projekt, Meilenstein, Task, Ticket, Feature oder Use Case an.",
      inputSchema: commentListInputSchema,
      execute: (input) => createCommentsBulk(client, input)
    }),
    defineTool({
      name: "add_note_to_parent",
      title: "Notiz hinzufügen",
      description: "Legt eine Textnotiz an Projekt, Meilenstein, Task oder Ticket an.",
      inputSchema: noteInputSchema,
      execute: (input) =>
        client.post<Note>(`${extendedOwnerPath(input.parentType, input.parentId)}/notes`, {
          title: input.title,
          contentJson: htmlDocument(input.text)
        })
    }),
    defineTool({
      name: "add_notes_to_parent",
      title: "Notizen hinzufügen",
      description: "Legt mehrere Textnotizen seriell an Projekt, Meilenstein, Task oder Ticket an.",
      inputSchema: noteListInputSchema,
      execute: (input) => createNotesBulk(client, input)
    }),
    defineTool({
      name: "add_attachment_to_parent",
      title: "Attachment hinzufügen",
      description: "Hängt eine Base64-codierte Datei an Projekt, Meilenstein, Task, Feature oder Ticket.",
      inputSchema: attachmentInputSchema,
      execute: (input) => client.postForm<Attachment>(`${attachmentOwnerPath(input.parentType, input.parentId)}/attachments`, attachmentFormData(input))
    }),
    defineTool({
      name: "add_attachments_to_parent",
      title: "Attachments hinzufügen",
      description: "Hängt mehrere Base64-codierte Dateien seriell an Projekt, Meilenstein, Task, Feature oder Ticket.",
      inputSchema: attachmentListInputSchema,
      execute: (input) => createAttachmentsBulk(client, input)
    }),
    defineTool({
      name: "update_project",
      title: "Projekt aktualisieren",
      description: "Aktualisiert Projektstammdaten und Beschreibung versionsgeschützt.",
      inputSchema: updateProjectSchema,
      execute: (input) => updateVersioned<Project>(client, `projects/${input.id}`, withoutIdWithHtmlDescription(input) satisfies Omit<ProjectUpdate, "expectedVersion">)
    }),
    defineTool({
      name: "update_milestone",
      title: "Meilenstein aktualisieren",
      description: "Aktualisiert Meilenstein-Stammdaten und Beschreibung versionsgeschützt.",
      inputSchema: updateMilestoneSchema,
      execute: (input) => updateVersioned<Milestone>(client, `milestones/${input.id}`, withoutIdWithHtmlDescription(input) satisfies Omit<MilestoneUpdate, "expectedVersion">)
    }),
    defineTool({
      name: "update_task",
      title: "Aufgabe aktualisieren",
      description: "Aktualisiert Aufgabenstammdaten und Beschreibung versionsgeschützt.",
      inputSchema: updateTaskSchema,
      execute: (input) => updateVersioned<Task>(client, `tasks/${input.id}`, withoutIdWithHtmlDescription(input) satisfies Omit<TaskUpdate, "expectedVersion">)
    }),
    defineTool({
      name: "update_ticket",
      title: "Ticket aktualisieren",
      description: "Aktualisiert Ticketstammdaten, Beschreibung und Lösung versionsgeschützt.",
      inputSchema: updateTicketSchema,
      execute: (input) => updateVersioned<Ticket>(client, `tickets/${input.id}`, withoutIdWithHtmlDescription(input) satisfies Omit<TicketUpdate, "expectedVersion">)
    }),
    defineTool({
      name: "create_feature",
      title: "Feature erstellen",
      description: "Erstellt ein neues Feature mit Beschreibung und optionalem Content.",
      inputSchema: featureCreateSchema,
      execute: (input) => client.post<Feature>("features", withHtmlDescription(input) satisfies FeatureInput)
    }),
    defineTool({
      name: "update_feature",
      title: "Feature aktualisieren",
      description: "Aktualisiert Feature-Stammdaten, Beschreibung und Content versionsgeschützt.",
      inputSchema: updateFeatureSchema,
      execute: (input) => updateVersioned<Feature>(client, `features/${input.id}`, withoutIdWithHtmlDescription(input) satisfies Omit<FeatureUpdate, "expectedVersion">)
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
      execute: (input) => client.post<UseCase>(`features/${input.featureId}/use-cases`, withHtmlDescription(input) satisfies UseCaseInput)
    }),
    defineTool({
      name: "update_use_case",
      title: "Use Case aktualisieren",
      description: "Aktualisiert Use-Case-Stammdaten, Feature-Zuordnung, Beschreibung und Content versionsgeschützt.",
      inputSchema: updateUseCaseSchema,
      execute: (input) => updateVersioned<UseCase>(client, `use-cases/${input.id}`, withoutIdWithHtmlDescription(input) satisfies Omit<UseCaseUpdate, "expectedVersion">)
    }),
    defineTool({
      name: "create_backlog_item",
      title: "Backlog Item erstellen",
      description: "Legt ein Backlog Item (Ideenspeicher) an einem Projekt an. Optional mit Feature-/Use-Case-Bezug, Status, Verantwortlichem und Sortierung.",
      inputSchema: backlogCreateSchema,
      execute: ({ projectId, ...body }) => client.post<BacklogItem>(`projects/${projectId}/backlog`, withHtmlDescription(body) satisfies BacklogItemInput)
    }),
    defineTool({
      name: "update_backlog_item",
      title: "Backlog Item aktualisieren",
      description: "Aktualisiert Stammdaten, Beschreibung und Bezüge eines Backlog Items versionsgeschützt.",
      inputSchema: updateBacklogSchema,
      execute: (input) => updateVersioned<BacklogItem>(client, `backlog/${input.id}`, withoutIdWithHtmlDescription(input) satisfies Omit<BacklogItemUpdate, "expectedVersion">)
    }),
    defineTool({
      name: "add_task_to_use_case",
      title: "Use-Case-Aufgabe hinzufügen",
      description: "Legt eine Aufgabe an einem Use Case an.",
      inputSchema: useCaseChildSchema,
      execute: ({ useCaseId, ...body }) => client.post<Task>(`use-cases/${useCaseId}/tasks`, withHtmlDescription(body) satisfies TaskInput)
    }),
    defineTool({
      name: "add_ticket_to_use_case",
      title: "Use-Case-Ticket hinzufügen",
      description: "Legt ein Ticket an einem Use Case an.",
      inputSchema: useCaseChildSchema,
      execute: ({ useCaseId, ...body }) => client.post<Ticket>(`use-cases/${useCaseId}/tickets`, withHtmlDescription(body) satisfies TicketInput)
    }),
    defineTool({
      name: "preview_delete",
      title: "Löschvorschau",
      description:
        "Zeigt vor dem Löschen den rekursiven Kontextbaum eines Objekts und eine Zusammenfassung der kaskadierend betroffenen Kinder und Supportobjekte. Read-only. Tatsächliche Kaskaden und 409-Blocker werden beim echten Löschen serverseitig erzwungen.",
      inputSchema: referenceSchema,
      execute: async ({ reference }) => {
        const context = await buildReferenceContext(client, reference);
        return {
          reference: context.reference,
          normalizedReference: context.normalizedReference,
          target: { type: context.root.type, reference: context.root.reference },
          cascadeImpact: summarizeDeletionImpact(context),
          warnings: context.warnings,
          tree: context.root
        };
      }
    }),
    defineTool({
      name: "delete_project",
      title: "Projekt löschen",
      description: "Löscht ein Projekt inklusive serverseitiger Kaskade. Offene Relationen führen zu einem Blocker-Fehler.",
      inputSchema: idSchema,
      execute: async ({ id }) => {
        await client.del(`projects/${id}`);
        return { deleted: true, type: "project", id };
      }
    }),
    defineTool({
      name: "delete_milestone",
      title: "Meilenstein löschen",
      description: "Löscht einen Meilenstein inklusive serverseitiger Kaskade. Offene Relationen führen zu einem Blocker-Fehler.",
      inputSchema: idSchema,
      execute: async ({ id }) => {
        await client.del(`milestones/${id}`);
        return { deleted: true, type: "milestone", id };
      }
    }),
    defineTool({
      name: "delete_task",
      title: "Aufgabe löschen",
      description: "Löscht eine Aufgabe inklusive Subtask-Subtree und Supportobjekten. Offene Relationen führen zu einem Blocker-Fehler.",
      inputSchema: idSchema,
      execute: async ({ id }) => {
        await client.del(`tasks/${id}`);
        return { deleted: true, type: "task", id };
      }
    }),
    defineTool({
      name: "delete_ticket",
      title: "Ticket löschen",
      description: "Löscht ein Ticket inklusive Subticket-Subtree und Supportobjekten. Offene Relationen führen zu einem Blocker-Fehler.",
      inputSchema: idSchema,
      execute: async ({ id }) => {
        await client.del(`tickets/${id}`);
        return { deleted: true, type: "ticket", id };
      }
    }),
    defineTool({
      name: "delete_feature",
      title: "Feature löschen",
      description: "Löscht ein Feature inklusive kaskadierter Use Cases und Supportobjekte. Offene Relationen führen zu einem Blocker-Fehler.",
      inputSchema: idSchema,
      execute: async ({ id }) => {
        await client.del(`features/${id}`);
        return { deleted: true, type: "feature", id };
      }
    }),
    defineTool({
      name: "delete_use_case",
      title: "Use Case löschen",
      description: "Löscht einen Use Case inklusive serverseitiger Kaskade. Offene Relationen führen zu einem Blocker-Fehler.",
      inputSchema: idSchema,
      execute: async ({ id }) => {
        await client.del(`use-cases/${id}`);
        return { deleted: true, type: "useCase", id };
      }
    }),
    defineTool({
      name: "report_open_tasks",
      title: "Report: offene Aufgaben",
      description: "Aggregiert alle offenen Root-Aufgaben (Status nicht als abgeschlossen markiert) gruppiert nach Parent-Kontext.",
      inputSchema: z.object({}),
      execute: async () => {
        const [tasks, catalogs] = await Promise.all([client.get<Task[]>("tasks"), client.get<CatalogEntry[]>("catalogs")]);
        const closed = closedWorkStatusKeys(catalogs);
        const open = tasks.filter((task) => !closed.has(task.status));
        return {
          generatedAt: new Date().toISOString(),
          totalCount: tasks.length,
          openCount: open.length,
          groups: groupByParentContexts(open, taskReportItem)
        };
      }
    }),
    defineTool({
      name: "report_open_tickets",
      title: "Report: offene Tickets",
      description: "Aggregiert alle offenen Root-Tickets (Status nicht als abgeschlossen markiert) gruppiert nach Parent-Kontext.",
      inputSchema: z.object({}),
      execute: async () => {
        const [tickets, catalogs] = await Promise.all([client.get<Ticket[]>("tickets"), client.get<CatalogEntry[]>("catalogs")]);
        const closed = closedWorkStatusKeys(catalogs);
        const open = tickets.filter((ticket) => !closed.has(ticket.status));
        return {
          generatedAt: new Date().toISOString(),
          totalCount: tickets.length,
          openCount: open.length,
          groups: groupByParentContexts(open, ticketReportItem)
        };
      }
    }),
    defineTool({
      name: "report_activity",
      title: "Report: Arbeitsverlauf",
      description:
        "Aggregiert den Änderungsverlauf (Aufgaben, Tickets, Kommentare, Notizen und weitere Objekte) aus dem Journal nach Änderungsdatum, gruppiert nach Kontext/Parent. Optional auf einen Zeitraum begrenzbar.",
      inputSchema: activityReportSchema,
      execute: async ({ from, to, limit }) => {
        const params = new URLSearchParams();
        params.set("limit", String(limit ?? 100));
        if (from) {
          params.set("from", from);
        }
        if (to) {
          params.set("to", to);
        }
        const response = await client.get<JournalListResponse>(`journal?${params.toString()}`);
        return {
          generatedAt: new Date().toISOString(),
          from: from ?? null,
          to: to ?? null,
          count: response.entries.length,
          nextCursor: response.nextCursor,
          groups: groupActivityByContext(response.entries)
        };
      }
    }),
    defineTool({
      name: "report_work_dossier",
      title: "Report: Arbeitsbericht-Dossier",
      description:
        "Stellt für ein Projekt (PROJ-N) oder einen Meilenstein (MS-N) ein vorkorreliertes Arbeitsbericht-Dossier zusammen: kürzlich erledigte (geschlossen und innerhalb closedWithinDays Kalendertagen aktualisiert, Default 3), in Arbeit befindliche und offen wartende Aufgaben und Tickets, dazu chronologischer Kommentarverlauf, Beziehungen (blocks/related/duplicate) und gefilterte Journal-Änderungen. Liefert strukturierte Daten als Grundlage für einen erzählenden Arbeitsstandsbericht, keine fertige Prosa. Aus den Daten einen zusammenhängenden Bericht formulieren: was wurde erledigt, was liegt an, was ist offen, und welche Zusammenhänge bestehen zwischen Tickets, Aufgaben und Kommentaren.",
      inputSchema: workDossierSchema,
      execute: ({ reference, closedWithinDays }) => buildWorkDossier(client, reference, { closedWithinDays })
    })
  ];
}
