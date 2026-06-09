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
 * - Delete-Tools löschen pro Typ über die DELETE-Endpunkte; preview_delete bleibt read-only.
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
  del: ReturnType<typeof vi.fn>;
}

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

function createMockClient(): MockClient & ProjectManagerApiClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    postForm: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    del: vi.fn()
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
      "add_attachments_to_parent",
      "add_comments_to_parent",
      "add_notes_to_parent",
      "add_task_list_to_parent",
      "add_ticket_list_to_parent",
      "link_task_to_parent",
      "link_ticket_to_parent",
      "update_project",
      "update_milestone",
      "update_task",
      "update_ticket",
      "update_feature",
      "update_use_case",
      "resolve_reference",
      "get_reference_context",
      "list_all_tasks",
      "list_all_tickets",
      "preview_delete",
      "delete_project",
      "delete_milestone",
      "delete_task",
      "delete_ticket",
      "delete_feature",
      "delete_use_case",
      "report_open_tasks",
      "report_open_tickets",
      "report_activity"
    ]));
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
      description: "<p>Beschreibung</p>",
      status: "active",
      color: "#2563eb",
      startDate: "2026-05-01",
      dueDate: "2026-06-01"
    });
    expect(client.post).toHaveBeenNthCalledWith(2, "projects/1/milestones", {
      name: "MCP Meilenstein",
      description: "<p>Ziel</p>",
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
      responsibleUserId: 7,
      dueDate: "2026-05-30"
    });

    expect(client.post).toHaveBeenCalledWith("milestones/7/tasks", {
      title: "Projektbeschreibung redigieren",
      description: "<p>Bitte Tonalität vereinheitlichen.</p>",
      status: "todo",
      priority: "medium",
      responsibleUserId: 7,
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

  it("creates bulk notes and comments with the expected parent paths", async () => {
    const client = createMockClient();
    client.post
      .mockResolvedValueOnce({ id: 1, title: "Notiz 1" })
      .mockResolvedValueOnce({ id: 2, title: "Notiz 2" })
      .mockResolvedValueOnce({ id: 3, body: "Kommentar 1" })
      .mockResolvedValueOnce({ id: 4, body: "Kommentar 2" });

    const notesResult = (await tool("add_notes_to_parent", client).execute({
      parentType: "task",
      parentId: 9,
      notes: [
        { title: "Notiz 1", text: "**Erste** Notiz" },
        { title: "Notiz 2", text: "Zweite Notiz" }
      ]
    })) as BulkResult<{ id: number }>;
    const commentsResult = (await tool("add_comments_to_parent", client).execute({
      parentType: "ticket",
      parentId: 8,
      comments: [{ body: "Kommentar 1" }, { body: "Kommentar 2" }]
    })) as BulkResult<{ id: number }>;

    expect(notesResult).toMatchObject({ requested: 2, createdCount: 2, errorCount: 0 });
    expect(commentsResult).toMatchObject({ requested: 2, createdCount: 2, errorCount: 0 });
    expect(client.post.mock.calls.map(([path]) => path)).toEqual([
      "tasks/9/notes",
      "tasks/9/notes",
      "tickets/8/comments",
      "tickets/8/comments"
    ]);
    expect(client.post.mock.calls[0]?.[1]).toEqual({ title: "Notiz 1", contentJson: { html: "<p><strong>Erste</strong> Notiz</p>" } });
    expect(client.post.mock.calls[2]?.[1]).toEqual({ body: "<p>Kommentar 1</p>" });
  });

  it("uploads bulk attachments to the same parent serially", async () => {
    const client = createMockClient();
    client.postForm.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ id: 2 });

    const result = (await tool("add_attachments_to_parent", client).execute({
      parentType: "feature",
      parentId: 4,
      attachments: [
        {
          fileName: "one.txt",
          contentBase64: Buffer.from("one", "utf8").toString("base64"),
          mimetype: "text/plain"
        },
        {
          fileName: "two.txt",
          contentBase64: Buffer.from("two", "utf8").toString("base64"),
          mimetype: "text/plain"
        }
      ]
    })) as BulkResult<{ id: number }>;

    expect(result).toMatchObject({ requested: 2, createdCount: 2, errorCount: 0 });
    expect(client.postForm.mock.calls.map(([path]) => path)).toEqual(["features/4/attachments", "features/4/attachments"]);
    const uploadedFile = (client.postForm.mock.calls[1]?.[1] as FormData).get("file");
    expect(uploadedFile).toBeInstanceOf(Blob);
    expect((uploadedFile as File).name).toBe("two.txt");
    await expect((uploadedFile as Blob).text()).resolves.toBe("two");
  });

  it("creates task and ticket lists with one optional attachment per created item", async () => {
    const client = createMockClient();
    client.post
      .mockResolvedValueOnce({ id: 10, title: "Task mit Datei" })
      .mockResolvedValueOnce({ id: 11, title: "Task ohne Datei" })
      .mockResolvedValueOnce({ id: 20, title: "Ticket mit Datei" });
    client.postForm.mockResolvedValueOnce({ id: 30 }).mockResolvedValueOnce({ id: 40 });

    const taskResult = (await tool("add_task_list_to_parent", client).execute({
      parentType: "feature",
      parentId: 4,
      tasks: [
        {
          title: "Task mit Datei",
          description: "Beschreibung",
          status: "todo",
          priority: "medium",
          attachment: {
            fileName: "task.txt",
            contentBase64: Buffer.from("task attachment", "utf8").toString("base64"),
            mimetype: "text/plain"
          }
        },
        {
          title: "Task ohne Datei",
          description: null,
          status: "todo",
          priority: "low"
        }
      ]
    })) as BulkResult<{ task: { id: number }; attachment?: { id: number } }>;

    const ticketResult = (await tool("add_ticket_list_to_parent", client).execute({
      parentType: "task",
      parentId: 10,
      tickets: [
        {
          title: "Ticket mit Datei",
          type: "bug",
          description: "Beschreibung",
          status: "open",
          priority: "high",
          attachment: {
            fileName: "ticket.txt",
            contentBase64: Buffer.from("ticket attachment", "utf8").toString("base64"),
            mimetype: "text/plain"
          }
        }
      ]
    })) as BulkResult<{ ticket: { id: number }; attachment?: { id: number } }>;

    expect(taskResult).toMatchObject({
      requested: 2,
      createdCount: 2,
      errorCount: 0,
      created: [
        { index: 0, result: { task: { id: 10 }, attachment: { id: 30 } } },
        { index: 1, result: { task: { id: 11 } } }
      ]
    });
    expect(ticketResult).toMatchObject({
      requested: 1,
      createdCount: 1,
      errorCount: 0,
      created: [{ index: 0, result: { ticket: { id: 20 }, attachment: { id: 40 } } }]
    });
    expect(client.post.mock.calls).toEqual([
      [
        "features/4/tasks",
        {
          title: "Task mit Datei",
          description: "<p>Beschreibung</p>",
          status: "todo",
          priority: "medium"
        }
      ],
      [
        "features/4/tasks",
        {
          title: "Task ohne Datei",
          description: null,
          status: "todo",
          priority: "low"
        }
      ],
      [
        "tasks/10/tickets",
        {
          title: "Ticket mit Datei",
          type: "bug",
          description: "<p>Beschreibung</p>",
          status: "open",
          priority: "high"
        }
      ]
    ]);
    expect(client.postForm.mock.calls.map(([path]) => path)).toEqual(["tasks/10/attachments", "tickets/20/attachments"]);
  });

  it("rejects invalid bulk item attachment content before creating the task", async () => {
    const client = createMockClient();

    const result = (await tool("add_task_list_to_parent", client).execute({
      parentType: "project",
      parentId: 1,
      tasks: [
        {
          title: "Ungültige Datei",
          attachment: {
            fileName: "invalid.txt",
            contentBase64: "not-base64"
          }
        }
      ]
    })) as BulkResult<{ task: { id: number } }>;

    expect(result).toMatchObject({
      requested: 1,
      createdCount: 0,
      errorCount: 1,
      errors: [{ index: 0, stage: "attachment" }]
    });
    expect(client.post).not.toHaveBeenCalled();
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
      responsibleUserId: null,
      dueDate: "2026-06-10"
    });

    expect(client.get).toHaveBeenCalledWith("tasks/5");
    expect(client.patch).toHaveBeenCalledWith("tasks/5", {
      title: "Neue Aufgabe",
      description: "<p>Neu</p>",
      status: "in_progress",
      priority: "high",
      responsibleUserId: null,
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

  it("deletes each domain type over the matching DELETE endpoint", async () => {
    const cases: Array<{ name: string; path: string; type: string }> = [
      { name: "delete_project", path: "projects/1", type: "project" },
      { name: "delete_milestone", path: "milestones/2", type: "milestone" },
      { name: "delete_task", path: "tasks/3", type: "task" },
      { name: "delete_ticket", path: "tickets/4", type: "ticket" },
      { name: "delete_feature", path: "features/5", type: "feature" },
      { name: "delete_use_case", path: "use-cases/6", type: "useCase" }
    ];

    for (const testCase of cases) {
      const client = createMockClient();
      client.del.mockResolvedValue(undefined);
      const id = Number.parseInt(testCase.path.split("/")[1] ?? "0", 10);

      const result = await tool(testCase.name, client).execute({ id });

      expect(client.del).toHaveBeenCalledWith(testCase.path);
      expect(result).toEqual({ deleted: true, type: testCase.type, id });
    }
  });

  it("previews deletion impact without calling DELETE", async () => {
    const client = createMappedClient({
      "tasks/3": { id: 3, subtasks: [{ id: 7 }], notes: [{ id: 1 }], comments: [], attachments: [] },
      "tasks/3/tickets": [],
      "tasks/7": { id: 7, subtasks: [], notes: [], comments: [{ id: 2 }], attachments: [] },
      "tasks/7/tickets": []
    });

    const preview = await tool("preview_delete", client).execute({ reference: "TASK-3" });

    expect(client.del).not.toHaveBeenCalled();
    expect(preview).toMatchObject({
      normalizedReference: "TASK-3",
      target: { type: "task", reference: "TASK-3" },
      cascadeImpact: { tasks: 1, notes: 1, comments: 1, total: 1 }
    });
  });

  it("reports open tasks grouped by parent context and skips closed statuses", async () => {
    const client = createMappedClient({
      tasks: [
        { id: 1, title: "Offen A", status: "todo", priority: "high", dueDate: null, updatedAt: "2026-06-01T00:00:00.000Z", responsibleUser: { fullName: "Rose, Rene" }, parentContexts: [{ type: "milestone", id: 65, label: "MCP", origin: "direct" }] },
        { id: 2, title: "Offen B", status: "in_progress", priority: "medium", dueDate: null, updatedAt: "2026-06-02T00:00:00.000Z", responsibleUser: null, parentContexts: [] },
        { id: 3, title: "Erledigt", status: "done", priority: "low", dueDate: null, updatedAt: "2026-06-03T00:00:00.000Z", responsibleUser: null, parentContexts: [{ type: "milestone", id: 65, label: "MCP", origin: "direct" }] }
      ],
      catalogs: [
        { kind: "workStatus", key: "todo", isClosed: false },
        { kind: "workStatus", key: "in_progress", isClosed: false },
        { kind: "workStatus", key: "done", isClosed: true }
      ]
    });

    const report = await tool("report_open_tasks", client).execute({});

    expect(report).toMatchObject({ totalCount: 3, openCount: 2 });
    const result = report as { groups: Array<{ context: { id: number } | null; itemCount: number; items: Array<{ reference: string }> }> };
    const milestoneGroup = result.groups.find((group) => group.context?.id === 65);
    expect(milestoneGroup?.items.map((item) => item.reference)).toEqual(["TASK-1"]);
    const neutralGroup = result.groups.find((group) => group.context === null);
    expect(neutralGroup?.items.map((item) => item.reference)).toEqual(["TASK-2"]);
  });

  it("reports the activity journal grouped by primary context", async () => {
    const client = createMappedClient({
      "journal?limit=100": {
        entries: [
          {
            id: 10,
            operation: "update",
            objectType: "comment",
            objectId: 5,
            objectLabel: "Kommentar",
            summary: "Kommentar geändert",
            actorName: "Rose, Rene",
            createdAt: "2026-06-09T10:00:00.000Z",
            changes: [],
            contexts: [{ id: 1, objectType: "task", objectId: 3, objectLabel: "Aufgabe", relation: "parent" }]
          }
        ],
        nextCursor: null
      }
    });

    const report = await tool("report_activity", client).execute({});

    expect(report).toMatchObject({ count: 1, nextCursor: null });
    const result = report as { groups: Array<{ context: { type: string; id: number }; entries: Array<{ id: number }> }> };
    expect(result.groups[0]?.context).toMatchObject({ type: "task", id: 3 });
    expect(result.groups[0]?.entries[0]?.id).toBe(10);
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
