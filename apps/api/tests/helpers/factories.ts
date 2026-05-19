import type { FastifyInstance } from "fastify";
import supertest from "supertest";

export interface TestProject {
  id: number;
  version: number;
  name: string;
  status: string;
  color: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  openTaskCount: number;
  tags: TestTag[];
}

export interface TestTask {
  id: number;
  version: number;
  parentId: number | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee: string | null;
  dueDate: string | null;
  boardPosition?: number;
  createdAt: string;
  updatedAt: string;
  tags: TestTag[];
  subtaskCount: number;
}

export interface TestTicket {
  id: number;
  version: number;
  parentId: number | null;
  type: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  resolution: string | null;
  reporter: string | null;
  assignee: string | null;
  environment: string | null;
  affectedVersion: string | null;
  dueDate: string | null;
  resolvedAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  tags: TestTag[];
  subTicketCount: number;
}

export interface TestTag {
  id: number;
  version: number;
  name: string;
  color: string;
}

export interface TestNote {
  id: number;
  version: number;
  title: string;
  contentJson: object;
  createdAt: string;
  updatedAt: string;
}

export interface TestEvent {
  id: number;
  owners: Array<{ type: "project" | "task"; id: number }>;
  title: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  color: string | null;
  version: number;
}

export interface TestComment {
  id: number;
  taskId: number;
  body: string;
  createdAt: string;
}

