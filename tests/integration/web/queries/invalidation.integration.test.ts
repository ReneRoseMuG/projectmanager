/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Query-Keys bilden stabile Namespaces für Collections, Details, Join-Tabellen und Suchdaten.
 * - Globale Invalidierungsfunktionen markieren alle abhängigen Cache-Einträge als stale.
 * - Collection-, Relations- und Seiteneffekt-Mutationen invalidieren die UI-relevanten Listen, Boards und Counter-Grundlagen.
 *
 * Fehlerfälle:
 * - Fehlende Invalidierung für Projekt-, Task-, Feature-, Use-Case-, Kommentar-, Notiz-, Datei-, Tag- oder Suchdaten wird sichtbar.
 *
 * Ziel:
 * Den zentralen TanStack-Query-Invalidierungsvertrag gegen echte QueryClient-Cache-Einträge absichern.
 */
import { QueryClient, type QueryKey } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";
import {
  invalidateAttachments,
  invalidateBacklogScope,
  invalidateComments,
  invalidateEvents,
  invalidateFeatureScope,
  invalidateNotes,
  invalidateProjectScope,
  invalidateProjects,
  invalidateTags,
  invalidateTaskScope,
  invalidateUseCaseScope,
  invalidateWiki,
  invalidateWikiImportData
} from "../../../../apps/web/src/queries/invalidation";
import { queryKeys } from "../../../../apps/web/src/queries/queryKeys";

const projectId = 11;
const taskId = 22;
const featureId = 33;
const useCaseId = 44;
const attachmentId = 66;
const wikiPageId = 77;

const knownQueries = {
  projectsList: queryKeys.projects.list(),
  projectDetail: queryKeys.projects.detail(projectId),
  projectTasks: queryKeys.projects.tasks(projectId),
  projectBacklog: queryKeys.projects.backlog(projectId),
  projectFeatures: queryKeys.projects.features(projectId),
  tasksList: queryKeys.tasks.list(),
  taskDetail: queryKeys.tasks.detail(taskId),
  taskFeatures: queryKeys.tasks.features(taskId),
  taskUseCases: queryKeys.tasks.useCases(taskId),
  featuresList: queryKeys.features.list(),
  featureDetail: queryKeys.features.detail(featureId),
  featureUseCases: queryKeys.features.useCases(featureId),
  featureProjects: queryKeys.features.projects(featureId),
  featureTasks: queryKeys.features.tasks(featureId),
  useCaseDetail: queryKeys.useCases.detail(useCaseId),
  useCaseTasks: queryKeys.useCases.tasks(useCaseId),
  projectComments: queryKeys.comments.entity("project", projectId),
  taskComments: queryKeys.comments.entity("task", taskId),
  projectNotes: queryKeys.notes.owner("project", projectId),
  taskNotes: queryKeys.notes.owner("task", taskId),
  projectAttachments: queryKeys.attachments.owner("project", projectId),
  taskAttachments: queryKeys.attachments.owner("task", taskId),
  attachmentPreview: queryKeys.attachments.preview(attachmentId),
  tagsList: queryKeys.tags.list(),
  wikiTree: queryKeys.wiki.tree(),
  wikiDetail: queryKeys.wiki.detail(wikiPageId),
  eventsList: queryKeys.events.list("2026-05"),
  calendarTasks: queryKeys.calendarTasks.list(),
  localBackupStatus: queryKeys.dumps.localStatus(),
  globalSearch: queryKeys.globalSearch.data()
} satisfies Record<string, QueryKey>;

type KnownQueryLabel = keyof typeof knownQueries;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });
}

function seedKnownQueries(queryClient: QueryClient) {
  for (const [label, queryKey] of Object.entries(knownQueries)) {
    queryClient.setQueryData(queryKey, { label });
  }
}

function invalidatedLabels(queryClient: QueryClient): KnownQueryLabel[] {
  return Object.entries(knownQueries)
    .filter(([, queryKey]) => queryClient.getQueryState(queryKey)?.isInvalidated)
    .map(([label]) => label as KnownQueryLabel)
    .sort();
}

function expectInvalidated(queryClient: QueryClient, labels: KnownQueryLabel[]) {
  expect(invalidatedLabels(queryClient)).toEqual([...labels].sort());
}

let queryClient: QueryClient | null = null;

afterEach(() => {
  queryClient?.clear();
  queryClient = null;
});

