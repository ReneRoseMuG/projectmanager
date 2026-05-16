import type { Attachment, Comment, Event, Note, Project, Tag, Task, TaskDetail } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

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
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "taskmanager-api-"));
    process.env.DATABASE_PATH = path.join(tempDir, "taskmanager.sqlite");
    process.env.UPLOAD_DIR = path.join(tempDir, "uploads");
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
    ).body as Task;
    expect(createdTask.status).toBe("todo");

    const updatedTask = (await request(app.server).patch(`/api/tasks/${createdTask.id}`).send({ priority: "high" }).expect(200)).body as Task;
    expect(updatedTask.priority).toBe("high");

    const movedTask = (await request(app.server).patch(`/api/tasks/${createdTask.id}/position`).send({ status: "in_progress", position: 512 }).expect(200)).body as Task;
    expect(movedTask.status).toBe("in_progress");

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
    await request(app.server).delete(`/api/tasks/${createdTask.id}`).expect(204);
    await request(app.server).delete(`/api/tags/${createdTag.id}`).expect(204);
    await request(app.server).delete(`/api/projects/${createdProject.id}`).expect(204);
  });
});
