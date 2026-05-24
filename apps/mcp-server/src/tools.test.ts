import { describe, expect, it, vi } from "vitest";
import { ProjectManagerApiError, type ProjectManagerApiClient } from "./api-client.js";
import { parseReferenceInput, type ReferenceContext } from "./reference-context.js";
import { createToolDefinitions } from "./tools.js";
import { errorResult } from "./tool-result.js";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - MCP-v1 bietet vollständige Create-, Update- und Resolve-Tools an.
 * - Destruktive Delete-Tools bleiben bewusst außerhalb der MCP-Oberfläche.
 * - Schreibende Tools befüllen Stammdatenfelder und verwenden Versionsschutz.
 * - Feature-Verknüpfungen erhalten bestehende Links.
 *
 * Fehlerfälle:
 * - Ungültige Objekt-Referenzen werden abgelehnt.
 * - API-Fehler werden als MCP-Tool-Fehlerresultat zurückgegeben.
 *
 * Ziel:
 * Der MCP-Tool-Kern bleibt ohne laufende API deterministisch prüfbar.
 */

interface MockClient {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  postForm: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
}

function createMockClient(): MockClient & ProjectManagerApiClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    postForm: vi.fn(),
    patch: vi.fn(),
    put: vi.fn()
  } as unknown as MockClient & ProjectManagerApiClient;
}

function createMappedClient(responses: Record<string, unknown>): MockClient & ProjectManagerApiClient {
  const client = createMockClient();
  client.get.mockImplementation((path: string) => {
    if (!Object.hasOwn(responses, path)) {
      return Promise.reject(new Error(`Unexpected GET ${path}`));
    }
    return Promise.resolve(responses[path]);
  });
  return client;
}

function tool(name: string, client: ProjectManagerApiClient) {
  const found = createToolDefinitions(client).find((definition) => definition.name === name);
  if (!found) {
    throw new Error(`Tool ${name} not found`);
  }
  return found;
}

