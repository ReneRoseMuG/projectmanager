import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type {
  Attachment,
  AttachmentFolder,
  BacklogItem,
  CatalogEntry,
  Comment,
  DiaryEntry,
  Feature,
  Milestone,
  Note,
  ParentDocumentLink,
  Project,
  Tag,
  Task,
  Ticket,
  UseCase,
  UserOption,
  WikiPage
} from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildTestApp, createTestDb, type TestDb } from "../../../tests/fixtures/api/index.js";
import { ProjectManagerApiClient } from "./api-client.js";
import type { ReferenceContext } from "./reference-context.js";
import { createProjectManagerMcpServer } from "./server.js";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Jedes verfügbare MCP-v1-Tool wird einmal über den MCP-Transport ausgeführt.
 * - Die Tools arbeiten gegen echte Fastify-Routen mit isolierter temporärer MySQL-Datenbank.
 * - Attachment-Uploads verwenden ein isoliertes Temp-Upload-Verzeichnis.
 * - Owner-Attachments bleiben exklusiv; DMS-Importe geben Art, direkte Sammlung, Tags und Version
 *   aus dem echten API-Vertrag zurück und werden über eigene Relationstools verknüpft.
 * - Schreibende Tools erzeugen oder ändern beobachtbare Daten versionsgeschützt.
 * - Destruktive Delete-Tools bleiben bewusst außerhalb der MCP-Oberfläche.
 *
 * Fehlerfälle:
 * - MCP-Tool-Fehler würden als isError-Ergebnis sichtbar und brechen den Test.
 *
 * Ziel:
 * Die MCP-Tool-Matrix bleibt vollständig gegen echte Projekt-Manager-Daten abgesichert.
 */

type ToolCallResponse = Awaited<ReturnType<Client["callTool"]>>;

interface BulkCreated<Result> {
  index: number;
  result: Result;
}

interface BulkError {
  index: number;
  stage: string;
  message: string;
  code?: string;
  statusCode?: number;
}

interface BulkResult<Result> {
  requested: number;
  createdCount: number;
  errorCount: number;
  created: Array<BulkCreated<Result>>;
  errors: BulkError[];
}

const apiKey = "mcp-integration-api-key";
const uploadDir = path.join(os.tmpdir(), `taskmanager-mcp-attachments-${process.pid}`);
const previewCacheDir = path.join(os.tmpdir(), `taskmanager-mcp-attachment-previews-${process.pid}`);

