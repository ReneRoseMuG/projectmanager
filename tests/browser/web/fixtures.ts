import { test as workerTest } from "./worker-fixtures";

import {
  createMilestone,
  createProject,
  createTask,
  createTicket,
  deleteProject,
  type MilestoneFixture,
  type ProjectFixture,
  type TaskFixture,
  type TicketFixture,
} from "./domain-test-utils";

interface MilestoneWithTaskAndTicketFixture {
  project: ProjectFixture;
  milestone: MilestoneFixture;
  task: TaskFixture;
  ticket: TicketFixture;
}

interface ProjectWithDashboardItemsFixture {
  project: ProjectFixture;
  milestone: MilestoneFixture;
  task: TaskFixture;
  ticket: TicketFixture;
}

interface DomainFixtures {
  milestoneWithTaskAndTicket: MilestoneWithTaskAndTicketFixture;
  projectWithDashboardItems: ProjectWithDashboardItemsFixture;
}

/**
 * Domain fixtures layered on top of the worker-scoped isolation fixture
 * (worker-fixtures.ts). Importing `test` from here gives every spec both the
 * per-worker isolated stack (auto fixture) and the domain helpers.
 */
export const test = workerTest.extend<DomainFixtures>({
  milestoneWithTaskAndTicket: async ({ request }, use) => {
    const project = await createProject(request, "E2E Meilenstein Dashboard Projekt");
    const milestone = await createMilestone(request, project.id, "E2E Dashboard Meilenstein");
    const [task, ticket] = await Promise.all([
      createTask(request, { type: "milestone", id: milestone.id }, "E2E MS Task", { status: "todo" }),
      createTicket(request, { type: "milestone", id: milestone.id }, "E2E MS Ticket", { status: "open" }),
    ]);

    try {
      await use({ project, milestone, task, ticket });
    } finally {
      await deleteProject(request, project.id);
    }
  },

  projectWithDashboardItems: async ({ request }, use) => {
    const project = await createProject(request, "E2E Dashboard Project");
    const [milestone, task, ticket] = await Promise.all([
      createMilestone(request, project.id, "E2E Dashboard Milestone"),
      createTask(request, { type: "project", id: project.id }, "E2E Dashboard Task", { status: "todo" }),
      createTicket(request, { type: "project", id: project.id }, "E2E Dashboard Ticket", { status: "open" }),
    ]);

    try {
      await use({ project, milestone, task, ticket });
    } finally {
      await deleteProject(request, project.id);
    }
  },
});

export * from "./worker-fixtures";