describe("MCP tool definitions", () => {
  it("exposes complete update, create and resolve tools without delete tools", () => {
    const names = createToolDefinitions(createMockClient()).map((definition) => definition.name);

    expect(names).toContain("assign_editorial_task");
    expect(names).toEqual(expect.arrayContaining([
      "create_project",
      "create_milestone",
      "add_attachment_to_parent",
      "link_task_to_parent",
      "link_ticket_to_parent",
      "update_project",
      "update_milestone",
      "update_task",
      "update_ticket",
      "update_feature",
      "update_use_case",
      "resolve_reference",
      "get_reference_context"
    ]));
    expect(names.some((name) => name.startsWith("delete_"))).toBe(false);
    [
      "update_project_description",
      "update_milestone_description",
      "update_task_description",
      "update_ticket_description",
      "update_feature_content",
      "update_use_case_content"
    ].forEach((oldName) => expect(names).not.toContain(oldName));
    expect(names.some((name) => name.includes("restore"))).toBe(false);
    expect(names.some((name) => name.includes("dump"))).toBe(false);
  });

  it("creates projects and milestones with full metadata fields", async () => {
    const client = createMockClient();
    client.post.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ id: 2 });

    await tool("create_project", client).execute({
      name: "MCP Projekt",
      description: "Beschreibung",
      status: "active",
      color: "#2563eb",
      startDate: "2026-05-01",
      dueDate: "2026-06-01"
    });
    await tool("create_milestone", client).execute({
      projectId: 1,
      name: "MCP Meilenstein",
      description: "Ziel",
      status: "todo",
      color: null,
      startDate: null,
      dueDate: "2026-06-15"
    });

    expect(client.post).toHaveBeenNthCalledWith(1, "projects", {
      name: "MCP Projekt",
      description: "Beschreibung",
      status: "active",
      color: "#2563eb",
      startDate: "2026-05-01",
      dueDate: "2026-06-01"
    });
    expect(client.post).toHaveBeenNthCalledWith(2, "projects/1/milestones", {
      name: "MCP Meilenstein",
      description: "Ziel",
      status: "todo",
      color: null,
      startDate: null,
      dueDate: "2026-06-15"
    });
  });

  it("creates editorial tasks with the expected parent path and metadata fields", async () => {
    const client = createMockClient();
    client.post.mockResolvedValue({ id: 42 });

    await tool("assign_editorial_task", client).execute({
      parentType: "milestone",
      parentId: 7,
      title: "Projektbeschreibung redigieren",
      editorialBrief: "Bitte Tonalität vereinheitlichen.",
      assignee: "Rene",
      dueDate: "2026-05-30"
    });

    expect(client.post).toHaveBeenCalledWith("milestones/7/tasks", {
      title: "Projektbeschreibung redigieren",
      description: "Bitte Tonalität vereinheitlichen.",
      status: "todo",
      priority: "medium",
      assignee: "Rene",
      dueDate: "2026-05-30"
    });
  });

  it("links existing tasks and tickets to all supported owner parents", async () => {
    const client = createMockClient();
    client.post.mockResolvedValue({ id: 1 });

    const parents = [
      { parentType: "project", parentId: 1, path: "projects/1" },
      { parentType: "milestone", parentId: 2, path: "milestones/2" },
      { parentType: "feature", parentId: 3, path: "features/3" },
      { parentType: "useCase", parentId: 4, path: "use-cases/4" }
    ] as const;

    for (const parent of parents) {
      await tool("link_task_to_parent", client).execute({
        parentType: parent.parentType,
        parentId: parent.parentId,
        taskId: 42
      });
      await tool("link_ticket_to_parent", client).execute({
        parentType: parent.parentType,
        parentId: parent.parentId,
        ticketId: 99
      });
    }

    expect(client.post.mock.calls).toEqual([
      ["projects/1/tasks/42", {}],
      ["projects/1/tickets/99", {}],
      ["milestones/2/tasks/42", {}],
      ["milestones/2/tickets/99", {}],
      ["features/3/tasks/42", {}],
      ["features/3/tickets/99", {}],
      ["use-cases/4/tasks/42", {}],
      ["use-cases/4/tickets/99", {}]
    ]);
  });

  it("rejects unsupported task and ticket link parents before calling the API", async () => {
    const client = createMockClient();

    expect(() =>
      tool("link_task_to_parent", client).execute({
        parentType: "task",
        parentId: 5,
        taskId: 42
      })
    ).toThrow();
    expect(() =>
      tool("link_ticket_to_parent", client).execute({
        parentType: "ticket",
        parentId: 6,
        ticketId: 99
      })
    ).toThrow();

    expect(client.post).not.toHaveBeenCalled();
  });

  it("uploads attachments to all supported owner parents", async () => {
    const client = createMockClient();
    client.postForm.mockResolvedValue({ id: 7 });
    const contentBase64 = Buffer.from("MCP attachment content", "utf8").toString("base64");
    const parents = [
      { parentType: "project", parentId: 1, path: "projects/1" },
      { parentType: "milestone", parentId: 2, path: "milestones/2" },
      { parentType: "task", parentId: 3, path: "tasks/3" },
      { parentType: "feature", parentId: 4, path: "features/4" },
      { parentType: "ticket", parentId: 5, path: "tickets/5" }
    ] as const;

    for (const parent of parents) {
      await tool("add_attachment_to_parent", client).execute({
        parentType: parent.parentType,
        parentId: parent.parentId,
        fileName: `${parent.parentType}.txt`,
        contentBase64,
        mimetype: "text/plain"
      });
    }

    expect(client.postForm.mock.calls.map(([path]) => path)).toEqual(parents.map((parent) => `${parent.path}/attachments`));
    const firstFormData = client.postForm.mock.calls[0]?.[1];
    expect(firstFormData).toBeInstanceOf(FormData);
    const uploadedFile = (firstFormData as FormData).get("file");
    expect(uploadedFile).toBeInstanceOf(Blob);
    expect((uploadedFile as File).name).toBe("project.txt");
    expect((uploadedFile as Blob).type).toBe("text/plain");
    await expect((uploadedFile as Blob).text()).resolves.toBe("MCP attachment content");
  });

  it("rejects unsupported attachment parents before calling the API", async () => {
    const client = createMockClient();

    expect(() =>
      tool("add_attachment_to_parent", client).execute({
        parentType: "useCase",
        parentId: 6,
        fileName: "use-case.txt",
        contentBase64: Buffer.from("unsupported", "utf8").toString("base64")
      })
    ).toThrow();

    expect(client.postForm).not.toHaveBeenCalled();
  });

  it("updates tasks with the current expectedVersion and full fields", async () => {
    const client = createMockClient();
    client.get.mockResolvedValue({ id: 5, version: 3 });
    client.patch.mockResolvedValue({ id: 5, description: "Neu", version: 4 });

    await tool("update_task", client).execute({
      id: 5,
      title: "Neue Aufgabe",
      description: "Neu",
      status: "in_progress",
      priority: "high",
      assignee: null,
      dueDate: "2026-06-10"
    });

    expect(client.get).toHaveBeenCalledWith("tasks/5");
    expect(client.patch).toHaveBeenCalledWith("tasks/5", {
      title: "Neue Aufgabe",
      description: "Neu",
      status: "in_progress",
      priority: "high",
      assignee: null,
      dueDate: "2026-06-10",
      expectedVersion: 3
    });
  });

  it.each([
    ["PROJ-1", "projects/1"],
    ["ms-2", "milestones/2"],
    ["TASK-3", "tasks/3"],
    ["tkt-4", "tickets/4"],
    ["FEAT-5", "features/5"],
    ["uc-6", "use-cases/6"]
  ])("resolves object reference %s", async (reference, path) => {
    const client = createMockClient();
    client.get.mockResolvedValue({ id: 1 });

    await tool("resolve_reference", client).execute({ reference });

    expect(client.get).toHaveBeenCalledWith(path);
  });

  it("rejects invalid object references", async () => {
    const client = createMockClient();

    await expect(tool("resolve_reference", client).execute({ reference: "TASK#10" })).rejects.toThrow("Ungültige Referenz");
    expect(client.get).not.toHaveBeenCalled();
  });

  it.each([
    ["PROJ-1", "project", 1, "PROJ-1"],
    ["ms-2", "milestone", 2, "MS-2"],
    ["TASK-3", "task", 3, "TASK-3"],
    ["tkt-4", "ticket", 4, "TKT-4"],
    ["FEAT-5", "feature", 5, "FEAT-5"],
    ["uc-6", "useCase", 6, "UC-6"],
    ["Meilenstein ID 12 lesen", "milestone", 12, "MS-12"],
    ["Meilenstein-ID 12 lesen", "milestone", 12, "MS-12"],
    ["Ticket 5 prüfen", "ticket", 5, "TKT-5"],
    ["Projekt ID 3 anzeigen", "project", 3, "PROJ-3"]
  ])("parses reference input %s", (input, expectedType, expectedId, expectedReference) => {
    expect(parseReferenceInput(input)).toEqual({
      type: expectedType,
      id: expectedId,
      reference: expectedReference
    });
  });

  it("loads recursive reference context and previews text attachments only", async () => {
    const textAttachment = {
      id: 101,
      originalName: "context.md",
      filename: "context.md",
      mimetype: "text/markdown",
      size: 12,
      url: "/attachments/101",
      owners: [{ type: "project", id: 1 }],
      createdAt: "2026-05-24T00:00:00.000Z",
      updatedAt: "2026-05-24T00:00:00.000Z",
      version: 1
    };
    const imageAttachment = {
      id: 102,
      originalName: "screen.png",
      filename: "screen.png",
      mimetype: "image/png",
      size: 20,
      url: "/attachments/102",
      owners: [{ type: "feature", id: 7 }],
      createdAt: "2026-05-24T00:00:00.000Z",
      updatedAt: "2026-05-24T00:00:00.000Z",
      version: 1
    };
    const taskDetail = {
      id: 3,
      title: "Root task",
      subtasks: [{ id: 4, title: "Subtask" }],
      comments: [],
      notes: [],
      attachments: []
    };
    const ticketDetail = {
      id: 5,
      title: "Root ticket",
      subTickets: [{ id: 6, title: "Subticket" }],
      comments: [],
      notes: [],
      attachments: [],
      relations: [{ id: 501, relationType: "related", direction: "outgoing", ticket: { id: 9, title: "Related ticket" } }]
    };
    const responses: Record<string, unknown> = {
      "projects/1": { id: 1, name: "Projekt" },
      "projects/1/milestones": [{ id: 2, name: "Meilenstein" }],
      "projects/1/tasks": [{ id: 3, title: "Root task" }],
      "projects/1/tickets": [{ id: 5, title: "Root ticket" }],
      "projects/1/features": [{ id: 7, title: "Feature" }],
      "projects/1/notes": [{ id: 201, title: "Notiz", contentJson: {}, version: 1 }],
      "projects/1/comments": [{ id: 301, body: "Kommentar", owners: [] }],
      "projects/1/attachments": [textAttachment],
      "attachments/101/preview": { id: 101, kind: "text", status: "available", label: "MD", previewUrl: null, text: { content: "Kontext", encoding: "utf-8", truncated: false, bytesRead: 7 }, message: null, generatedAt: "2026-05-24T00:00:00.000Z" },
      "milestones/2": { id: 2, name: "Meilenstein" },
      "milestones/2/tasks": [],
      "milestones/2/tickets": [],
      "milestones/2/features": [],
      "milestones/2/notes": [],
      "milestones/2/comments": [],
      "milestones/2/attachments": [],
      "tasks/3": taskDetail,
      "tasks/3/tickets": [{ id: 5, title: "Root ticket" }],
      "tasks/4": { id: 4, title: "Subtask", subtasks: [], comments: [], notes: [], attachments: [] },
      "tasks/4/tickets": [],
      "tickets/5": ticketDetail,
      "tickets/6": { id: 6, title: "Subticket", subTickets: [], comments: [], notes: [], attachments: [], relations: [] },
      "features/7": { id: 7, title: "Feature" },
      "features/7/use-cases": [{ id: 8, title: "Use Case" }],
      "features/7/tasks": [{ id: 3, title: "Root task" }],
      "features/7/tickets": [],
      "features/7/notes": [],
      "features/7/comments": [],
      "features/7/attachments": [imageAttachment],
      "features/7/relations": [{ sourceFeatureId: 7, targetFeatureId: 11, relationType: "related", description: null, targetFeature: { id: 11, title: "Related feature" }, createdAt: "2026-05-24T00:00:00.000Z", updatedAt: "2026-05-24T00:00:00.000Z" }],
      "use-cases/8": { id: 8, title: "Use Case" },
      "use-cases/8/tasks": [],
      "use-cases/8/tickets": [],
      "use-cases/8/comments": []
    };
    const client = createMappedClient(responses);

    const context = (await tool("get_reference_context", client).execute({ reference: "Projekt ID 1" })) as ReferenceContext;

    expect(context.normalizedReference).toBe("PROJ-1");
    expect(context.root.children.milestones[0]?.id).toBe(2);
    expect(context.root.children.features[0]?.children.useCases[0]?.id).toBe(8);
    expect(context.root.support.notes[0]?.id).toBe(201);
    expect(context.root.support.attachments[0]?.preview?.text?.content).toBe("Kontext");
    expect(context.root.children.features[0]?.support.attachments[0]?.preview).toBeNull();

    const calls = client.get.mock.calls.map(([path]) => path);
    expect(calls).toContain("attachments/101/preview");
    expect(calls).not.toContain("attachments/102/preview");
    expect(calls.filter((path) => path === "tasks/3/tickets")).toHaveLength(1);
  });

  it("rejects invalid reference context requests before calling the API", async () => {
    const client = createMockClient();

    await expect(tool("get_reference_context", client).execute({ reference: "ID 12" })).rejects.toThrow("Ungültige Referenz");
    expect(client.get).not.toHaveBeenCalled();
  });

  it("links features without dropping existing parent feature links", async () => {
    const client = createMockClient();
    client.get.mockResolvedValue([{ id: 2 }, { id: 4 }]);
    client.put.mockResolvedValue([{ id: 2 }, { id: 4 }, { id: 9 }]);

    await tool("link_feature_to_parent", client).execute({ parentType: "project", parentId: 1, featureId: 9 });

    expect(client.get).toHaveBeenCalledWith("projects/1/features");
    expect(client.put).toHaveBeenCalledWith("projects/1/features", { featureIds: [2, 4, 9] });
  });

  it("formats API errors as MCP error results", () => {
    const result = errorResult(
      new ProjectManagerApiError({
        error: "FORBIDDEN",
        message: "Permission denied",
        statusCode: 403
      })
    );

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("FORBIDDEN");
    expect(result.content[0]?.text).toContain("Permission denied");
  });
});
