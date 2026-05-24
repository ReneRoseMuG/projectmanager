import { describe, expect, it, vi } from "vitest";
import { ProjectManagerApiError, type ProjectManagerApiClient } from "./api-client.js";
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
      "resolve_reference"
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
