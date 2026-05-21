/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Wiki-Import-Vorschau liest Features, Use Cases und offene Aufgaben ohne Datenmutation.
 * - Wiki-Import-Lauf legt Projekt-Features, Use Cases, Aufgaben und ableitbare Verknüpfungen an.
 * - Wiederholte Importe nutzen Slugs und Task-Import-Keys statt Duplikate zu erzeugen.
 *
 * Fehlerfälle:
 * - Fehlender Quellordner liefert 400.
 * - Unbekanntes Zielprojekt liefert 404.
 *
 * Ziel:
 * Den projektbezogenen Wiki-Import gegen reale In-Memory-SQLite-Tabellen und temporäre Markdown-Dateien absichern.
 */

import type { FastifyInstance } from "fastify";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { setContentBaseDir } from "../../../apps/api/src/services/content.service.js";
import { buildTestApp, createProject, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

describe("Wiki Import API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let tmpContentDir: string;
  let tmpWikiRoot: string;

  beforeAll(async () => {
    tmpContentDir = fs.mkdtempSync(path.join(os.tmpdir(), "taskmanager-content-"));
    tmpWikiRoot = fs.mkdtempSync(path.join(os.tmpdir(), "taskmanager-wiki-"));
    setContentBaseDir(tmpContentDir);
    testDb = createTestDb();
    app = await buildTestApp(testDb);
  });

  beforeEach(() => {
    truncateAll(testDb.sqlite);
    fs.rmSync(tmpContentDir, { recursive: true, force: true });
    fs.rmSync(tmpWikiRoot, { recursive: true, force: true });
    fs.mkdirSync(tmpContentDir, { recursive: true });
    fs.mkdirSync(tmpWikiRoot, { recursive: true });
    writeWikiFixture(tmpWikiRoot);
  });

  afterAll(async () => {
    await app.close();
    testDb.sqlite.close();
    fs.rmSync(tmpContentDir, { recursive: true, force: true });
    fs.rmSync(tmpWikiRoot, { recursive: true, force: true });
  });

  it("POST preview liest Wiki ohne Daten zu verändern", async () => {
    const project = await createProject(app);

    const res = await supertest(app.server).post(`/api/projects/${project.id}/import/wiki/preview`).send({ sourcePath: tmpWikiRoot }).expect(200);

    expect(res.body).toMatchObject({ projectId: project.id, mode: "preview" });
    expect(res.body.summary.errors).toBe(0);
    expect(res.body.items.some((item: { type: string; action: string }) => item.type === "feature" && item.action === "created")).toBe(true);
    expect(res.body.items.some((item: { type: string; action: string }) => item.type === "useCase" && item.action === "created")).toBe(true);
    expect(res.body.items.some((item: { type: string; action: string }) => item.type === "task" && item.action === "created")).toBe(true);

    await supertest(app.server).get("/api/features").expect(200).expect([]);
    await supertest(app.server).get(`/api/projects/${project.id}/tasks`).expect(200).expect([]);
  });

  it("POST run importiert Features, Use Cases und Projektaufgaben mit Verknüpfungen", async () => {
    const project = await createProject(app);

    const report = await supertest(app.server).post(`/api/projects/${project.id}/import/wiki/run`).send({ sourcePath: tmpWikiRoot }).expect(200);
    expect(report.body.summary.created).toBeGreaterThanOrEqual(5);

    const features = await supertest(app.server).get("/api/features").expect(200);
    expect(features.body).toHaveLength(1);
    expect(features.body[0]).toMatchObject({ slug: "ft-01-kalendertermine", status: "active" });

    const projectFeatures = await supertest(app.server).get(`/api/projects/${project.id}/features`).expect(200);
    expect(projectFeatures.body.map((feature: { slug: string }) => feature.slug)).toEqual(["ft-01-kalendertermine"]);

    const useCases = await supertest(app.server).get(`/api/features/${features.body[0].id}/use-cases`).expect(200);
    expect(useCases.body).toHaveLength(1);
    expect(useCases.body[0]).toMatchObject({ slug: "uc-01-01-termin-anlegen", status: "active" });

    const tasks = await supertest(app.server).get(`/api/projects/${project.id}/tasks`).expect(200);
    expect(tasks.body).toHaveLength(1);
    expect(tasks.body[0]).toMatchObject({ title: "Importierte Aufgabe", priority: "high" });

    const featureTasks = await supertest(app.server).get(`/api/features/${features.body[0].id}/tasks`).expect(200);
    expect(featureTasks.body.map((task: { id: number }) => task.id)).toEqual([tasks.body[0].id]);

    const useCaseTasks = await supertest(app.server).get(`/api/use-cases/${useCases.body[0].id}/tasks`).expect(200);
    expect(useCaseTasks.body.map((task: { id: number }) => task.id)).toEqual([tasks.body[0].id]);
  });

  it("POST run kann wiederholt werden und aktualisiert per Slug und Import-Key", async () => {
    const project = await createProject(app);
    await supertest(app.server).post(`/api/projects/${project.id}/import/wiki/run`).send({ sourcePath: tmpWikiRoot }).expect(200);
    writeWikiFixture(tmpWikiRoot, { featureTitle: "FT (01): Kalendertermine aktualisiert", taskTitle: "Importierte Aufgabe aktualisiert" });

    const secondRun = await supertest(app.server).post(`/api/projects/${project.id}/import/wiki/run`).send({ sourcePath: tmpWikiRoot }).expect(200);
    expect(secondRun.body.items.some((item: { type: string; action: string }) => item.type === "feature" && item.action === "updated")).toBe(true);
    expect(secondRun.body.items.some((item: { type: string; action: string }) => item.type === "task" && item.action === "updated")).toBe(true);

    const features = await supertest(app.server).get("/api/features").expect(200);
    expect(features.body).toHaveLength(1);
    expect(features.body[0].title).toBe("FT (01): Kalendertermine aktualisiert");

    const tasks = await supertest(app.server).get(`/api/projects/${project.id}/tasks`).expect(200);
    expect(tasks.body).toHaveLength(1);
    expect(tasks.body[0].title).toBe("Importierte Aufgabe aktualisiert");

    const importKeyRows = testDb.sqlite.prepare("SELECT import_key FROM tasks").all() as Array<{ import_key: string }>;
    expect(importKeyRows).toEqual([{ import_key: "wiki:tasks/importierte-aufgabe.md" }]);
  });

  it("POST preview mit fehlendem Quellordner liefert 400", async () => {
    const project = await createProject(app);

    await supertest(app.server).post(`/api/projects/${project.id}/import/wiki/preview`).send({ sourcePath: path.join(tmpWikiRoot, "missing") }).expect(400);
  });

  it("POST run mit unbekanntem Projekt liefert 404", async () => {
    await supertest(app.server).post("/api/projects/9999/import/wiki/run").send({ sourcePath: tmpWikiRoot }).expect(404);
  });
});