export interface TestFeature {
  id: number;
  version: number;
  title: string;
  slug: string;
  status: string;
  description: string | null;
  content?: string;
  contentPath: string | null;
  sortOrder: number;
  useCaseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestUseCase {
  id: number;
  version: number;
  featureId: number;
  title: string;
  slug: string;
  status: string;
  description: string | null;
  content?: string;
  contentPath: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestWikiPage {
  id: number;
  version: number;
  parentId: number | null;
  projectId: number | null;
  title: string;
  slug: string;
  content?: string;
  contentPath: string | null;
  sortOrder: number;
  childCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestBacklogItem {
  id: number;
  version: number;
  projectId: number;
  featureId: number | null;
  useCaseId: number | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export async function createProject(
  app: FastifyInstance,
  overrides: Partial<{ name: string; status: string; color: string | null; description: string | null }> = {}
): Promise<TestProject> {
  const body = {
    name: "Testprojekt",
    status: "active",
    color: "#6366f1",
    ...overrides
  };

  const res = await supertest(app.server).post("/api/projects").send(body).expect(201);
  return res.body as TestProject;
}

export async function createTask(
  app: FastifyInstance,
  projectId: number,
  overrides: Partial<{
    title: string;
    description: string | null;
    status: string;
    priority: string;
    assignee: string | null;
    dueDate: string | null;
  }> = {}
): Promise<TestTask> {
  const body = {
    title: "Testaufgabe",
    status: "todo",
    priority: "medium",
    ...overrides
  };

  const res = await supertest(app.server).post(`/api/projects/${projectId}/tasks`).send(body).expect(201);
  return res.body as TestTask;
}

export async function createSubtask(
  app: FastifyInstance,
  parentTaskId: number,
  overrides: Partial<{ title: string; status: string; priority: string }> = {}
): Promise<TestTask> {
  const body = {
    title: "Test-Unteraufgabe",
    status: "todo",
    ...overrides
  };

  const res = await supertest(app.server).post(`/api/tasks/${parentTaskId}/subtasks`).send(body).expect(201);
  return res.body as TestTask;
}

export async function createTicket(
  app: FastifyInstance,
  owner: number | { type: "project" | "task" | "feature" | "useCase"; id: number } | null,
  overrides: Partial<{
    title: string;
    type: string;
    description: string | null;
    status: string;
    priority: string;
    assignee: string | null;
  }> = {}
): Promise<TestTicket> {
  const body = {
    title: "Test-Ticket",
    type: "bug",
    status: "open",
    priority: "medium",
    ...overrides
  };

  const path =
    owner === null
      ? "/api/tickets"
      : typeof owner === "number"
        ? `/api/projects/${owner}/tickets`
        : owner.type === "project"
          ? `/api/projects/${owner.id}/tickets`
          : owner.type === "task"
            ? `/api/tasks/${owner.id}/tickets`
            : owner.type === "feature"
              ? `/api/features/${owner.id}/tickets`
              : `/api/use-cases/${owner.id}/tickets`;
  const res = await supertest(app.server).post(path).send(body).expect(201);
  return res.body as TestTicket;
}

export async function createSubTicket(
  app: FastifyInstance,
  parentTicketId: number,
  overrides: Partial<{ title: string; status: string; priority: string }> = {}
): Promise<TestTicket> {
  const body = {
    title: "Test-Sub-Ticket",
    ...overrides
  };

  const res = await supertest(app.server).post(`/api/tickets/${parentTicketId}/sub-tickets`).send(body).expect(201);
  return res.body as TestTicket;
}

export async function createTag(
  app: FastifyInstance,
  overrides: Partial<{ name: string; color: string }> = {}
): Promise<TestTag> {
  const body = {
    name: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    color: "#94a3b8",
    ...overrides
  };

  const res = await supertest(app.server).post("/api/tags").send(body).expect(201);
  return res.body as TestTag;
}

export async function createNoteForProject(
  app: FastifyInstance,
  projectId: number,
  overrides: Partial<{ title: string; contentJson: object }> = {}
): Promise<TestNote> {
  const body = {
    title: "Testnotiz",
    contentJson: { type: "doc", content: [] },
    ...overrides
  };

  const res = await supertest(app.server).post(`/api/projects/${projectId}/notes`).send(body).expect(201);
  return res.body as TestNote;
}

export async function createNoteForTask(
  app: FastifyInstance,
  taskId: number,
  overrides: Partial<{ title: string; contentJson: object }> = {}
): Promise<TestNote> {
  const body = {
    title: "Testnotiz",
    contentJson: { type: "doc", content: [] },
    ...overrides
  };

  const res = await supertest(app.server).post(`/api/tasks/${taskId}/notes`).send(body).expect(201);
  return res.body as TestNote;
}

export async function createComment(
  app: FastifyInstance,
  taskId: number,
  overrides: Partial<{ body: string }> = {}
): Promise<TestComment> {
  const body = {
    body: "Testkommentar",
    ...overrides
  };

  const res = await supertest(app.server).post(`/api/tasks/${taskId}/comments`).send(body).expect(201);
  return res.body as TestComment;
}

export async function createEvent(
  app: FastifyInstance,
  overrides: Partial<{
    title: string;
    startTime: string;
    endTime: string;
    isAllDay: boolean;
    owners: Array<{ type: "project" | "task"; id: number }>;
    color: string | null;
  }> = {}
): Promise<TestEvent> {
  const body = {
    title: "Testtermin",
    startTime: "2026-06-01T10:00:00",
    endTime: "2026-06-01T11:00:00",
    isAllDay: false,
    color: "#6366f1",
    ...overrides
  };

  const res = await supertest(app.server).post("/api/events").send(body).expect(201);
  return res.body as TestEvent;
}

export async function createFeature(
  app: FastifyInstance,
  overrides: Partial<{ title: string; slug: string; status: string; description: string | null; content: string }> = {}
): Promise<TestFeature> {
  const body = {
    title: "Testfeature",
    slug: `feature-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: "draft",
    content: "# Testfeature",
    ...overrides
  };

  const res = await supertest(app.server).post("/api/features").send(body).expect(201);
  return res.body as TestFeature;
}

export async function createUseCase(
  app: FastifyInstance,
  featureId: number,
  overrides: Partial<{ title: string; slug: string; status: string; description: string | null; content: string }> = {}
): Promise<TestUseCase> {
  const body = {
    title: "Test Use Case",
    slug: `usecase-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: "draft",
    content: "# Test Use Case",
    ...overrides
  };

  const res = await supertest(app.server).post(`/api/features/${featureId}/use-cases`).send(body).expect(201);
  return res.body as TestUseCase;
}

export async function createWikiPage(
  app: FastifyInstance,
  overrides: Partial<{ title: string; slug: string; parentId: number | null; projectId: number | null; content: string }> = {}
): Promise<TestWikiPage> {
  const body = {
    title: "Test Wiki",
    slug: `wiki-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    content: "# Test Wiki",
    ...overrides
  };

  const res = await supertest(app.server).post("/api/wiki").send(body).expect(201);
  return res.body as TestWikiPage;
}

export async function createBacklogItem(
  app: FastifyInstance,
  projectId: number,
  overrides: Partial<{ title: string; description: string | null; featureId: number | null; useCaseId: number | null; status: string; priority: string }> = {}
): Promise<TestBacklogItem> {
  const body = {
    title: "Test Backlog",
    status: "open",
    priority: "medium",
    ...overrides
  };

  const res = await supertest(app.server).post(`/api/projects/${projectId}/backlog`).send(body).expect(201);
  return res.body as TestBacklogItem;
}

export async function seedProjectWithTasksAndTags(app: FastifyInstance) {
  const project = await createProject(app, { name: "Seed-Projekt" });
  const tag1 = await createTag(app, { name: "backend", color: "#3b82f6" });
  const tag2 = await createTag(app, { name: "frontend", color: "#10b981" });
  const task1 = await createTask(app, project.id, { title: "Task A", status: "todo" });
  const task2 = await createTask(app, project.id, { title: "Task B", status: "in_progress" });

  await supertest(app.server).put(`/api/projects/${project.id}/tags`).send({ tagIds: [tag1.id, tag2.id] }).expect(200);
  await supertest(app.server).put(`/api/tasks/${task1.id}/tags`).send({ tagIds: [tag1.id] }).expect(200);

  return { project, tag1, tag2, task1, task2 };
}
