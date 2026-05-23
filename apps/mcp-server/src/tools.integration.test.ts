import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type {
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
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../../tests/fixtures/api/index.js";
import { ProjectManagerApiClient } from "./api-client.js";
import { createProjectManagerMcpServer } from "./server.js";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Jedes verfügbare MCP-v1-Tool wird einmal über den MCP-Transport ausgeführt.
 * - Die Tools arbeiten gegen echte Fastify-Routen mit isolierter Temp-SQLite-Datenbank.
 * - Schreibende Tools erzeugen beobachtbare Daten oder versionsgeschützte Updates.
 *
 * Fehlerfälle:
 * - MCP-Tool-Fehler würden als isError-Ergebnis sichtbar und brechen den Test.
 *
 * Ziel:
 * Die MCP-Tool-Matrix bleibt vollständig gegen echte Projekt-Manager-Daten abgesichert.
 */

type ToolCallResponse = Awaited<ReturnType<Client["callTool"]>>;

const apiKey = "mcp-integration-api-key";

describe("MCP tools integration", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let apiBaseUrl: string;
  let seedClient: ProjectManagerApiClient;
  let mcpClient: Client;
  let mcpServer: ReturnType<typeof createProjectManagerMcpServer>;

  beforeAll(async () => {
    process.env.API_KEY = apiKey;

    testDb = createTestDb();
    truncateAll(testDb.sqlite);
    app = await buildTestApp(testDb, { enableAuth: true });
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

    const createdTask = await callTool<Task>(executedTools, "add_task_to_parent", {
      parentType: "project",
      parentId: project.id,
      title: "MCP Tool Aufgabe",
      description: "Per MCP angelegt",
      status: "todo",
      priority: "medium",
      assignee: "Test Admin",
      dueDate: "2026-06-01"
    });
    expect(createdTask).toMatchObject({ title: "MCP Tool Aufgabe", description: "Per MCP angelegt" });

    const editorialTask = await callTool<Task>(executedTools, "assign_editorial_task", {
      parentType: "milestone",
      parentId: milestone.id,
      title: "Redaktion: Beschreibung schärfen",
      editorialBrief: "Bitte fachlich überarbeiten.",
      assignee: "Test Admin",
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
      reporter: "Test Admin",
      assignee: "Test Admin",
      environment: "Integrationstest",
      affectedVersion: "0.1.0",
      dueDate: "2026-06-03"
    });
    expect(createdTicket).toMatchObject({ title: "MCP Tool Ticket", environment: "Integrationstest" });

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

    expect(await callTool<Project>(executedTools, "update_project_description", { id: project.id, description: "Projektbeschreibung MCP" })).toMatchObject({
      description: "Projektbeschreibung MCP"
    });
    expect(
      await callTool<Milestone>(executedTools, "update_milestone_description", { id: milestone.id, description: "Meilensteinbeschreibung MCP" })
    ).toMatchObject({ description: "Meilensteinbeschreibung MCP" });
    expect(await callTool<Task>(executedTools, "update_task_description", { id: task.id, description: "Aufgabenbeschreibung MCP" })).toMatchObject({
      description: "Aufgabenbeschreibung MCP"
    });
    expect(await callTool<Ticket>(executedTools, "update_ticket_description", { id: ticket.id, description: "Ticketbeschreibung MCP" })).toMatchObject({
      description: "Ticketbeschreibung MCP"
    });

    const createdFeature = await callTool<Feature>(executedTools, "create_feature", {
      title: "MCP Tool Feature",
      description: "Per MCP angelegtes Feature",
      status: "active",
      content: "# Tool Feature"
    });
    expect(createdFeature).toMatchObject({ title: "MCP Tool Feature" });

    expect(
      await callTool<Feature>(executedTools, "update_feature_content", {
        id: createdFeature.id,
        description: "Featurebeschreibung MCP",
        content: "# Aktualisiertes Feature"
      })
    ).toMatchObject({ description: "Featurebeschreibung MCP", content: "# Aktualisiertes Feature" });

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
      await callTool<UseCase>(executedTools, "update_use_case_content", {
        id: createdUseCase.id,
        description: "Use-Case-Beschreibung MCP",
        content: "# Aktualisierter Use Case"
      })
    ).toMatchObject({ description: "Use-Case-Beschreibung MCP", content: "# Aktualisierter Use Case" });

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