function writeWikiFixture(root: string, overrides: { featureTitle?: string; taskTitle?: string } = {}): void {
  const featureDir = path.join(root, "features", "ft-01-kalendertermine");
  const useCaseDir = path.join(featureDir, "use-cases");
  const tasksDir = path.join(root, "tasks");
  const closedTasksDir = path.join(tasksDir, "closed");
  fs.mkdirSync(useCaseDir, { recursive: true });
  fs.mkdirSync(closedTasksDir, { recursive: true });

  fs.writeFileSync(
    path.join(featureDir, "ft-01-kalendertermine.md"),
    `# ${overrides.featureTitle ?? "FT (01): Kalendertermine"}

## Ziel / Zweck

Kalendertermine werden im Projektkontext gepflegt.

## Use Cases

- [UC 01/01](use-cases/uc-01-01-termin-anlegen.md)
`,
    "utf8"
  );

  fs.writeFileSync(
    path.join(useCaseDir, "uc-01-01-termin-anlegen.md"),
    `# UC 01/01: Termin anlegen

## Akteur

Disponent

## Ziel

Ein Termin soll angelegt werden.

## Vorbedingungen

- Ein Projekt existiert.

## Ablauf

1. Der Akteur öffnet den Kalender.

## Alternativen

- Abbruch.

## Ergebnis

Der Termin ist gespeichert.
`,
    "utf8"
  );

  fs.writeFileSync(
    path.join(tasksDir, "README.md"),
    "# Aufgaben\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(tasksDir, "template.md"),
    "# Template\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(closedTasksDir, "geschlossene-aufgabe.md"),
    "# Geschlossene Aufgabe\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(tasksDir, "importierte-aufgabe.md"),
    `# ${overrides.taskTitle ?? "Importierte Aufgabe"}

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| \`offen\` | Hoch | Kalender | Implementierung | 16.05.26 |

## Ziel

Diese Aufgabe soll aus dem Wiki importiert werden.

## Beziehungen

- Feature: [FT (01): Kalendertermine](../features/ft-01-kalendertermine/ft-01-kalendertermine.md)
- Use Case: [UC 01/01](../features/ft-01-kalendertermine/use-cases/uc-01-01-termin-anlegen.md)
`,
    "utf8"
  );
}