describe("MCP tools integration", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let apiBaseUrl: string;
  let seedClient: ProjectManagerApiClient;
  let mcpClient: Client;
  let mcpServer: ReturnType<typeof createProjectManagerMcpServer>;

  beforeAll(async () => {
    process.env.API_KEY = apiKey;
    process.env.UPLOAD_DIR = uploadDir;
    process.env.PREVIEW_CACHE_DIR = previewCacheDir;

    testDb = await createTestDb();
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(previewCacheDir, { recursive: true, force: true });
    app = await buildTestApp(testDb, { enableAuth: true, enableMultipart: true });
    await app.listen({ host: "127.0.0.1", port: 0 });

    const address = app.server.address();
    if (!address || typeof address === "string") {
      throw new Error("Test Fastify server did not expose a TCP address");
    }

    apiBaseUrl = `http://127.0.0.1:${address.port}/api`;
    seedClient = new ProjectManagerApiClient({ baseUrl: apiBaseUrl, apiKey });
    mcpServer = createProjectManagerMcpServer({ apiBaseUrl, apiKey });
    mcpClient = new Client({ name: "mcp-integration-test-client", version: "0.1.0" });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await mcpServer.connect(serverTransport);
    await mcpClient.connect(clientTransport);
  });

  afterAll(async () => {
    if (mcpClient) {
      await mcpClient.close();
    }
    if (mcpServer) {
      await mcpServer.close();
    }
    if (app) {
      await app.close();
    }
    if (testDb) {
      await testDb.close();
    }
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(previewCacheDir, { recursive: true, force: true });
  });

  async function callTool<T>(executedTools: Set<string>, name: string, args: Record<string, unknown> = {}): Promise<T> {
    executedTools.add(name);
    return parseToolJson<T>(await mcpClient.callTool({ name, arguments: args }));
  }

  it("führt jedes MCP-Tool einmal mit echten App-Daten aus", async () => {
    const tools = await mcpClient.listTools();
    const expectedToolNames = tools.tools.map((tool) => tool.name).sort();
    const executedTools = new Set<string>();

    const project = await seedClient.post<Project>("projects", {
      name: "MCP Projekt",
      description: "Initiale Projektbeschreibung",
      status: "active"
    });
    const milestone = await seedClient.post<Milestone>(`projects/${project.id}/milestones`, {
      name: "MCP Meilenstein",
      description: "Initiale Meilensteinbeschreibung",
      status: "active"
    });
    const task = await seedClient.post<Task>(`projects/${project.id}/tasks`, {
      title: "MCP Aufgabe",
      description: "Initiale Aufgabenbeschreibung",
      status: "todo",
      priority: "medium"
    });
    const ticket = await seedClient.post<Ticket>(`projects/${project.id}/tickets`, {
      title: "MCP Ticket",
      description: "Initiale Ticketbeschreibung",
      type: "bug",
      status: "open",
      priority: "high"
    });
    const feature = await seedClient.post<Feature>("features", {
      title: "MCP Feature",
      description: "Initiale Featurebeschreibung",
      status: "active",
      content: "# MCP Feature"
    });
    await seedClient.put<Feature[]>(`projects/${project.id}/features`, { featureIds: [feature.id] });
    const useCase = await seedClient.post<UseCase>(`features/${feature.id}/use-cases`, {
      title: "MCP Use Case",
      description: "Initiale Use-Case-Beschreibung",
      status: "active",
      content: "# MCP Use Case"
    });

    expect(await callTool<Project[]>(executedTools, "list_projects")).toEqual(expect.arrayContaining([expect.objectContaining({ id: project.id })]));
    expect(await callTool<Project>(executedTools, "get_project", { id: project.id })).toMatchObject({ id: project.id });
    expect(await callTool<Milestone[]>(executedTools, "list_milestones", { projectId: project.id })).toEqual([
      expect.objectContaining({ id: milestone.id })
    ]);
    expect(await callTool<Milestone>(executedTools, "get_milestone", { id: milestone.id })).toMatchObject({ id: milestone.id });
    expect(await callTool<Task[]>(executedTools, "list_tasks_for_parent", { parentType: "project", parentId: project.id })).toEqual([
      expect.objectContaining({ id: task.id })
    ]);
    expect(await callTool<Ticket[]>(executedTools, "list_tickets_for_parent", { parentType: "project", parentId: project.id })).toEqual([
      expect.objectContaining({ id: ticket.id })
    ]);
    expect(await callTool<Task[]>(executedTools, "list_all_tasks")).toEqual(expect.arrayContaining([expect.objectContaining({ id: task.id })]));
    expect(await callTool<Ticket[]>(executedTools, "list_all_tickets")).toEqual(expect.arrayContaining([expect.objectContaining({ id: ticket.id })]));
    expect(await callTool<Task>(executedTools, "get_task", { id: task.id })).toMatchObject({ id: task.id });
    expect(await callTool<Ticket>(executedTools, "get_ticket", { id: ticket.id })).toMatchObject({ id: ticket.id });
    expect(await callTool<Feature[]>(executedTools, "list_features")).toEqual(expect.arrayContaining([expect.objectContaining({ id: feature.id })]));
    expect(await callTool<Feature>(executedTools, "get_feature", { id: feature.id })).toMatchObject({
      id: feature.id,
      content: "# MCP Feature"
    });
    expect(await callTool<UseCase[]>(executedTools, "list_use_cases", { featureId: feature.id })).toEqual([
      expect.objectContaining({ id: useCase.id })
    ]);
    expect(await callTool<UseCase>(executedTools, "get_use_case", { id: useCase.id })).toMatchObject({
      id: useCase.id,
      content: "# MCP Use Case"
    });
    expect(await callTool<Task>(executedTools, "resolve_reference", { reference: `task-${task.id}` })).toMatchObject({ id: task.id });
    expect(await callTool<CatalogEntry[]>(executedTools, "list_catalogs")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "workStatus", key: "todo" }),
        expect.objectContaining({ kind: "priority", key: "medium" }),
        expect.objectContaining({ kind: "ticketType", key: "bug" })
      ])
    );
    expect(await callTool<UserOption[]>(executedTools, "list_users")).toEqual(
      expect.arrayContaining([expect.objectContaining({ email: "admin@local", fullName: "Admin, Test" })])
    );

    const createdProject = await callTool<Project>(executedTools, "create_project", {
      name: "MCP Tool Projekt",
      description: "Per MCP angelegtes Projekt",
      status: "active",
      color: "#2563eb",
      startDate: "2026-05-01",
      dueDate: "2026-07-01"
    });
    expect(createdProject).toMatchObject({ name: "MCP Tool Projekt", color: "#2563eb" });

    const createdBacklogItem = await callTool<BacklogItem>(executedTools, "create_backlog_item", {
      projectId: createdProject.id,
      title: "MCP Backlog",
      description: "Per MCP angelegt",
      status: "open",
      sortOrder: 10
    });
    expect(createdBacklogItem).toMatchObject({
      projectId: createdProject.id,
      title: "MCP Backlog",
      status: "open",
      sortOrder: 10
    });
    const updatedBacklogItem = await callTool<BacklogItem>(executedTools, "update_backlog_item", {
      id: createdBacklogItem.id,
      title: "MCP Backlog aktualisiert",
      status: "in_progress",
      responsibleUserId: 1
    });
    expect(updatedBacklogItem).toMatchObject({
      id: createdBacklogItem.id,
      title: "MCP Backlog aktualisiert",
      status: "in_progress",
      responsibleUserId: 1
    });
    expect(updatedBacklogItem.version).toBeGreaterThan(createdBacklogItem.version);

    expect(await callTool<DiaryEntry | null>(executedTools, "get_project_diary", { projectId: createdProject.id })).toBeNull();
    const createdDiary = await callTool<DiaryEntry>(executedTools, "create_diary_entry", {
      projectId: createdProject.id,
      title: "MCP Tagebuch",
      content: "Start",
      sourceCount: 1
    });
    expect(createdDiary).toMatchObject({
      projectId: createdProject.id,
      title: "MCP Tagebuch",
      sourceCount: 1
    });
    const updatedDiary = await callTool<DiaryEntry>(executedTools, "update_diary_entry", {
      id: createdDiary.id,
      content: "Fortgeschrieben",
      sourceCount: 2
    });
    expect(updatedDiary).toMatchObject({ id: createdDiary.id, sourceCount: 2 });
    expect(updatedDiary.version).toBeGreaterThan(createdDiary.version);

    const createdMilestone = await callTool<Milestone>(executedTools, "create_milestone", {
      projectId: createdProject.id,
      name: "MCP Tool Meilenstein",
      description: "Per MCP angelegter Meilenstein",
      status: "active",
      color: "#14b8a6",
      startDate: "2026-05-15",
      dueDate: "2026-06-15"
    });
    expect(createdMilestone).toMatchObject({ projectId: createdProject.id, name: "MCP Tool Meilenstein" });

    const createdTask = await callTool<Task>(executedTools, "add_task_to_parent", {
      parentType: "project",
      parentId: project.id,
      title: "MCP Tool Aufgabe",
      description: "Per MCP angelegt",
      status: "todo",
      priority: "medium",
      responsibleUserId: 1,
      dueDate: "2026-06-01"
    });
    expect(createdTask).toMatchObject({ title: "MCP Tool Aufgabe", description: "<p>Per MCP angelegt</p>" });

    expect(
      await callTool<Task>(executedTools, "link_task_to_parent", {
        parentType: "milestone",
        parentId: milestone.id,
        taskId: createdTask.id
      })
    ).toMatchObject({ id: createdTask.id, title: "MCP Tool Aufgabe" });
    expect(
      await callTool<Task>(executedTools, "link_task_to_parent", {
        parentType: "feature",
        parentId: feature.id,
        taskId: createdTask.id
      })
    ).toMatchObject({ id: createdTask.id, title: "MCP Tool Aufgabe" });
    expect(
      await callTool<Task>(executedTools, "link_task_to_parent", {
        parentType: "useCase",
        parentId: useCase.id,
        taskId: createdTask.id
      })
    ).toMatchObject({ id: createdTask.id, title: "MCP Tool Aufgabe" });
    expect(await callTool<Task[]>(executedTools, "list_tasks_for_parent", { parentType: "feature", parentId: feature.id })).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: createdTask.id })])
    );
    expect(await callTool<Task[]>(executedTools, "list_tasks_for_parent", { parentType: "useCase", parentId: useCase.id })).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: createdTask.id })])
    );

    const editorialTask = await callTool<Task>(executedTools, "assign_editorial_task", {
      parentType: "milestone",
      parentId: milestone.id,
      title: "Redaktion: Beschreibung schärfen",
      editorialBrief: "Bitte fachlich überarbeiten.",
      responsibleUserId: 1,
      dueDate: "2026-06-02"
    });
    expect(editorialTask).toMatchObject({
      title: "Redaktion: Beschreibung schärfen",
      description: "<p>Bitte fachlich überarbeiten.</p>",
      status: "todo",
      priority: "medium"
    });

    const createdTicket = await callTool<Ticket>(executedTools, "add_ticket_to_parent", {
      parentType: "milestone",
      parentId: milestone.id,
      title: "MCP Tool Ticket",
      description: "Per MCP angelegtes Ticket",
      type: "bug",
      status: "open",
      priority: "high",
      reporterUserId: 1,
      responsibleUserId: 1,
      environment: "Integrationstest",
      affectedVersion: "0.1.0",
      dueDate: "2026-06-03"
    });
    expect(createdTicket).toMatchObject({ title: "MCP Tool Ticket", environment: "Integrationstest" });

    expect(
      await callTool<Ticket>(executedTools, "link_ticket_to_parent", {
        parentType: "project",
        parentId: project.id,
        ticketId: createdTicket.id
      })
    ).toMatchObject({ id: createdTicket.id, title: "MCP Tool Ticket" });
    expect(
      await callTool<Ticket>(executedTools, "link_ticket_to_parent", {
        parentType: "feature",
        parentId: feature.id,
        ticketId: createdTicket.id
      })
    ).toMatchObject({ id: createdTicket.id, title: "MCP Tool Ticket" });
    expect(
      await callTool<Ticket>(executedTools, "link_ticket_to_parent", {
        parentType: "useCase",
        parentId: useCase.id,
        ticketId: createdTicket.id
      })
    ).toMatchObject({ id: createdTicket.id, title: "MCP Tool Ticket" });
    expect(await callTool<Ticket[]>(executedTools, "list_tickets_for_parent", { parentType: "feature", parentId: feature.id })).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: createdTicket.id })])
    );
    expect(await callTool<Ticket[]>(executedTools, "list_tickets_for_parent", { parentType: "useCase", parentId: useCase.id })).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: createdTicket.id })])
    );

    const comment = await callTool<Comment>(executedTools, "add_comment_to_parent", {
      parentType: "project",
      parentId: project.id,
      body: "MCP Kommentar"
    });
    expect(comment).toMatchObject({ body: "<p>MCP Kommentar</p>" });

    const note = await callTool<Note>(executedTools, "add_note_to_parent", {
      parentType: "project",
      parentId: project.id,
      title: "MCP Notiz",
      text: "Absatz eins\n\nAbsatz zwei"
    });
    expect(note.title).toBe("MCP Notiz");
    expect(note.contentJson).toMatchObject({ html: "<p>Absatz eins</p><p>Absatz zwei</p>" });

    const attachmentContent = "MCP attachment content";
    const attachment = await callTool<Attachment>(executedTools, "add_attachment_to_parent", {
      parentType: "task",
      parentId: task.id,
      fileName: "mcp-attachment.txt",
      contentBase64: Buffer.from(attachmentContent, "utf8").toString("base64"),
      mimetype: "text/plain"
    });
    expect(attachment).toMatchObject({
      owners: [{ type: "task", id: task.id }],
      originalName: "mcp-attachment.txt",
      mimetype: "text/plain",
      size: Buffer.byteLength(attachmentContent)
    });
    expect(await fs.readFile(path.join(uploadDir, attachment.filename), "utf8")).toBe(attachmentContent);
    expect(await seedClient.get<Attachment[]>(`tasks/${task.id}/attachments`)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: attachment.id, originalName: "mcp-attachment.txt" })])
    );

    const documentFolder = await seedClient.post<AttachmentFolder>("attachment-folders", { name: "MCP DMS Sammlung" });
    const documentTag = await seedClient.post<Tag>("tags", { name: "MCP DMS Tag", domain: "dms" });
    const libraryOptions = await callTool<{ folders: AttachmentFolder[]; tags: Tag[] }>(executedTools, "list_document_library_options");
    expect(libraryOptions.folders).toEqual(expect.arrayContaining([expect.objectContaining({ id: documentFolder.id })]));
    expect(libraryOptions.tags).toEqual(expect.arrayContaining([expect.objectContaining({ id: documentTag.id, domain: "dms" })]));

    const importedDocument = await callTool<Attachment>(executedTools, "add_document_to_library", {
      fileName: "mcp-document.txt",
      contentBase64: Buffer.from("MCP document library content", "utf8").toString("base64"),
      mimetype: "text/plain",
      folderId: documentFolder.id,
      tagIds: [documentTag.id]
    });
    expect(importedDocument).toMatchObject({
      originalName: "mcp-document.txt",
      isInDocumentLibrary: true,
      folders: [expect.objectContaining({ id: documentFolder.id })],
      tags: [expect.objectContaining({ id: documentTag.id, domain: "dms" })],
      version: expect.any(Number)
    });
    expect(await fs.readFile(path.join(uploadDir, importedDocument.filename), "utf8")).toBe("MCP document library content");

    const parentDocumentLink = await callTool<ParentDocumentLink>(executedTools, "link_document_to_parent", {
      parentType: "task",
      parentId: task.id,
      documentId: importedDocument.id
    });
    expect(parentDocumentLink).toMatchObject({
      owner: { type: "task", id: task.id },
      document: { id: importedDocument.id, kind: "document" }
    });
    expect(await callTool<ParentDocumentLink[]>(executedTools, "list_parent_document_links", {
      parentType: "task",
      parentId: task.id
    })).toEqual([expect.objectContaining({ id: parentDocumentLink.id })]);
    expect(await callTool(executedTools, "unlink_document_from_parent", {
      parentType: "task",
      parentId: task.id,
      linkId: parentDocumentLink.id,
      expectedVersion: parentDocumentLink.version
    })).toEqual({ success: true });
    expect(await seedClient.get<Attachment>(`documents/${importedDocument.id}`)).toMatchObject({ id: importedDocument.id, kind: "document" });

    const tagCatalog = await callTool<Tag[]>(executedTools, "list_tags");
    expect(Array.isArray(tagCatalog)).toBe(true);

    const taggedTask = await callTool<{ tags: Tag[]; added: string[]; created: string[] }>(executedTools, "add_tags_to_parent", {
      parentType: "task",
      parentId: task.id,
      tags: ["MCP Tag Alpha", "MCP Tag Beta"]
    });
    expect(taggedTask.created).toEqual(expect.arrayContaining(["MCP Tag Alpha", "MCP Tag Beta"]));
    expect(taggedTask.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "MCP Tag Alpha" }),
        expect.objectContaining({ name: "MCP Tag Beta" })
      ])
    );
    expect((await seedClient.get<Task>(`tasks/${task.id}`)).tags).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "MCP Tag Alpha" })])
    );

    const untaggedTask = await callTool<{ tags: Tag[]; removed: string[]; notPresent: string[] }>(executedTools, "remove_tags_from_parent", {
      parentType: "task",
      parentId: task.id,
      tags: ["MCP Tag Alpha", "Nicht vergeben"]
    });
    expect(untaggedTask.removed).toEqual(["MCP Tag Alpha"]);
    expect(untaggedTask.notPresent).toEqual(["Nicht vergeben"]);
    expect(untaggedTask.tags).toEqual(expect.arrayContaining([expect.objectContaining({ name: "MCP Tag Beta" })]));
    expect(untaggedTask.tags).not.toEqual(expect.arrayContaining([expect.objectContaining({ name: "MCP Tag Alpha" })]));

    const bulkNotes = await callTool<BulkResult<Note>>(executedTools, "add_notes_to_parent", {
      parentType: "ticket",
      parentId: ticket.id,
      notes: [
        { title: "Bulk Notiz 1", text: "Erste Bulk-Notiz" },
        { title: "Bulk Notiz 2", text: "Zweite Bulk-Notiz" }
      ]
    });
    expect(bulkNotes).toMatchObject({ requested: 2, createdCount: 2, errorCount: 0 });
    expect(bulkNotes.created.map((entry) => entry.result.title)).toEqual(["Bulk Notiz 1", "Bulk Notiz 2"]);
    expect(await seedClient.get<Note[]>(`tickets/${ticket.id}/notes`)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: bulkNotes.created[0]?.result.id, title: "Bulk Notiz 1" })])
    );

    const bulkComments = await callTool<BulkResult<Comment>>(executedTools, "add_comments_to_parent", {
      parentType: "feature",
      parentId: feature.id,
      comments: [{ body: "Bulk Kommentar 1" }, { body: "Bulk Kommentar 2" }]
    });
    expect(bulkComments).toMatchObject({ requested: 2, createdCount: 2, errorCount: 0 });
    expect(bulkComments.created.map((entry) => entry.result.body)).toEqual(["<p>Bulk Kommentar 1</p>", "<p>Bulk Kommentar 2</p>"]);

    const bulkAttachments = await callTool<BulkResult<Attachment>>(executedTools, "add_attachments_to_parent", {
      parentType: "milestone",
      parentId: milestone.id,
      attachments: [
        {
          fileName: "bulk-one.txt",
          contentBase64: Buffer.from("bulk one", "utf8").toString("base64"),
          mimetype: "text/plain"
        },
        {
          fileName: "bulk-two.txt",
          contentBase64: Buffer.from("bulk two", "utf8").toString("base64"),
          mimetype: "text/plain"
        }
      ]
    });
    expect(bulkAttachments).toMatchObject({ requested: 2, createdCount: 2, errorCount: 0 });
    expect(await fs.readFile(path.join(uploadDir, bulkAttachments.created[1]?.result.filename ?? ""), "utf8")).toBe("bulk two");

    const bulkTasks = await callTool<BulkResult<{ task: Task; attachment?: Attachment }>>(executedTools, "add_task_list_to_parent", {
      parentType: "useCase",
      parentId: useCase.id,
      tasks: [
        {
          title: "Bulk Aufgabe mit Attachment",
          description: "Per Bulk-Tool angelegt",
          status: "todo",
          priority: "medium",
          attachment: {
            fileName: "bulk-task.txt",
            contentBase64: Buffer.from("bulk task", "utf8").toString("base64"),
            mimetype: "text/plain"
          }
        },
        {
          title: "Bulk Aufgabe ohne Attachment",
          description: "Per Bulk-Tool angelegt",
          status: "todo",
          priority: "low"
        }
      ]
    });
    expect(bulkTasks).toMatchObject({ requested: 2, createdCount: 2, errorCount: 0 });
    expect(bulkTasks.created[0]?.result.task).toMatchObject({ title: "Bulk Aufgabe mit Attachment" });
    expect(bulkTasks.created[0]?.result.attachment).toMatchObject({ originalName: "bulk-task.txt", owners: [{ type: "task", id: bulkTasks.created[0]?.result.task.id }] });
    expect(await seedClient.get<Task[]>(`use-cases/${useCase.id}/tasks`)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: bulkTasks.created[1]?.result.task.id, title: "Bulk Aufgabe ohne Attachment" })])
    );

    const bulkTickets = await callTool<BulkResult<{ ticket: Ticket; attachment?: Attachment }>>(executedTools, "add_ticket_list_to_parent", {
      parentType: "task",
      parentId: task.id,
      tickets: [
        {
          title: "Bulk Ticket mit Attachment",
          description: "Per Bulk-Tool angelegt",
          type: "bug",
          status: "open",
          priority: "high",
          attachment: {
            fileName: "bulk-ticket.txt",
            contentBase64: Buffer.from("bulk ticket", "utf8").toString("base64"),
            mimetype: "text/plain"
          }
        }
      ]
    });
    expect(bulkTickets).toMatchObject({ requested: 1, createdCount: 1, errorCount: 0 });
    expect(bulkTickets.created[0]?.result.ticket).toMatchObject({ title: "Bulk Ticket mit Attachment" });
    expect(bulkTickets.created[0]?.result.attachment).toMatchObject({ originalName: "bulk-ticket.txt", owners: [{ type: "ticket", id: bulkTickets.created[0]?.result.ticket.id }] });
    expect(await callTool<Ticket[]>(executedTools, "list_tickets_for_parent", { parentType: "task", parentId: task.id })).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: bulkTickets.created[0]?.result.ticket.id })])
    );

    const context = await callTool<ReferenceContext>(executedTools, "get_reference_context", { reference: `PROJ-${project.id}` });
    expect(context.normalizedReference).toBe(`PROJ-${project.id}`);
    expect(context.root.children.milestones).toEqual(expect.arrayContaining([expect.objectContaining({ id: milestone.id })]));
    expect(context.root.children.tasks).toEqual(expect.arrayContaining([expect.objectContaining({ id: task.id })]));
    expect(context.root.children.tickets).toEqual(expect.arrayContaining([expect.objectContaining({ id: ticket.id })]));
    expect(context.root.children.features).toEqual(expect.arrayContaining([expect.objectContaining({ id: feature.id })]));
    expect(context.root.support.notes).toEqual(expect.arrayContaining([expect.objectContaining({ id: note.id, title: "MCP Notiz" })]));
    expect(context.root.support.comments).toEqual(expect.arrayContaining([expect.objectContaining({ id: comment.id, body: "<p>MCP Kommentar</p>" })]));
    const taskContext = context.root.children.tasks.find((child) => child.id === task.id);
    expect(taskContext?.support.attachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          attachment: expect.objectContaining({ id: attachment.id, originalName: "mcp-attachment.txt" }),
          preview: expect.objectContaining({ status: "available", text: expect.objectContaining({ content: attachmentContent }) })
        })
      ])
    );

    expect(await callTool<Project>(executedTools, "update_project", { id: project.id, name: "MCP Projekt aktualisiert", description: "Projektbeschreibung MCP", status: "active", color: "#2563eb", startDate: "2026-05-01", dueDate: "2026-08-01" })).toMatchObject({
      name: "MCP Projekt aktualisiert",
      description: "<p>Projektbeschreibung MCP</p>",
      dueDate: "2026-08-01"
    });
    expect(
      await callTool<Milestone>(executedTools, "update_milestone", { id: milestone.id, name: "MCP Meilenstein aktualisiert", description: "Meilensteinbeschreibung MCP", status: "active", color: "#14b8a6", startDate: null, dueDate: "2026-07-15" })
    ).toMatchObject({ name: "MCP Meilenstein aktualisiert", description: "<p>Meilensteinbeschreibung MCP</p>", dueDate: "2026-07-15" });
    expect(await callTool<Task>(executedTools, "update_task", { id: task.id, title: "MCP Aufgabe aktualisiert", description: "Aufgabenbeschreibung MCP", status: "in_progress", priority: "high", responsibleUserId: 1, dueDate: "2026-06-20" })).toMatchObject({
      title: "MCP Aufgabe aktualisiert",
      description: "<p>Aufgabenbeschreibung MCP</p>",
      priority: "high"
    });
    expect(await callTool<Ticket>(executedTools, "update_ticket", { id: ticket.id, title: "MCP Ticket aktualisiert", type: "bug", description: "Ticketbeschreibung MCP", status: "resolved", priority: "high", reporterUserId: 1, responsibleUserId: 1, environment: "Integrationstest", affectedVersion: "0.2.0", dueDate: "2026-06-30", resolution: "fixed" })).toMatchObject({
      title: "MCP Ticket aktualisiert",
      description: "<p>Ticketbeschreibung MCP</p>",
      resolution: "fixed"
    });
    const updatedNote = await callTool<Note>(executedTools, "update_note", { id: note.id, title: "MCP Notiz aktualisiert", text: "Aktualisierter Absatz" });
    expect(updatedNote).toMatchObject({
      id: note.id,
      title: "MCP Notiz aktualisiert",
      contentJson: { html: "<p>Aktualisierter Absatz</p>" },
      version: note.version + 1
    });

    const createdFeature = await callTool<Feature>(executedTools, "create_feature", {
      title: "MCP Tool Feature",
      description: "Per MCP angelegtes Feature",
      status: "active",
      content: "# Tool Feature"
    });
    expect(createdFeature).toMatchObject({ title: "MCP Tool Feature" });

    expect(
      await callTool<Feature>(executedTools, "update_feature", {
        id: createdFeature.id,
        title: "MCP Tool Feature aktualisiert",
        status: "active",
        description: "Featurebeschreibung MCP",
        content: "# Aktualisiertes Feature",
        sortOrder: 20
      })
    ).toMatchObject({ title: "MCP Tool Feature aktualisiert", description: "<p>Featurebeschreibung MCP</p>", content: "# Aktualisiertes Feature", sortOrder: 20 });

    const linkedFeatures = await callTool<Feature[]>(executedTools, "link_feature_to_parent", {
      parentType: "project",
      parentId: project.id,
      featureId: createdFeature.id
    });
    expect(linkedFeatures.map((item) => item.id).sort((left, right) => left - right)).toEqual([feature.id, createdFeature.id].sort((left, right) => left - right));

    const createdUseCase = await callTool<UseCase>(executedTools, "create_use_case", {
      featureId: createdFeature.id,
      title: "MCP Tool Use Case",
      description: "Per MCP angelegter Use Case",
      status: "active",
      content: "# Tool Use Case"
    });
    expect(createdUseCase).toMatchObject({ title: "MCP Tool Use Case" });

    expect(
      await callTool<UseCase>(executedTools, "update_use_case", {
        id: createdUseCase.id,
        title: "MCP Tool Use Case aktualisiert",
        status: "active",
        description: "Use-Case-Beschreibung MCP",
        content: "# Aktualisierter Use Case",
        sortOrder: 30,
        featureId: createdFeature.id
      })
    ).toMatchObject({ title: "MCP Tool Use Case aktualisiert", description: "<p>Use-Case-Beschreibung MCP</p>", content: "# Aktualisierter Use Case", sortOrder: 30 });

    expect(
      await callTool<Task>(executedTools, "add_task_to_use_case", {
        useCaseId: createdUseCase.id,
        title: "Use-Case-Aufgabe MCP",
        description: "Use-Case-Aufgabe per MCP",
        status: "todo",
        priority: "medium"
      })
    ).toMatchObject({ title: "Use-Case-Aufgabe MCP" });
    expect(
      await callTool<Ticket>(executedTools, "add_ticket_to_use_case", {
        useCaseId: createdUseCase.id,
        title: "Use-Case-Ticket MCP",
        description: "Use-Case-Ticket per MCP",
        status: "open",
        priority: "medium"
      })
    ).toMatchObject({ title: "Use-Case-Ticket MCP" });

    const openTaskReport = await callTool<{ openCount: number; totalCount: number; groups: unknown[] }>(executedTools, "report_open_tasks");
    expect(openTaskReport.openCount).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(openTaskReport.groups)).toBe(true);

    const openTicketReport = await callTool<{ openCount: number; totalCount: number; groups: unknown[] }>(executedTools, "report_open_tickets");
    expect(openTicketReport.openCount).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(openTicketReport.groups)).toBe(true);

    const activityReport = await callTool<{ count: number; groups: unknown[] }>(executedTools, "report_activity", { limit: 50 });
    expect(activityReport.count).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(activityReport.groups)).toBe(true);

    const workDossier = await callTool<{
      parent: { reference: string; type: string };
      sections: { done: unknown[]; inProgress: unknown[]; waiting: unknown[] };
      summary: { openTaskCount: number };
    }>(executedTools, "report_work_dossier", { reference: `PROJ-${project.id}` });
    expect(workDossier.parent).toMatchObject({ reference: `PROJ-${project.id}`, type: "project" });
    expect(Array.isArray(workDossier.sections.waiting)).toBe(true);
    expect(workDossier.summary.openTaskCount).toBeGreaterThanOrEqual(1);

    const createdWikiPage = await callTool<WikiPage>(executedTools, "create_wiki_page", {
      title: "MCP Wiki Seite",
      content: "# Überschrift\n\nEin Absatz mit **fett**."
    });
    expect(createdWikiPage).toMatchObject({ title: "MCP Wiki Seite" });
    expect(createdWikiPage.content).toContain("<h1>Überschrift</h1>");

    const wikiRoots = await callTool<WikiPage[]>(executedTools, "list_wiki_pages");
    expect(wikiRoots).toEqual(expect.arrayContaining([expect.objectContaining({ id: createdWikiPage.id })]));

    const childWikiPage = await callTool<WikiPage>(executedTools, "create_wiki_page", {
      title: "MCP Unterseite",
      parentId: createdWikiPage.id,
      content: "Inhalt der Unterseite."
    });
    const wikiChildren = await callTool<WikiPage[]>(executedTools, "list_wiki_pages", { parentId: createdWikiPage.id });
    expect(wikiChildren).toEqual(expect.arrayContaining([expect.objectContaining({ id: childWikiPage.id })]));

    const fetchedWikiPage = await callTool<WikiPage>(executedTools, "get_wiki_page", { id: createdWikiPage.id });
    expect(fetchedWikiPage).toMatchObject({ id: createdWikiPage.id, title: "MCP Wiki Seite" });

    const updatedWikiPage = await callTool<WikiPage>(executedTools, "update_wiki_page", {
      id: createdWikiPage.id,
      title: "MCP Wiki Seite aktualisiert",
      content: "<p>Direktes HTML bleibt erhalten.</p>"
    });
    expect(updatedWikiPage).toMatchObject({ title: "MCP Wiki Seite aktualisiert" });
    expect((await seedClient.get<WikiPage>(`wiki/${createdWikiPage.id}`)).content).toBe("<p>Direktes HTML bleibt erhalten.</p>");

    const delProject = await seedClient.post<Project>("projects", { name: "Delete Projekt", status: "active" });
    const delMilestone = await seedClient.post<Milestone>(`projects/${delProject.id}/milestones`, { name: "Delete Meilenstein", status: "active" });
    const delTask = await seedClient.post<Task>(`projects/${delProject.id}/tasks`, { title: "Delete Aufgabe", status: "todo", priority: "medium" });
    const delTicket = await seedClient.post<Ticket>(`projects/${delProject.id}/tickets`, { title: "Delete Ticket", type: "bug", status: "open", priority: "low" });
    const delFeature = await seedClient.post<Feature>("features", { title: "Delete Feature", status: "active" });
    const delUseCase = await seedClient.post<UseCase>(`features/${delFeature.id}/use-cases`, { title: "Delete Use Case", status: "active" });

    const preview = await callTool<{ target: { type: string }; cascadeImpact: { total: number; tasks: number; tickets: number } }>(
      executedTools,
      "preview_delete",
      { reference: `PROJ-${delProject.id}` }
    );
    expect(preview.target.type).toBe("project");
    expect(preview.cascadeImpact.tasks).toBeGreaterThanOrEqual(1);
    expect(preview.cascadeImpact.tickets).toBeGreaterThanOrEqual(1);

    await seedClient.del(`projects/${delProject.id}/tasks/${delTask.id}`);
    await seedClient.del(`projects/${delProject.id}/tickets/${delTicket.id}`);
    expect(await callTool(executedTools, "delete_use_case", { id: delUseCase.id })).toMatchObject({ deleted: true, type: "useCase", id: delUseCase.id });
    expect(await callTool(executedTools, "delete_feature", { id: delFeature.id })).toMatchObject({ deleted: true, type: "feature", id: delFeature.id });
    expect(await callTool(executedTools, "delete_task", { id: delTask.id })).toMatchObject({ deleted: true, type: "task", id: delTask.id });
    expect(await callTool(executedTools, "delete_ticket", { id: delTicket.id })).toMatchObject({ deleted: true, type: "ticket", id: delTicket.id });
    expect(await callTool(executedTools, "delete_milestone", { id: delMilestone.id })).toMatchObject({ deleted: true, type: "milestone", id: delMilestone.id });
    expect(await callTool(executedTools, "delete_project", { id: delProject.id })).toMatchObject({ deleted: true, type: "project", id: delProject.id });

    await expect(seedClient.get<Project>(`projects/${delProject.id}`)).rejects.toThrow();

    expect([...executedTools].sort()).toEqual(expectedToolNames);
  });
});

function parseToolJson<T>(result: ToolCallResponse): T {
  if (!("content" in result)) {
    throw new Error("MCP tool returned no content");
  }
  if ("isError" in result && result.isError) {
    throw new Error(`MCP tool returned an error: ${JSON.stringify(result.content)}`);
  }

  const firstContent = result.content[0];
  if (!firstContent || firstContent.type !== "text") {
    throw new Error("MCP tool returned non-text content");
  }

  return JSON.parse(firstContent.text) as T;
}
