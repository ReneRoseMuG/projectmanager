import { describe, expect, it, vi } from "vitest";
import { ProjectManagerApiError, type ProjectManagerApiClient } from "./api-client.js";
import { createToolDefinitions } from "./tools.js";
import { errorResult } from "./tool-result.js";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - MCP-v1 bietet nur nicht-destruktive Tools an.
 * - Schreibende Tools befüllen Stammdatenfelder und verwenden Versionsschutz.
 * - Feature-Verknüpfungen erhalten bestehende Links.
 *
 * Fehlerfälle:
 * - API-Fehler werden als MCP-Tool-Fehlerresultat zurückgegeben.
 *
 * Ziel:
 * Der MCP-Tool-Kern bleibt ohne laufende API deterministisch prüfbar.
 */

interface MockClient {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
}

function createMockClient(): MockClient & ProjectManagerApiClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
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
  it("does not expose destructive tools in v1", () => {
    const names = createToolDefinitions(createMockClient()).map((definition) => definition.name);

    expect(names).toContain("assign_editorial_task");
    expect(names.some((name) => name.includes("delete"))).toBe(false);
    expect(names.some((name) => name.includes("restore"))).toBe(false);
    expect(names.some((name) => name.includes("dump"))).toBe(false);
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

  it("updates task descriptions with the current expectedVersion", async () => {
    const client = createMockClient();
    client.get.mockResolvedValue({ id: 5, version: 3 });
    client.patch.mockResolvedValue({ id: 5, description: "Neu", version: 4 });

    await tool("update_task_description", client).execute({ id: 5, description: "Neu" });

    expect(client.get).toHaveBeenCalledWith("tasks/5");
    expect(client.patch).toHaveBeenCalledWith("tasks/5", { description: "Neu", expectedVersion: 3 });
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
