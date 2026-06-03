import {
  expect,
  type APIRequestContext,
  type Locator,
  type Page,
} from "@playwright/test";

export const apiBaseUrl =
  process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3101/api";

export function todayIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface ProjectFixture {
  id: number;
  name: string;
}

export interface FeatureFixture {
  id: number;
  title: string;
}

export interface MilestoneFixture {
  id: number;
  projectId: number;
  name: string;
  version: number;
}

export interface UseCaseFixture {
  id: number;
  title: string;
  featureId: number;
}

export interface TaskFixture {
  id: number;
  title: string;
  responsibleUserId?: number | null;
  dueDate?: string | null;
  version?: number;
}

export interface TicketFixture {
  id: number;
  title: string;
}

export interface EventFixture {
  id: number;
  title: string;
  version: number;
  owners: Array<{ type: "project" | "milestone" | "task"; id: number }>;
}

export interface BacklogItemFixture {
  id: number;
  title: string;
  projectId: number;
}

export type TaskOwner = {
  type: "project" | "milestone" | "feature" | "useCase";
  id: number;
};
export type TicketOwner = {
  type: "project" | "milestone" | "task" | "feature" | "useCase";
  id: number;
};

export function uniqueTitle(prefix: string) {
  return `${prefix} ${Date.now()} ${Math.random().toString(36).slice(2, 7)}`;
}