describe("Query invalidation integration", () => {
  it("definiert eindeutige, verschachtelte Query-Keys für globale UI-Aktualität", () => {
    const serializedKeys = Object.values(knownQueries).map((queryKey) => JSON.stringify(queryKey));

    expect(new Set(serializedKeys).size).toBe(serializedKeys.length);
    expect(queryKeys.projects.tasks(projectId)).toEqual(["projects", "detail", projectId, "tasks"]);
    expect(queryKeys.tasks.features(taskId)).toEqual(["tasks", "detail", taskId, "features"]);
    expect(queryKeys.features.projects(featureId)).toEqual(["features", "detail", featureId, "projects"]);
    expect(queryKeys.globalSearch.data()).toEqual(["globalSearch", "data"]);
  });

  it("invalidiert Projekt-Scope für Projektlisten, Detaildaten, abhängige Tasks und Suche", async () => {
    queryClient = createQueryClient();
    seedKnownQueries(queryClient);

    await invalidateProjectScope(queryClient, projectId);

    expectInvalidated(queryClient, [
      "projectsList",
      "projectDetail",
      "projectTasks",
      "projectBacklog",
      "projectFeatures",
      "tasksList",
      "taskDetail",
      "taskFeatures",
      "taskUseCases",
      "calendarTasks",
      "eventsList",
      "globalSearch"
    ]);
  });

  it("invalidiert Task-Scope für Counter, Listen, Boards, Task-Detail und Suche", async () => {
    queryClient = createQueryClient();
    seedKnownQueries(queryClient);

    await invalidateTaskScope(queryClient, taskId);

    expectInvalidated(queryClient, [
      "projectsList",
      "projectDetail",
      "projectTasks",
      "projectBacklog",
      "projectFeatures",
      "tasksList",
      "taskDetail",
      "taskFeatures",
      "taskUseCases",
      "calendarTasks",
      "eventsList",
      "globalSearch"
    ]);
  });

  it("invalidiert Feature- und Use-Case-Scope für Relationen, Listen und Suche", async () => {
    queryClient = createQueryClient();
    seedKnownQueries(queryClient);

    await invalidateFeatureScope(queryClient, featureId);

    expectInvalidated(queryClient, [
      "projectsList",
      "projectDetail",
      "projectTasks",
      "projectBacklog",
      "projectFeatures",
      "tasksList",
      "taskDetail",
      "taskFeatures",
      "taskUseCases",
      "featuresList",
      "featureDetail",
      "featureUseCases",
      "featureProjects",
      "featureTasks",
      "globalSearch"
    ]);

    queryClient.clear();
    seedKnownQueries(queryClient);

    await invalidateUseCaseScope(queryClient, featureId, useCaseId);

    expectInvalidated(queryClient, [
      "tasksList",
      "taskDetail",
      "taskFeatures",
      "taskUseCases",
      "featuresList",
      "featureDetail",
      "featureUseCases",
      "featureProjects",
      "featureTasks",
      "useCaseDetail",
      "useCaseTasks",
      "globalSearch"
    ]);
  });

  it("invalidiert Backlog, Kommentare, Notizen, Dateien und Tags zielgerichtet plus globale Suche", async () => {
    queryClient = createQueryClient();
    seedKnownQueries(queryClient);

    await invalidateBacklogScope(queryClient, projectId);

    expectInvalidated(queryClient, ["projectDetail", "projectTasks", "projectBacklog", "projectFeatures", "globalSearch"]);

    queryClient.clear();
    seedKnownQueries(queryClient);

    await invalidateComments(queryClient, "project", projectId);

    expectInvalidated(queryClient, ["projectComments", "globalSearch"]);

    queryClient.clear();
    seedKnownQueries(queryClient);

    await invalidateNotes(queryClient, "project", projectId);

    expectInvalidated(queryClient, ["projectNotes", "globalSearch"]);

    queryClient.clear();
    seedKnownQueries(queryClient);

    await invalidateAttachments(queryClient, "project", projectId);

    expectInvalidated(queryClient, ["projectAttachments", "globalSearch"]);

    queryClient.clear();
    seedKnownQueries(queryClient);

    await invalidateTags(queryClient);

    expectInvalidated(queryClient, [
      "projectsList",
      "projectDetail",
      "projectTasks",
      "projectBacklog",
      "projectFeatures",
      "tasksList",
      "taskDetail",
      "taskFeatures",
      "taskUseCases",
      "tagsList",
      "globalSearch"
    ]);
  });

  it("invalidiert Wiki, Events, Projektlisten und Wiki-Import-Folgen mit den passenden globalen Abhängigkeiten", async () => {
    queryClient = createQueryClient();
    seedKnownQueries(queryClient);

    await invalidateWiki(queryClient);

    expectInvalidated(queryClient, ["wikiTree", "wikiDetail", "globalSearch"]);

    queryClient.clear();
    seedKnownQueries(queryClient);

    await invalidateEvents(queryClient);

    expectInvalidated(queryClient, ["eventsList"]);

    queryClient.clear();
    seedKnownQueries(queryClient);

    await invalidateProjects(queryClient);

    expectInvalidated(queryClient, ["projectsList", "projectDetail", "projectTasks", "projectBacklog", "projectFeatures", "globalSearch"]);

    queryClient.clear();
    seedKnownQueries(queryClient);

    await invalidateWikiImportData(queryClient);

    expectInvalidated(queryClient, [
      "projectsList",
      "projectDetail",
      "projectTasks",
      "projectBacklog",
      "projectFeatures",
      "tasksList",
      "taskDetail",
      "taskFeatures",
      "taskUseCases",
      "featuresList",
      "featureDetail",
      "featureUseCases",
      "featureProjects",
      "featureTasks",
      "useCaseDetail",
      "useCaseTasks",
      "projectComments",
      "taskComments",
      "projectNotes",
      "taskNotes",
      "projectAttachments",
      "taskAttachments",
      "attachmentPreview",
      "tagsList",
      "wikiTree",
      "wikiDetail",
      "calendarTasks",
      "globalSearch"
    ]);
  });
});
