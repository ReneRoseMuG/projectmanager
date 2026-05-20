import type { Attachment, BacklogItem, CatalogEntry, Comment, Event, Feature, FeatureRelation, Milestone, Note, Project, Tag, Task, TaskBoardItem, TaskDetail, Ticket, UseCase, WikiImportReport } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { vitestRuntimeRoot } from "./runtime-safety.js";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Alle API-Route-Gruppen laufen gegen eine isolierte SQLite-DB.
 * - Multipart-Uploads werden persistiert und statisch ausgeliefert.
 * - Defaults aus Schema und Services bleiben konsistent.
 *
 * Fehlerfälle:
 * - contentJson akzeptiert nur JSON-Objekte.
 * - Upload ohne Datei wird als BAD_REQUEST abgelehnt.
 *
 * Ziel:
 * Die HTTP-Verträge der Projekt Manager API werden über echte Fastify-Routen und eine Temp-DB abgesichert.
 */
describe("Projekt Manager API integration", () => {
  let app: FastifyInstance;
  let api: ReturnType<typeof request.agent>;
  let tempDir: string;
  let closeDatabase: (() => void) | null = null;

  beforeAll(async () => {
    tempDir = path.join(vitestRuntimeRoot, "app-integration");
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(path.join(tempDir, "data"), { recursive: true });
    process.env.DATABASE_PATH = path.join(tempDir, "data", "taskmanager.sqlite");
    process.env.UPLOAD_DIR = path.join(tempDir, "uploads");
    process.env.PREVIEW_CACHE_DIR = path.join(tempDir, "previews");
    process.env.CONTENT_DIR = path.join(tempDir, "content");
    process.env.BACKUP_WORK_DIR = path.join(tempDir, "backups");
    process.env.PORT = "0";
    process.env.ADMIN_EMAIL = "admin@local";
    process.env.ADMIN_FIRST_NAME = "Integration";
    process.env.ADMIN_LAST_NAME = "Admin";
    process.env.ADMIN_INITIAL_PASSWORD = "password123";
    process.env.SESSION_SECRET = "integration-session-secret-change-me-12345";

    const dbModule = await import("./db/client.js");
    const migrationsFolder = fileURLToPath(new URL("./db/migrations", import.meta.url));

    dbModule.sqlite.pragma("foreign_keys = OFF");
    migrate(dbModule.db, { migrationsFolder });
    dbModule.sqlite.pragma("foreign_keys = ON");
    expect(dbModule.sqlite.pragma("foreign_key_check")).toEqual([]);
    closeDatabase = () => dbModule.sqlite.close();

    const appModule = await import("./app.js");
    app = await appModule.buildApp();
    await app.ready();
    api = request.agent(app.server);
    await api.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
  });

  afterAll(async () => {
    await app.close();
    closeDatabase?.();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function trimCatalog(kind: CatalogEntry["kind"], keepKeys: string[]): Promise<CatalogEntry[]> {
    const entries = (await api.get(`/api/catalogs/${kind}`).expect(200)).body as CatalogEntry[];
    const removed = entries.filter((entry) => !keepKeys.includes(entry.key));
    for (const entry of removed) {
      await api.delete(`/api/catalogs/${kind}/${entry.id}`).expect(204);
    }
    return removed;
  }

  async function restoreCatalogEntries(entries: CatalogEntry[]): Promise<void> {
    for (const entry of entries.sort((left, right) => left.sortOrder - right.sortOrder)) {
      const existing = (await api.get(`/api/catalogs/${entry.kind}`).expect(200)).body as CatalogEntry[];
      if (existing.some((candidate) => candidate.key === entry.key)) {
        continue;
      }
      await api
        .post(`/api/catalogs/${entry.kind}`)
        .send({ key: entry.key, label: entry.label, sortOrder: entry.sortOrder, isClosed: entry.isClosed })
        .expect(201);
    }
  }

  it("creates domain objects when editable catalogs no longer contain legacy defaults", async () => {
    const removedEntries: CatalogEntry[] = [];
    const createdIds: Partial<Record<"project" | "milestone" | "feature" | "useCase" | "task" | "ticket" | "backlog", number>> = {};

    try {
      removedEntries.push(...(await trimCatalog("workStatus", ["active"])));
      removedEntries.push(...(await trimCatalog("featureStatus", ["active"])));
      removedEntries.push(...(await trimCatalog("priority", ["low"])));

      const project = (await api.post("/api/projects").send({ name: "Trimmed catalogs project" }).expect(201)).body as Project;
      createdIds.project = project.id;
      expect(project.status).toBe("active");

      const milestone = (await api.post("/api/milestones").send({ projectId: project.id, name: "Trimmed catalogs milestone" }).expect(201)).body as Milestone;
      createdIds.milestone = milestone.id;
      expect(milestone.status).toBe("active");

      const feature = (await api.post("/api/features").send({ title: "Trimmed catalogs feature", slug: "trimmed-catalogs-feature" }).expect(201)).body as Feature;
      createdIds.feature = feature.id;
      expect(feature.status).toBe("active");

      const useCase = (await api.post(`/api/features/${feature.id}/use-cases`).send({ title: "Trimmed catalogs use case", slug: "trimmed-catalogs-use-case" }).expect(201)).body as UseCase;
      createdIds.useCase = useCase.id;
      expect(useCase.status).toBe("active");

      const task = (await api.post(`/api/projects/${project.id}/tasks`).send({ title: "Trimmed catalogs task" }).expect(201)).body as TaskBoardItem;
      createdIds.task = task.id;
      expect(task.status).toBe("active");
      expect(task.priority).toBe("low");

      const ticket = (await api.post(`/api/projects/${project.id}/tickets`).send({ title: "Trimmed catalogs ticket" }).expect(201)).body as Ticket;
      createdIds.ticket = ticket.id;
      expect(ticket.status).toBe("active");
      expect(ticket.priority).toBe("low");

      const backlog = (await api.post(`/api/projects/${project.id}/backlog`).send({ title: "Trimmed catalogs backlog" }).expect(201)).body as BacklogItem;
      createdIds.backlog = backlog.id;
      expect(backlog.status).toBe("active");
    } finally {
      if (createdIds.backlog) {
        await api.delete(`/api/backlog/${createdIds.backlog}`);
      }
      if (createdIds.useCase) {
        await api.delete(`/api/use-cases/${createdIds.useCase}`);
      }
      if (createdIds.feature) {
        await api.delete(`/api/features/${createdIds.feature}`);
      }
      if (createdIds.milestone) {
        await api.delete(`/api/milestones/${createdIds.milestone}`);
      }
      if (createdIds.project) {
        await api.delete(`/api/projects/${createdIds.project}`);
      }
      if (createdIds.ticket) {
        await api.delete(`/api/tickets/${createdIds.ticket}`);
      }
      if (createdIds.task) {
        await api.delete(`/api/tasks/${createdIds.task}`);
      }
      await restoreCatalogEntries(removedEntries);
    }
  });

  it("covers project, task, tag, note, attachment, comment and event endpoints", async () => {
    await api.get("/health").expect(200, { ok: true });
    await api.get("/api/projects").expect(200, []);
    await api.get("/api/tags").expect(200, []);

    const createdProject = (await api.post("/api/projects").send({ name: "Integration" }).expect(201)).body as Project;
    expect(createdProject.color).toBe("#6366f1");

    const updatedProject = (
      await api
        .patch(`/api/projects/${createdProject.id}`)
        .send({ description: "Updated", expectedVersion: createdProject.version })
        .expect(200)
    ).body as Project;
    expect(updatedProject.description).toBe("Updated");

    const loadedProject = (await api.get(`/api/projects/${createdProject.id}`).expect(200)).body as Project;
    expect(loadedProject.id).toBe(createdProject.id);

    const createdTag = (await api.post("/api/tags").send({ name: "Backend" }).expect(201)).body as Tag;
    expect(createdTag.color).toBe("#94a3b8");

    const updatedTag = (
      await api.patch(`/api/tags/${createdTag.id}`).send({ color: "#6366f1", expectedVersion: createdTag.version }).expect(200)
    ).body as Tag;
    expect(updatedTag.color).toBe("#6366f1");

    const throwawayTag = (await api.post("/api/tags").send({ name: "Delete me", color: "#94a3b8" }).expect(201)).body as Tag;
    await api.delete(`/api/tags/${throwawayTag.id}`).expect(204);

    const projectTags = (await api.put(`/api/projects/${createdProject.id}/tags`).send({ tagIds: [createdTag.id] }).expect(200)).body as Tag[];
    expect(projectTags).toHaveLength(1);

    await api.get(`/api/projects/${createdProject.id}/tasks`).expect(200, []);
    const createdTask = (
      await api
        .post(`/api/projects/${createdProject.id}/tasks`)
        .send({ title: "API testen", dueDate: "2026-05-20" })
        .expect(201)
    ).body as TaskBoardItem;
    expect(createdTask.status).toBe("active");
    expect(createdTask.boardPosition).toBeGreaterThan(0);

    const updatedTask = (
      await api.patch(`/api/tasks/${createdTask.id}`).send({ priority: "high", expectedVersion: createdTask.version }).expect(200)
    ).body as Task;
    expect(updatedTask.priority).toBe("high");

    const movedTask = (
      await api
        .patch(`/api/projects/${createdProject.id}/tasks/${createdTask.id}/board`)
        .send({ status: "in_progress", position: 512, expectedVersion: updatedTask.version })
        .expect(200)
    ).body as TaskBoardItem;
    expect(movedTask.status).toBe("in_progress");
    expect(movedTask.boardPosition).toBe(512);

    const taskTags = (await api.put(`/api/tasks/${createdTask.id}/tags`).send({ tagIds: [createdTag.id] }).expect(200)).body as Tag[];
    expect(taskTags).toHaveLength(1);

    await api.get(`/api/tasks/${createdTask.id}/subtasks`).expect(200, []);
    const subtask = (await api.post(`/api/tasks/${createdTask.id}/subtasks`).send({ title: "Subtask" }).expect(201)).body as Task;
    expect(subtask.parentId).toBe(createdTask.id);

    await api.get(`/api/tasks/${createdTask.id}/comments`).expect(200, []);
    const comment = (await api.post(`/api/tasks/${createdTask.id}/comments`).send({ body: "Kommentar" }).expect(201)).body as Comment;
    expect(comment.owners).toEqual([{ type: "task", id: createdTask.id }]);
    await api.delete(`/api/comments/${comment.id}`).expect(204);

    await api.get(`/api/projects/${createdProject.id}/notes`).expect(200, []);
    const projectNote = (
      await api
        .post(`/api/projects/${createdProject.id}/notes`)
        .send({ title: "Projektnotiz", contentJson: { type: "doc", content: [] } })
        .expect(201)
    ).body as Note;
    expect(projectNote.contentJson).toEqual({ type: "doc", content: [] });

    const loadedNote = (await api.get(`/api/notes/${projectNote.id}`).expect(200)).body as Note;
    expect(loadedNote.id).toBe(projectNote.id);

    const patchedNote = (
      await api
        .patch(`/api/notes/${projectNote.id}`)
        .send({ contentJson: { type: "doc", content: [{ type: "paragraph" }] }, expectedVersion: projectNote.version })
        .expect(200)
    ).body as Note;
    expect(patchedNote.contentJson).toEqual({ type: "doc", content: [{ type: "paragraph" }] });

    await api.post(`/api/projects/${createdProject.id}/notes`).send({ contentJson: [] }).expect(400);

    const taskNote = (await api.post(`/api/tasks/${createdTask.id}/notes`).send({ title: "Tasknotiz", contentJson: {} }).expect(201)).body as Note;
    const taskNotes = (await api.get(`/api/tasks/${createdTask.id}/notes`).expect(200)).body as Note[];
    expect(taskNotes.map((note) => note.id)).toContain(taskNote.id);
    await api.delete(`/api/notes/${taskNote.id}`).expect(204);
    await api.delete(`/api/notes/${projectNote.id}`).expect(204);

    await api.get(`/api/projects/${createdProject.id}/attachments`).expect(200, []);
    const projectAttachment = (
      await api
        .post(`/api/projects/${createdProject.id}/attachments`)
        .attach("file", Buffer.from("project file"), "project.txt")
        .expect(201)
    ).body as Attachment;
    expect(projectAttachment.owners).toEqual([{ type: "project", id: createdProject.id }]);
    await api.get(projectAttachment.url).expect(200);

    const taskAttachment = (
      await api
        .post(`/api/tasks/${createdTask.id}/attachments`)
        .attach("file", Buffer.from("task file"), "task.txt")
        .expect(201)
    ).body as Attachment;
    expect(taskAttachment.owners).toEqual([{ type: "task", id: createdTask.id }]);

    const projectAttachments = (await api.get(`/api/projects/${createdProject.id}/attachments`).expect(200)).body as Attachment[];
    expect(projectAttachments.map((attachment) => attachment.id)).toContain(projectAttachment.id);
    await api.post(`/api/projects/${createdProject.id}/attachments`).expect(400);
    await api.delete(`/api/attachments/${projectAttachment.id}`).expect(204);
    await api.delete(`/api/attachments/${taskAttachment.id}`).expect(204);

    await api.get("/api/events").expect(200, []);
    const createdEvent = (
      await api
        .post("/api/events")
        .send({
          title: "Review",
          startTime: "2026-05-20T09:00:00.000Z",
          endTime: "2026-05-20T10:00:00.000Z",
          owners: [
            { type: "project", id: createdProject.id },
            { type: "task", id: createdTask.id }
          ]
        })
        .expect(201)
    ).body as Event;
    expect(createdEvent.color).toBe("#6366f1");
    expect(createdEvent.owners).toEqual([
      { type: "project", id: createdProject.id },
      { type: "task", id: createdTask.id }
    ]);

    const loadedEvent = (await api.get(`/api/events/${createdEvent.id}`).expect(200)).body as Event;
    expect(loadedEvent.id).toBe(createdEvent.id);

    const rangeEvents = (await api.get("/api/events").query({ from: "2026-05-20", to: "2026-05-21" }).expect(200)).body as Event[];
    expect(rangeEvents.map((event) => event.id)).toContain(createdEvent.id);

    const patchedEvent = (
      await api
        .patch(`/api/events/${createdEvent.id}`)
        .send({ title: "Review verschoben", expectedVersion: createdEvent.version })
        .expect(200)
    ).body as Event;
    expect(patchedEvent.title).toBe("Review verschoben");
    await api.delete(`/api/events/${createdEvent.id}`).expect(204);

    const taskDetail = (await api.get(`/api/tasks/${createdTask.id}`).expect(200)).body as TaskDetail;
    expect(taskDetail.subtasks.map((item) => item.id)).toContain(subtask.id);

    await api.delete(`/api/tasks/${subtask.id}`).expect(204);
    await api.delete(`/api/projects/${createdProject.id}/tasks/${createdTask.id}`).expect(204);
    await api.delete(`/api/tasks/${createdTask.id}`).expect(204);
    await api.delete(`/api/tags/${createdTag.id}`).expect(204);
    await api.delete(`/api/projects/${createdProject.id}`).expect(204);
  });

  it("imports wiki feature content, relations, backlogs and tasks from a features path", async () => {
    const project = (await api.post("/api/projects").send({ name: "Wiki Import" }).expect(201)).body as Project;
    const wikiRoot = path.join(tempDir, "wiki-import");
    const featuresRoot = path.join(wikiRoot, "features");
    const alphaRoot = path.join(featuresRoot, "ft-01-alpha");
    const betaRoot = path.join(featuresRoot, "ft-02-beta");

    await fs.mkdir(path.join(alphaRoot, "use-cases"), { recursive: true });
    await fs.mkdir(path.join(alphaRoot, "backlog"), { recursive: true });
    await fs.mkdir(path.join(betaRoot, "use-cases"), { recursive: true });
    await fs.mkdir(path.join(wikiRoot, "tasks"), { recursive: true });

    await fs.writeFile(
      path.join(alphaRoot, "ft-01-alpha.md"),
      [
        "# FT (01): Alpha",
        "",
        "## Ziel / Zweck",
        "",
        "Alpha core paragraph.",
        "",
        "## Fachliche Beschreibung",
        "",
        "Alpha description.",
        "",
        "## Use Cases",
        "",
        "- [UC 01/01: Alpha start](use-cases/uc-01-01-alpha-start.md)",
        "",
        "## Architektur & Kontext",
        "",
        "### Verwandte Features & Abhängigkeiten",
        "",
        "**Dieses Feature konsumiert (abhängig von):**",
        "",
        "- [FT-02: Beta](../ft-02-beta/ft-02-beta.md) — Alpha needs Beta."
      ].join("\n"),
      "utf8"
    );
    await fs.writeFile(
      path.join(alphaRoot, "use-cases", "uc-01-01-alpha-start.md"),
      ["# UC 01/01: Alpha start", "", "## Ziel", "", "Alpha use case."].join("\n"),
      "utf8"
    );
    await fs.writeFile(
      path.join(alphaRoot, "backlog", "ft-01-alpha-backlog.md"),
      ["# FT (01) Backlog", "", "## BL-01: Alpha backlog", "", "Status: Backlog / nicht begonnen", "", "### Ziel / Zweck", "", "Later alpha improvement."].join("\n"),
      "utf8"
    );
    await fs.writeFile(
      path.join(betaRoot, "ft-02-beta.md"),
      ["# FT (02): Beta", "", "## Ziel / Zweck", "", "Beta core paragraph.", "", "## Use Cases"].join("\n"),
      "utf8"
    );
    await fs.writeFile(
      path.join(wikiRoot, "tasks", "alpha-task.md"),
      [
        "# Alpha task",
        "",
        "| Status | Dringlichkeit | Thema | Typ | Erstellt |",
        "| :--- | :--- | :--- | :--- | :--- |",
        "| `offen` | Hoch | Alpha | Umsetzung | 17.05.26 |",
        "",
        "## Ziel",
        "",
        "Implement alpha.",
        "",
        "## Beziehungen",
        "",
        "- Features: [FT-01 - Alpha](../features/ft-01-alpha/ft-01-alpha.md)",
        "- Use Cases: [UC 01/01](../features/ft-01-alpha/use-cases/uc-01-01-alpha-start.md)"
      ].join("\n"),
      "utf8"
    );

    const preview = (
      await api.post(`/api/projects/${project.id}/import/wiki/preview`).send({ sourcePath: featuresRoot }).expect(200)
    ).body as WikiImportReport;
    expect(preview.items.some((item) => item.type === "featureRelation" && item.action === "created")).toBe(true);
    expect(preview.items.some((item) => item.type === "backlogItem" && item.action === "created")).toBe(true);

    await api.post(`/api/projects/${project.id}/import/wiki/run`).send({ sourcePath: featuresRoot }).expect(200);

    const features = (await api.get("/api/features").expect(200)).body as Feature[];
    const alpha = features.find((feature) => feature.slug === "ft-01-alpha");
    const beta = features.find((feature) => feature.slug === "ft-02-beta");
    expect(alpha).toBeDefined();
    expect(beta).toBeDefined();

    const alphaDetail = (await api.get(`/api/features/${alpha?.id}`).expect(200)).body as Feature;
    expect(alphaDetail.content).toContain("<h1>FT (01): Alpha</h1>");
    expect(alphaDetail.content).toContain("Alpha core paragraph.");
    expect(alphaDetail.content).not.toContain("## Use Cases");

    const relations = (await api.get(`/api/features/${alpha?.id}/relations`).expect(200)).body as FeatureRelation[];
    expect(relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetFeatureId: beta?.id,
          relationType: "depends_on"
        })
      ])
    );

    const backlog = (await api.get(`/api/projects/${project.id}/backlog`).query({ featureId: alpha?.id }).expect(200)).body as BacklogItem[];
    expect(backlog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "BL-01: Alpha backlog",
          importKey: expect.stringContaining("ft-01-alpha-backlog.md")
        })
      ])
    );

    const tasks = (await api.get(`/api/projects/${project.id}/tasks`).expect(200)).body as TaskBoardItem[];
    const importedTask = tasks.find((task) => task.title === "Alpha task");
    expect(importedTask).toBeDefined();
    const alphaTasks = (await api.get(`/api/features/${alpha?.id}/tasks`).expect(200)).body as TaskBoardItem[];
    const useCases = (await api.get(`/api/features/${alpha?.id}/use-cases`).expect(200)).body as UseCase[];
    const alphaUseCase = useCases.find((useCase) => useCase.slug === "uc-01-01-alpha-start");
    expect(alphaTasks.map((task) => task.id)).toContain(importedTask?.id);
    expect(alphaUseCase).toBeDefined();
    const useCaseTasks = (await api.get(`/api/use-cases/${alphaUseCase?.id}/tasks`).expect(200)).body as TaskBoardItem[];
    expect(useCaseTasks.map((task) => task.id)).toContain(importedTask?.id);
  });
});