export function safeFilename(value: string) {
  return value
    .toLocaleLowerCase("de-DE")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function pathWithOptionalQuery(path: string) {
  const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${escapedPath}(?:\\?.*)?$`);
}

export async function expectToast(page: Page, text: string) {
  await expect(page.locator('[role="status"][aria-live="polite"]')).toContainText(
    text,
  );
}

const authenticatedApiRequests = new WeakSet<APIRequestContext>();

export async function ensureApiAuth(request: APIRequestContext) {
  if (authenticatedApiRequests.has(request)) {
    return;
  }
  const response = await request.post(`${apiBaseUrl}/auth/login`, {
    data: { email: "admin@local", password: "password123" },
  });
  expect(response.ok()).toBeTruthy();
  authenticatedApiRequests.add(request);
}

export async function authenticatedGoto(page: Page, path: string) {
  await page.goto(path);
}

function taskOwnerPath(owner: TaskOwner) {
  if (owner.type === "project") {
    return `projects/${owner.id}`;
  }
  if (owner.type === "milestone") {
    return `milestones/${owner.id}`;
  }
  if (owner.type === "feature") {
    return `features/${owner.id}`;
  }
  return `use-cases/${owner.id}`;
}

function ticketOwnerPath(owner: TicketOwner) {
  if (owner.type === "project") {
    return `projects/${owner.id}`;
  }
  if (owner.type === "milestone") {
    return `milestones/${owner.id}`;
  }
  if (owner.type === "task") {
    return `tasks/${owner.id}`;
  }
  if (owner.type === "feature") {
    return `features/${owner.id}`;
  }
  return `use-cases/${owner.id}`;
}

export async function createProject(
  request: APIRequestContext,
  titlePrefix: string,
  input: Partial<{
    description: string;
    status: string;
    color: string;
    startDate: string;
    dueDate: string;
  }> = {},
) {
  await ensureApiAuth(request);
  const name = uniqueTitle(titlePrefix);
  const response = await request.post(`${apiBaseUrl}/projects`, {
    data: {
      name,
      description:
        input.description ?? "<p>E2E Projektbeschreibung vollständig</p>",
      ...(input.status !== undefined ? { status: input.status } : {}),
      color: input.color ?? "#4682B4",
      startDate: input.startDate ?? "2026-05-01",
      dueDate: input.dueDate ?? "2026-05-31",
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<ProjectFixture>;
}

export async function createMilestone(
  request: APIRequestContext,
  projectId: number,
  titlePrefix: string,
  input: Partial<{
    description: string;
    status: string;
    color: string;
    startDate: string;
    dueDate: string;
  }> = {},
) {
  await ensureApiAuth(request);
  const name = uniqueTitle(titlePrefix);
  const response = await request.post(`${apiBaseUrl}/milestones`, {
    data: {
      projectId,
      name,
      description:
        input.description ?? "<p>E2E Meilensteinbeschreibung vollständig</p>",
      ...(input.status !== undefined ? { status: input.status } : {}),
      color: input.color ?? "#14B8A6",
      startDate: input.startDate ?? "2026-06-01",
      dueDate: input.dueDate ?? "2026-06-30",
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<MilestoneFixture>;
}

export async function createFeature(
  request: APIRequestContext,
  titlePrefix: string,
  input: Partial<{
    description: string;
    content: string;
    status: string;
    sortOrder: number;
  }> = {},
) {
  await ensureApiAuth(request);
  const title = uniqueTitle(titlePrefix);
  const response = await request.post(`${apiBaseUrl}/features`, {
    data: {
      title,
      ...(input.status !== undefined ? { status: input.status } : {}),
      description:
        input.description ?? "<p>E2E Feature-Kurzbeschreibung vollständig</p>",
      content: input.content ?? "<p>E2E Feature-Inhalt vollständig</p>",
      sortOrder: input.sortOrder ?? 7,
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<FeatureFixture>;
}

export async function linkProjectFeature(
  request: APIRequestContext,
  projectId: number,
  featureId: number,
) {
  await ensureApiAuth(request);
  const response = await request.put(
    `${apiBaseUrl}/projects/${projectId}/features`,
    { data: { featureIds: [featureId] } },
  );
  expect(response.ok()).toBeTruthy();
}

export async function createUseCase(
  request: APIRequestContext,
  featureId: number,
  titlePrefix: string,
  input: Partial<{
    description: string;
    content: string;
    status: string;
    sortOrder: number;
  }> = {},
) {
  await ensureApiAuth(request);
  const title = uniqueTitle(titlePrefix);
  const response = await request.post(
    `${apiBaseUrl}/features/${featureId}/use-cases`,
    {
      data: {
        title,
        ...(input.status !== undefined ? { status: input.status } : {}),
        description:
          input.description ?? "<p>E2E Use-Case-Beschreibung vollständig</p>",
        content: input.content ?? "<p>E2E Use-Case-Inhalt vollständig</p>",
        sortOrder: input.sortOrder ?? 3,
      },
    },
  );
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<UseCaseFixture>;
}

export async function createTask(
  request: APIRequestContext,
  owner: TaskOwner,
  titlePrefix: string,
  input: Partial<{
    description: string;
    status: string;
    priority: string;
    responsibleUserId: number | null;
    dueDate: string;
  }> = {},
) {
  await ensureApiAuth(request);
  const title = uniqueTitle(titlePrefix);
  const response = await request.post(
    `${apiBaseUrl}/${taskOwnerPath(owner)}/tasks`,
    {
      data: {
        title,
        description:
          input.description ?? "<p>E2E Aufgabenbeschreibung vollständig</p>",
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.responsibleUserId !== undefined ? { responsibleUserId: input.responsibleUserId } : {}),
        dueDate: input.dueDate ?? "2026-05-29",
      },
    },
  );
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<TaskFixture>;
}

export async function createTicket(
  request: APIRequestContext,
  owner: TicketOwner | null,
  titlePrefix: string,
  input: Partial<{
    description: string;
    type: string;
    status: string;
    priority: string;
    responsibleUserId: number | null;
    reporterUserId: number | null;
    dueDate: string;
    environment: string;
    affectedVersion: string;
  }> = {},
) {
  await ensureApiAuth(request);
  const title = uniqueTitle(titlePrefix);
  const response = await request.post(
    `${apiBaseUrl}/${owner ? `${ticketOwnerPath(owner)}/tickets` : "tickets"}`,
    {
      data: {
        title,
        description:
          input.description ?? "<p>E2E Ticketbeschreibung vollständig</p>",
        type: input.type ?? "bug",
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.responsibleUserId !== undefined ? { responsibleUserId: input.responsibleUserId } : {}),
        ...(input.reporterUserId !== undefined ? { reporterUserId: input.reporterUserId } : {}),
        dueDate: input.dueDate ?? "2026-05-30",
        environment: input.environment ?? "E2E Umgebung",
        affectedVersion: input.affectedVersion ?? "v1.2.3",
      },
    },
  );
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<TicketFixture>;
}

export async function createEvent(
  request: APIRequestContext,
  titlePrefix: string,
  input: Partial<{
    owners: Array<{ type: "project" | "milestone" | "task"; id: number }>;
    startTime: string;
    endTime: string;
    isAllDay: boolean;
    color: string | null;
  }> = {},
) {
  await ensureApiAuth(request);
  const title = uniqueTitle(titlePrefix);
  const defaultDay = input.startTime?.slice(0, 10) ?? todayIsoDate();
  const response = await request.post(`${apiBaseUrl}/events`, {
    data: {
      title,
      startTime: input.startTime ?? `${defaultDay}T10:00:00`,
      endTime: input.endTime ?? `${defaultDay}T11:00:00`,
      isAllDay: input.isAllDay ?? false,
      color: input.color ?? "#4682B4",
      owners: input.owners ?? [],
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<EventFixture>;
}

export async function createBacklogItem(
  request: APIRequestContext,
  projectId: number,
  titlePrefix: string,
  input: Partial<{
    description: string;
    status: string;
    featureId: number;
  }> = {},
) {
  await ensureApiAuth(request);
  const title = uniqueTitle(titlePrefix);
  const response = await request.post(
    `${apiBaseUrl}/projects/${projectId}/backlog`,
    {
      data: {
        title,
        description:
          input.description ?? "<p>E2E Backlog-Beschreibung vollständig</p>",
        ...(input.status !== undefined ? { status: input.status } : {}),
        featureId: input.featureId ?? null,
      },
    },
  );
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<BacklogItemFixture>;
}

export async function deleteProject(
  request: APIRequestContext,
  projectId: number | null | undefined,
) {
  await ensureApiAuth(request);
  if (projectId) {
    await request.delete(`${apiBaseUrl}/projects/${projectId}`);
  }
}

export async function deleteMilestone(
  request: APIRequestContext,
  milestoneId: number | null | undefined,
) {
  await ensureApiAuth(request);
  if (milestoneId) {
    await request.delete(`${apiBaseUrl}/milestones/${milestoneId}`);
  }
}

export async function deleteFeature(
  request: APIRequestContext,
  featureId: number | null | undefined,
) {
  await ensureApiAuth(request);
  if (featureId) {
    await request.delete(`${apiBaseUrl}/features/${featureId}`);
  }
}

export async function deleteTicket(
  request: APIRequestContext,
  ticketId: number | null | undefined,
) {
  await ensureApiAuth(request);
  if (ticketId) {
    await request.delete(`${apiBaseUrl}/tickets/${ticketId}`);
  }
}

export async function deleteEvent(
  request: APIRequestContext,
  eventId: number | null | undefined,
) {
  await ensureApiAuth(request);
  if (eventId) {
    await request.delete(`${apiBaseUrl}/events/${eventId}`);
  }
}

export async function deleteTask(
  request: APIRequestContext,
  taskId: number | null | undefined,
) {
  await ensureApiAuth(request);
  if (taskId) {
    await request.delete(`${apiBaseUrl}/tasks/${taskId}`);
  }
}

export async function cleanupTasksByTitle(
  request: APIRequestContext,
  titles: string[],
) {
  await ensureApiAuth(request);
  const response = await request.get(`${apiBaseUrl}/tasks`);
  if (!response.ok()) {
    return;
  }
  const tasks = (await response.json()) as TaskFixture[];
  for (const task of tasks.filter((item) => titles.includes(item.title))) {
    await deleteTask(request, task.id);
  }
}

export async function cleanupTicketsByTitle(
  request: APIRequestContext,
  titles: string[],
) {
  await ensureApiAuth(request);
  const response = await request.get(`${apiBaseUrl}/tickets`);
  if (!response.ok()) {
    return;
  }
  const tickets = (await response.json()) as TicketFixture[];
  for (const ticket of tickets.filter((item) => titles.includes(item.title))) {
    await deleteTicket(request, ticket.id);
  }
}

export interface DayPlanFixture {
  id: number;
  date: string;
}

export interface NoteFixture {
  id: number;
  title: string;
  version: number;
}

export interface CommentFixture {
  id: number;
  body: string;
  version: number;
}

export async function getDayPlan(
  request: APIRequestContext,
  date: string,
): Promise<DayPlanFixture> {
  await ensureApiAuth(request);
  const response = await request.get(`${apiBaseUrl}/day-plans/${date}`);
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<DayPlanFixture>;
}

export async function createDayPlanEvent(
  request: APIRequestContext,
  date: string,
  titlePrefix: string,
  input: Partial<{ startTime: string; endTime: string }> = {},
): Promise<EventFixture> {
  await ensureApiAuth(request);
  const title = uniqueTitle(titlePrefix);
  const day = input.startTime?.slice(0, 10) ?? date;
  const response = await request.post(`${apiBaseUrl}/day-plans/${date}/events`, {
    data: {
      title,
      startTime: input.startTime ?? `${day}T10:00:00`,
      endTime: input.endTime ?? `${day}T11:00:00`,
      isAllDay: false,
      color: "#4682B4",
      owners: [],
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<EventFixture>;
}

export async function createDayPlanTask(
  request: APIRequestContext,
  date: string,
  titlePrefix: string,
  input: Partial<{ status: string; priority: string }> = {},
): Promise<TaskFixture> {
  await ensureApiAuth(request);
  const title = uniqueTitle(titlePrefix);
  const response = await request.post(`${apiBaseUrl}/day-plans/${date}/tasks`, {
    data: {
      title,
      description: "<p>E2E DayPlan Aufgabe</p>",
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<TaskFixture>;
}

export async function createDayPlanNote(
  request: APIRequestContext,
  dayPlanId: number,
  titlePrefix: string,
): Promise<NoteFixture> {
  await ensureApiAuth(request);
  const title = uniqueTitle(titlePrefix);
  const response = await request.post(`${apiBaseUrl}/day-plans/${dayPlanId}/notes`, {
    data: { title, contentJson: {} },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<NoteFixture>;
}

export async function createDayPlanComment(
  request: APIRequestContext,
  dayPlanId: number,
  body: string,
): Promise<CommentFixture> {
  await ensureApiAuth(request);
  const response = await request.post(`${apiBaseUrl}/day-plans/${dayPlanId}/comments`, {
    data: { body },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<CommentFixture>;
}

export async function deleteNote(
  request: APIRequestContext,
  noteId: number | null | undefined,
): Promise<void> {
  await ensureApiAuth(request);
  if (noteId) {
    await request.delete(`${apiBaseUrl}/notes/${noteId}`);
  }
}

export async function deleteComment(
  request: APIRequestContext,
  commentId: number | null | undefined,
): Promise<void> {
  await ensureApiAuth(request);
  if (commentId) {
    await request.delete(`${apiBaseUrl}/comments/${commentId}`);
  }
}

export function formPage(page: Page, heading: string | RegExp) {
  return page
    .locator("form")
    .filter({ has: page.getByRole("heading", { name: heading }) })
    .last();
}

export function itemCard(scope: Page | Locator, title: string) {
  return scope.locator("article:visible").filter({ hasText: title }).first();
}

export async function clickItemAction(
  scope: Page | Locator,
  title: string,
  action: "Bearbeiten" | "Löschen" | "Entfernen",
) {
  const card = itemCard(scope, title);
  const directButton = card
    .getByRole("button", { name: action, exact: true })
    .first();
  if ((await directButton.count()) > 0 && (await directButton.isVisible())) {
    await directButton.click();
    return;
  }

  await card.getByRole("button", { name: "Aktionen" }).click();
  await card.getByRole("menuitem", { name: action, exact: true }).click();
}

export async function expectRichText(
  form: Locator,
  text: string,
  indexOrPrefix: number | string = 0,
) {
  const view =
    typeof indexOrPrefix === "string"
      ? form.locator(`[data-testid="${indexOrPrefix}-view"]`)
      : form.locator('[data-testid$="-view"]').nth(indexOrPrefix);
  await expect(view).toContainText(text);
}

export async function fillRichText(
  form: Locator,
  testIdPrefix: string,
  text: string,
) {
  await form.locator(`[data-testid="${testIdPrefix}-view"]`).click();
  const editor = form.locator(
    `[data-testid="${testIdPrefix}-editor"] [contenteditable="true"]`,
  );
  await expect(editor).toBeVisible();
  await editor.fill(text);
  await editor.blur();
}
