import type { Attachment, BacklogItem, Comment, Event, Feature, FeatureRelation, Note, Project, Tag, Task, TaskBoardItem, TaskDetail, UseCase, WikiImportReport } from "@taskmanager/shared-types";
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
 * Die HTTP-Verträge der Taskmanager-API werden über echte Fastify-Routen und eine Temp-DB abgesichert.
 */
describe("Taskmanager API integration", () => {
  let app: FastifyInstance;
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
  });

  afterAll(async () => {
    await app.close();
    closeDatabase?.();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("covers project, task, tag, note, attachment, comment and event endpoints", async () => {
    await request(app.server).get("/health").expect(200, { ok: true });
    await request(app.server).get("/api/projects").expect(200, []);
    await request(app.server).get("/api/tags").expect(200, []);

    const createdProject = (await request(app.server).post("/api/projects").send({ name: "Integration" }).expect(201)).body as Project;
    expect(createdProject.color).toBe("#6366f1");

    const updatedProject = (await request(app.server).patch(`/api/projects/${createdProject.id}`).send({ description: "Updated" }).expect(200)).body as Project;
    expect(updatedProject.description).toBe("Updated");

    const loadedProject = (await request(app.server).get(`/api/projects/${createdProject.id}`).expect(200)).body as Project;
    expect(loadedProject.id).toBe(createdProject.id);

    const createdTag = (await request(app.server).post("/api/tags").send({ name: "Backend" }).expect(201)).body as Tag;
    expect(createdTag.color).toBe("#94a3b8");

    const updatedTag = (await request(app.server).patch(`/api/tags/${createdTag.id}`).send({ color: "#6366f1" }).expect(200)).body as Tag;
    expect(updatedTag.color).toBe("#6366f1");

    const throwawayTag = (await request(app.server).post("/api/tags").send({ name: "Delete me", color: "#94a3b8" }).expect(201)).body as Tag;
    await request(app.server).delete(`/api/tags/${throwawayTag.id}`).expect(204);

    const projectTags = (await request(app.server).put(`/api/projects/${createdProject.id}/tags`).send({ tagIds: [createdTag.id] }).expect(200)).body as Tag[];
    expect(projectTags).toHaveLength(1);

    await request(app.server).get(`/api/projects/${createdProject.id}/tasks`).expect(200, []);
    const createdTask = (
      await request(app.server)
        .post(`/api/projects/${createdProject.id}/tasks`)
        .send({ title: "API testen", dueDate: "2026-05-20" })
        .expect(201)
    ).body as TaskBoardItem;
    expect(createdTask.status).toBe("todo");
    expect(createdTask.boardPosition).toBeGreaterThan(0);

    const updatedTask = (await request(app.server).patch(`/api/tasks/${createdTask.id}`).send({ priority: "high" }).expect(200)).body as Task;
    expect(updatedTask.priority).toBe("high");

    const movedTask = (
      await request(app.server).patch(`/api/projects/${createdProject.id}/tasks/${createdTask.id}/board`).send({ status: "in_progress", position: 512 }).expect(200)
    ).body as TaskBoardItem;
    expect(movedTask.status).toBe("in_progress");
    expect(movedTask.boardPosition).toBe(512);

    const taskTags = (await request(app.server).put(`/api/tasks/${createdTask.id}/tags`).send({ tagIds: [createdTag.id] }).expect(200)).body as Tag[];
    expect(taskTags).toHaveLength(1);

    await request(app.server).get(`/api/tasks/${createdTask.id}/subtasks`).expect(200, []);
    const subtask = (await request(app.server).post(`/api/tasks/${createdTask.id}/subtasks`).send({ title: "Subtask" }).expect(201)).body as Task;
    expect(subtask.parentId).toBe(createdTask.id);

    await request(app.server).get(`/api/tasks/${createdTask.id}/comments`).expect(200, []);
    const comment = (await request(app.server).post(`/api/tasks/${createdTask.id}/comments`).send({ body: "Kommentar" }).expect(201)).body as Comment;
    expect(comment.taskId).toBe(createdTask.id);
    await request(app.server).delete(`/api/comments/${comment.id}`).expect(204);

    await request(app.server).get(`/api/projects/${createdProject.id}/notes`).expect(200, []);
    const projectNote = (
      await request(app.server)
        .post(`/api/projects/${createdProject.id}/notes`)
        .send({ title: "Projektnotiz", contentJson: { type: "doc", content: [] } })
        .expect(201)
    ).body as Note;
    expect(projectNote.contentJson).toEqual({ type: "doc", content: [] });

    const loadedNote = (await request(app.server).get(`/api/notes/${projectNote.id}`).expect(200)).body as Note;
    expect(loadedNote.id).toBe(projectNote.id);

    const patchedNote = (
      await request(app.server)
        .patch(`/api/notes/${projectNote.id}`)
        .send({ contentJson: { type: "doc", content: [{ type: "paragraph" }] } })
        .expect(200)
    ).body as Note;
    expect(patchedNote.contentJson).toEqual({ type: "doc", content: [{ type: "paragraph" }] });

    await request(app.server).post(`/api/projects/${createdProject.id}/notes`).send({ contentJson: [] }).expect(400);

    const taskNote = (await request(app.server).post(`/api/tasks/${createdTask.id}/notes`).send({ title: "Tasknotiz", contentJson: {} }).expect(201)).body as Note;
    const taskNotes = (await request(app.server).get(`/api/tasks/${createdTask.id}/notes`).expect(200)).body as Note[];
    expect(taskNotes.map((note) => note.id)).toContain(taskNote.id);
    await request(app.server).delete(`/api/notes/${taskNote.id}`).expect(204);
    await request(app.server).delete(`/api/notes/${projectNote.id}`).expect(204);

    await request(app.server).get(`/api/projects/${createdProject.id}/attachments`).expect(200, []);
    const projectAttachment = (
      await request(app.server)
        .post(`/api/projects/${createdProject.id}/attachments`)
        .attach("file", Buffer.from("project file"), "project.txt")
        .expect(201)
    ).body as Attachment;
    expect(projectAttachment.projectId).toBe(createdProject.id);
    expect(projectAttachment.taskId).toBeNull();
    await request(app.server).get(projectAttachment.url).expect(200);

    const taskAttachment = (
      await request(app.server)
        .post(`/api/tasks/${createdTask.id}/attachments`)
        .attach("file", Buffer.from("task file"), "task.txt")
        .expect(201)
    ).body as Attachment;
    expect(taskAttachment.taskId).toBe(createdTask.id);

    const projectAttachments = (await request(app.server).get(`/api/projects/${createdProject.id}/attachments`).expect(200)).body as Attachment[];
    expect(projectAttachments.map((attachment) => attachment.id)).toContain(projectAttachment.id);
    await request(app.server).post(`/api/projects/${createdProject.id}/attachments`).expect(400);
    await request(app.server).delete(`/api/attachments/${projectAttachment.id}`).expect(204);
    await request(app.server).delete(`/api/attachments/${taskAttachment.id}`).expect(204);

    await request(app.server).get("/api/events").expect(200, []);
    const createdEvent = (
      await request(app.server)
        .post("/api/events")
        .send({
          title: "Review",
          startTime: "2026-05-20T09:00:00.000Z",
          endTime: "2026-05-20T10:00:00.000Z",
          projectId: createdProject.id,
          taskId: createdTask.id
        })
        .expect(201)
    ).body as Event;
    expect(createdEvent.color).toBe("#6366f1");

    const loadedEvent = (await request(app.server).get(`/api/events/${createdEvent.id}`).expect(200)).body as Event;
    expect(loadedEvent.id).toBe(createdEvent.id);

    const rangeEvents = (await request(app.server).get("/api/events").query({ from: "2026-05-20", to: "2026-05-21" }).expect(200)).body as Event[];
    expect(rangeEvents.map((event) => event.id)).toContain(createdEvent.id);

    const patchedEvent = (await request(app.server).patch(`/api/events/${createdEvent.id}`).send({ title: "Review verschoben" }).expect(200)).body as Event;
    expect(patchedEvent.title).toBe("Review verschoben");
    await request(app.server).delete(`/api/events/${createdEvent.id}`).expect(204);

    const taskDetail = (await request(app.server).get(`/api/tasks/${createdTask.id}`).expect(200)).body as TaskDetail;
    expect(taskDetail.subtasks.map((item) => item.id)).toContain(subtask.id);

    await request(app.server).delete(`/api/tasks/${subtask.id}`).expect(204);
    await request(app.server).delete(`/api/projects/${createdProject.id}/tasks/${createdTask.id}`).expect(204);
    await request(app.server).delete(`/api/tasks/${createdTask.id}`).expect(204);
    await request(app.server).delete(`/api/tags/${createdTag.id}`).expect(204);
    await request(app.server).delete(`/api/projects/${createdProject.id}`).expect(204);
  });

  it("imports wiki feature content, relations, backlogs and tasks from a features path", async () => {
    const project = (await request(app.server).post("/api/projects").send({ name: "Wiki Import" }).expect(201)).body as Project;
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
      await request(app.server).post(`/api/projects/${project.id}/import/wiki/preview`).send({ sourcePath: featuresRoot }).expect(200)
    ).body as WikiImportReport;
    expect(preview.items.some((item) => item.type === "featureRelation" && item.action === "created")).toBe(true);
    expect(preview.items.some((item) => item.type === "backlogItem" && item.action === "created")).toBe(true);

    await request(app.server).post(`/api/projects/${project.id}/import/wiki/run`).send({ sourcePath: featuresRoot }).expect(200);

    const features = (await request(app.server).get("/api/features").expect(200)).body as Feature[];
    const alpha = features.find((feature) => feature.slug === "ft-01-alpha");
    const beta = features.find((feature) => feature.slug === "ft-02-beta");
    expect(alpha).toBeDefined();
    expect(beta).toBeDefined();

    const alphaDetail = (await request(app.server).get(`/api/features/${alpha?.id}`).expect(200)).body as Feature;
    expect(alphaDetail.content).toContain("<h1>FT (01): Alpha</h1>");
    expect(alphaDetail.content).toContain("Alpha core paragraph.");
    expect(alphaDetail.content).not.toContain("## Use Cases");

    const relations = (await request(app.server).get(`/api/features/${alpha?.id}/relations`).expect(200)).body as FeatureRelation[];
    expect(relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetFeatureId: beta?.id,
          relationType: "depends_on"
        })
      ])
    );

    const backlog = (await request(app.server).get(`/api/projects/${project.id}/backlog`).query({ featureId: alpha?.id }).expect(200)).body as BacklogItem[];
    expect(backlog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "BL-01: Alpha backlog",
          importKey: expect.stringContaining("ft-01-alpha-backlog.md")
        })
      ])
    );

    const tasks = (await request(app.server).get(`/api/projects/${project.id}/tasks`).expect(200)).body as TaskBoardItem[];
    const importedTask = tasks.find((task) => task.title === "Alpha task");
    expect(importedTask).toBeDefined();
    const alphaTasks = (await request(app.server).get(`/api/features/${alpha?.id}/tasks`).expect(200)).body as TaskBoardItem[];
    const useCases = (await request(app.server).get(`/api/features/${alpha?.id}/use-cases`).expect(200)).body as UseCase[];
    const alphaUseCase = useCases.find((useCase) => useCase.slug === "uc-01-01-alpha-start");
    expect(alphaTasks.map((task) => task.id)).toContain(importedTask?.id);
    expect(alphaUseCase).toBeDefined();
    const useCaseTasks = (await request(app.server).get(`/api/use-cases/${alphaUseCase?.id}/tasks`).expect(200)).body as TaskBoardItem[];
    expect(useCaseTasks.map((task) => task.id)).toContain(importedTask?.id);
  });
});
