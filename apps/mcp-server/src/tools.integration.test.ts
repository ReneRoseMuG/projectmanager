import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type {
  Attachment,
  CatalogEntry,
  Comment,
  Feature,
  Milestone,
  Note,
  Project,
  Task,
  Ticket,
  UseCase,
  UserOption
} from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../../tests/fixtures/api/index.js";
import { ProjectManagerApiClient } from "./api-client.js";
import type { ReferenceContext } from "./reference-context.js";
import { createProjectManagerMcpServer } from "./server.js";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Jedes verfügbare MCP-v1-Tool wird einmal über den MCP-Transport ausgeführt.
 * - Die Tools arbeiten gegen echte Fastify-Routen mit isolierter Temp-SQLite-Datenbank.
 * - Attachment-Uploads verwenden ein isoliertes Temp-Upload-Verzeichnis.
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

    testDb = createTestDb();
    truncateAll(testDb.sqlite);
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
    await mcpClient.close();
    await mcpServer.close();
    await app.close();
    testDb.sqlite.close();
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
    expect(createdTask).toMatchObject({ title: "MCP Tool Aufgabe", description: "Per MCP angelegt" });

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
      description: "Bitte fachlich überarbeiten.",
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

    const comment = await callTool<Comment>(executedTools, "add_comment_to_parent", {
      parentType: "project",
      parentId: project.id,
      body: "MCP Kommentar"
    });
    expect(comment).toMatchObject({ body: "MCP Kommentar" });

    const note = await callTool<Note>(executedTools, "add_note_to_parent", {
      parentType: "project",
      parentId: project.id,
      title: "MCP Notiz",
      text: "Absatz eins\n\nAbsatz zwei"
    });
    expect(note.title).toBe("MCP Notiz");
    expect(note.contentJson).toMatchObject({ type: "doc" });

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

    const context = await callTool<ReferenceContext>(executedTools, "get_reference_context", { reference: `PROJ-${project.id}` });
    expect(context.normalizedReference).toBe(`PROJ-${project.id}`);
    expect(context.root.children.milestones).toEqual(expect.arrayContaining([expect.objectContaining({ id: milestone.id })]));
    expect(context.root.children.tasks).toEqual(expect.arrayContaining([expect.objectContaining({ id: task.id })]));
    expect(context.root.children.tickets).toEqual(expect.arrayContaining([expect.objectContaining({ id: ticket.id })]));
    expect(context.root.children.features).toEqual(expect.arrayContaining([expect.objectContaining({ id: feature.id })]));
    expect(context.root.support.notes).toEqual(expect.arrayContaining([expect.objectContaining({ id: note.id, title: "MCP Notiz" })]));
    expect(context.root.support.comments).toEqual(expect.arrayContaining([expect.objectContaining({ id: comment.id, body: "MCP Kommentar" })]));
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
      description: "Projektbeschreibung MCP",
      dueDate: "2026-08-01"
    });
    expect(
      await callTool<Milestone>(executedTools, "update_milestone", { id: milestone.id, name: "MCP Meilenstein aktualisiert", description: "Meilensteinbeschreibung MCP", status: "active", color: "#14b8a6", startDate: null, dueDate: "2026-07-15" })
    ).toMatchObject({ name: "MCP Meilenstein aktualisiert", description: "Meilensteinbeschreibung MCP", dueDate: "2026-07-15" });
    expect(await callTool<Task>(executedTools, "update_task", { id: task.id, title: "MCP Aufgabe aktualisiert", description: "Aufgabenbeschreibung MCP", status: "in_progress", priority: "high", responsibleUserId: 1, dueDate: "2026-06-20" })).toMatchObject({
      title: "MCP Aufgabe aktualisiert",
      description: "Aufgabenbeschreibung MCP",
      priority: "high"
    });
    expect(await callTool<Ticket>(executedTools, "update_ticket", { id: ticket.id, title: "MCP Ticket aktualisiert", type: "bug", description: "Ticketbeschreibung MCP", status: "resolved", priority: "high", reporterUserId: 1, responsibleUserId: 1, environment: "Integrationstest", affectedVersion: "0.2.0", dueDate: "2026-06-30", resolution: "fixed" })).toMatchObject({
      title: "MCP Ticket aktualisiert",
      description: "Ticketbeschreibung MCP",
      resolution: "fixed"
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
    ).toMatchObject({ title: "MCP Tool Feature aktualisiert", description: "Featurebeschreibung MCP", content: "# Aktualisiertes Feature", sortOrder: 20 });

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
    ).toMatchObject({ title: "MCP Tool Use Case aktualisiert", description: "Use-Case-Beschreibung MCP", content: "# Aktualisierter Use Case", sortOrder: 30 });

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
