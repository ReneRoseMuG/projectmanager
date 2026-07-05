import type { TaskOwner, TicketOwner } from "@taskmanager/shared-types";
import { eq, inArray, or } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import {
  featureTasks,
  featureTickets,
  milestoneFeatures,
  milestoneTasks,
  milestoneTickets,
  milestones,
  projectFeatures,
  projects,
  projectTasks,
  projectTickets,
  taskTickets,
  tasks,
  ticketRelations,
  tickets,
  useCases,
  useCaseTasks,
  useCaseTickets
} from "../db/schema.js";
import { firstRow } from "../db/query-utils.js";
import { badRequest } from "../utils/errors.js";

export type ProjectContext = Set<number>;

function addProjectId(context: ProjectContext, projectId: number | null | undefined): void {
  if (typeof projectId === "number" && Number.isFinite(projectId)) {
    context.add(projectId);
  }
}

function mergeProjectContext(target: ProjectContext, source: ProjectContext): void {
  for (const projectId of source) {
    target.add(projectId);
  }
}

async function collectFeatureProjectIds(database: DbClient, featureId: number, context: ProjectContext): Promise<void> {
  const directProjectRows = await database.select({ projectId: projectFeatures.projectId }).from(projectFeatures).where(eq(projectFeatures.featureId, featureId));
  for (const row of directProjectRows) {
    addProjectId(context, row.projectId);
  }

  const milestoneProjectRows = await database
    .select({ projectId: milestones.projectId })
    .from(milestoneFeatures)
    .innerJoin(milestones, eq(milestoneFeatures.milestoneId, milestones.id))
    .where(eq(milestoneFeatures.featureId, featureId));
  for (const row of milestoneProjectRows) {
    addProjectId(context, row.projectId);
  }
}

async function collectUseCaseProjectIds(database: DbClient, useCaseId: number, context: ProjectContext): Promise<void> {
  const useCase = firstRow(await database.select({ featureId: useCases.featureId }).from(useCases).where(eq(useCases.id, useCaseId)));
  if (useCase) {
    await collectFeatureProjectIds(database, useCase.featureId, context);
  }
}

export async function taskOwnerProjectContext(database: DbClient, owner: TaskOwner): Promise<ProjectContext> {
  const context = new Set<number>();

  if (owner.type === "project") {
    addProjectId(context, owner.id);
    return context;
  }

  if (owner.type === "milestone") {
    const milestone = firstRow(await database.select({ projectId: milestones.projectId }).from(milestones).where(eq(milestones.id, owner.id)));
    addProjectId(context, milestone?.projectId);
    return context;
  }

  if (owner.type === "feature") {
    await collectFeatureProjectIds(database, owner.id, context);
    return context;
  }

  await collectUseCaseProjectIds(database, owner.id, context);
  return context;
}

export async function taskProjectContext(database: DbClient, taskId: number, visitedTasks = new Set<number>()): Promise<ProjectContext> {
  const context = new Set<number>();
  if (visitedTasks.has(taskId)) {
    return context;
  }
  visitedTasks.add(taskId);

  const task = firstRow(await database.select({ parentId: tasks.parentId }).from(tasks).where(eq(tasks.id, taskId)));
  if (!task) {
    return context;
  }

  const [parentContext, projectRows, milestoneRows, featureRows, useCaseRows] = await Promise.all([
    task.parentId !== null ? taskProjectContext(database, task.parentId, visitedTasks) : Promise.resolve(new Set<number>()),
    database.select({ projectId: projectTasks.ownerId }).from(projectTasks).where(eq(projectTasks.taskId, taskId)),
    database
      .select({ projectId: milestones.projectId })
      .from(milestoneTasks)
      .innerJoin(milestones, eq(milestoneTasks.ownerId, milestones.id))
      .where(eq(milestoneTasks.taskId, taskId)),
    database.select({ featureId: featureTasks.ownerId }).from(featureTasks).where(eq(featureTasks.taskId, taskId)),
    database.select({ useCaseId: useCaseTasks.ownerId }).from(useCaseTasks).where(eq(useCaseTasks.taskId, taskId))
  ]);

  mergeProjectContext(context, parentContext);
  for (const row of projectRows) {
    addProjectId(context, row.projectId);
  }
  for (const row of milestoneRows) {
    addProjectId(context, row.projectId);
  }
  await Promise.all([
    ...featureRows.map((row) => collectFeatureProjectIds(database, row.featureId, context)),
    ...useCaseRows.map((row) => collectUseCaseProjectIds(database, row.useCaseId, context))
  ]);

  return context;
}

export async function ticketOwnerProjectContext(database: DbClient, owner: TicketOwner): Promise<ProjectContext> {
  const context = new Set<number>();

  if (owner.type === "project") {
    addProjectId(context, owner.id);
    return context;
  }

  if (owner.type === "milestone") {
    const milestone = firstRow(await database.select({ projectId: milestones.projectId }).from(milestones).where(eq(milestones.id, owner.id)));
    addProjectId(context, milestone?.projectId);
    return context;
  }

  if (owner.type === "task") {
    return taskProjectContext(database, owner.id);
  }

  if (owner.type === "feature") {
    await collectFeatureProjectIds(database, owner.id, context);
    return context;
  }

  await collectUseCaseProjectIds(database, owner.id, context);
  return context;
}

export async function ticketProjectContext(database: DbClient, ticketId: number, visitedTickets = new Set<number>()): Promise<ProjectContext> {
  const context = new Set<number>();
  if (visitedTickets.has(ticketId)) {
    return context;
  }
  visitedTickets.add(ticketId);

  const ticket = firstRow(await database.select({ parentId: tickets.parentId }).from(tickets).where(eq(tickets.id, ticketId)));
  if (!ticket) {
    return context;
  }

  const [parentContext, projectRows, milestoneRows, taskRows, featureRows, useCaseRows, relationRows] = await Promise.all([
    ticket.parentId !== null ? ticketProjectContext(database, ticket.parentId, visitedTickets) : Promise.resolve(new Set<number>()),
    database.select({ projectId: projectTickets.ownerId }).from(projectTickets).where(eq(projectTickets.ticketId, ticketId)),
    database
      .select({ projectId: milestones.projectId })
      .from(milestoneTickets)
      .innerJoin(milestones, eq(milestoneTickets.ownerId, milestones.id))
      .where(eq(milestoneTickets.ticketId, ticketId)),
    database.select({ taskId: taskTickets.ownerId }).from(taskTickets).where(eq(taskTickets.ticketId, ticketId)),
    database.select({ featureId: featureTickets.ownerId }).from(featureTickets).where(eq(featureTickets.ticketId, ticketId)),
    database.select({ useCaseId: useCaseTickets.ownerId }).from(useCaseTickets).where(eq(useCaseTickets.ticketId, ticketId)),
    database
      .select({ sourceTicketId: ticketRelations.sourceTicketId, targetTicketId: ticketRelations.targetTicketId })
      .from(ticketRelations)
      .where(or(eq(ticketRelations.sourceTicketId, ticketId), eq(ticketRelations.targetTicketId, ticketId)))
  ]);

  mergeProjectContext(context, parentContext);
  for (const row of projectRows) {
    addProjectId(context, row.projectId);
  }
  for (const row of milestoneRows) {
    addProjectId(context, row.projectId);
  }
  await Promise.all([
    ...taskRows.map((row) => taskProjectContext(database, row.taskId).then((ctx) => mergeProjectContext(context, ctx))),
    ...featureRows.map((row) => collectFeatureProjectIds(database, row.featureId, context)),
    ...useCaseRows.map((row) => collectUseCaseProjectIds(database, row.useCaseId, context)),
    ...relationRows.map((row) => {
      const relatedTicketId = row.sourceTicketId === ticketId ? row.targetTicketId : row.sourceTicketId;
      return ticketProjectContext(database, relatedTicketId, visitedTickets).then((ctx) => mergeProjectContext(context, ctx));
    })
  ]);

  return context;
}

// ---------------------------------------------------------------------------
// Gebündelte Kontext-Auflösung
//
// Die rekursiven Bausteine oben lösen den Projektkontext pro Knoten mit mehreren
// parallelen Queries auf. Für Kandidatenlisten (alle Aufgaben / alle Tickets)
// erzeugt das eine Query-Flut, die den Verbindungspool sprengt. Die folgenden
// Builder laden stattdessen alle benötigten Kanten in wenigen inArray-Queries und
// bauen die Projektkontext-Mengen in-memory zusammen. Ergebnis pro Knoten ist
// identisch zu taskProjectContext/ticketProjectContext (gleiche Menge an
// projectIds), nur ohne rekursiven Fan-out.
// ---------------------------------------------------------------------------

async function buildFeatureProjectIdMap(database: DbClient, featureIds: number[]): Promise<Map<number, ProjectContext>> {
  const map = new Map<number, ProjectContext>();
  const uniqueIds = [...new Set(featureIds)];
  if (uniqueIds.length === 0) {
    return map;
  }

  const ensure = (featureId: number): ProjectContext => {
    let ctx = map.get(featureId);
    if (!ctx) {
      ctx = new Set<number>();
      map.set(featureId, ctx);
    }
    return ctx;
  };
  for (const featureId of uniqueIds) {
    ensure(featureId);
  }

  const [directProjectRows, milestoneProjectRows] = await Promise.all([
    database.select({ featureId: projectFeatures.featureId, projectId: projectFeatures.projectId }).from(projectFeatures).where(inArray(projectFeatures.featureId, uniqueIds)),
    database
      .select({ featureId: milestoneFeatures.featureId, projectId: milestones.projectId })
      .from(milestoneFeatures)
      .innerJoin(milestones, eq(milestoneFeatures.milestoneId, milestones.id))
      .where(inArray(milestoneFeatures.featureId, uniqueIds))
  ]);

  for (const row of directProjectRows) {
    addProjectId(ensure(row.featureId), row.projectId);
  }
  for (const row of milestoneProjectRows) {
    addProjectId(ensure(row.featureId), row.projectId);
  }

  return map;
}

async function buildUseCaseProjectIdMap(database: DbClient, useCaseIds: number[]): Promise<Map<number, ProjectContext>> {
  const map = new Map<number, ProjectContext>();
  const uniqueIds = [...new Set(useCaseIds)];
  if (uniqueIds.length === 0) {
    return map;
  }

  // Use Case → Feature → Projektkontext. Erst die featureId je Use Case laden,
  // dann die Feature-Kontexte gebündelt auflösen.
  const useCaseRows = await database.select({ id: useCases.id, featureId: useCases.featureId }).from(useCases).where(inArray(useCases.id, uniqueIds));
  const featureMap = await buildFeatureProjectIdMap(database, useCaseRows.map((row) => row.featureId));

  for (const useCaseId of uniqueIds) {
    map.set(useCaseId, new Set<number>());
  }
  for (const row of useCaseRows) {
    const target = map.get(row.id)!;
    const featureContext = featureMap.get(row.featureId);
    if (featureContext) {
      mergeProjectContext(target, featureContext);
    }
  }

  return map;
}

/**
 * Löst den Projektkontext für ALLE angegebenen Aufgaben gebündelt auf.
 * Semantik identisch zu taskProjectContext je Aufgabe: direkte Projekt-,
 * Meilenstein-, Feature- und Use-Case-Bezüge plus der Kontext der gesamten
 * Elternkette (nach oben über parentId). Umgesetzt als flache inArray-Ladung
 * plus In-Memory-Closure statt rekursivem Fan-out.
 */
export async function buildTaskProjectContextMap(database: DbClient, taskIds: number[]): Promise<Map<number, ProjectContext>> {
  const result = new Map<number, ProjectContext>();
  const rootIds = [...new Set(taskIds)];
  if (rootIds.length === 0) {
    return result;
  }

  // Elternkette schrittweise nach oben auflösen, bis keine neuen Aufgaben mehr
  // dazukommen. So werden nur die tatsächlich erreichbaren Aufgaben geladen.
  const parentById = new Map<number, number | null>();
  let frontier = rootIds.filter((id) => !parentById.has(id));
  while (frontier.length > 0) {
    const rows = await database.select({ id: tasks.id, parentId: tasks.parentId }).from(tasks).where(inArray(tasks.id, frontier));
    const next: number[] = [];
    for (const row of rows) {
      parentById.set(row.id, row.parentId);
      if (row.parentId !== null && !parentById.has(row.parentId)) {
        next.push(row.parentId);
      }
    }
    frontier = [...new Set(next)];
  }

  const allTaskIds = [...parentById.keys()];
  if (allTaskIds.length === 0) {
    for (const id of rootIds) {
      result.set(id, new Set<number>());
    }
    return result;
  }

  // Direkte Kanten aller beteiligten Aufgaben gebündelt laden.
  const [projectRows, milestoneRows, featureRows, useCaseRows] = await Promise.all([
    database.select({ taskId: projectTasks.taskId, projectId: projectTasks.ownerId }).from(projectTasks).where(inArray(projectTasks.taskId, allTaskIds)),
    database
      .select({ taskId: milestoneTasks.taskId, projectId: milestones.projectId })
      .from(milestoneTasks)
      .innerJoin(milestones, eq(milestoneTasks.ownerId, milestones.id))
      .where(inArray(milestoneTasks.taskId, allTaskIds)),
    database.select({ taskId: featureTasks.taskId, featureId: featureTasks.ownerId }).from(featureTasks).where(inArray(featureTasks.taskId, allTaskIds)),
    database.select({ taskId: useCaseTasks.taskId, useCaseId: useCaseTasks.ownerId }).from(useCaseTasks).where(inArray(useCaseTasks.taskId, allTaskIds))
  ]);

  const featureMap = await buildFeatureProjectIdMap(database, featureRows.map((row) => row.featureId));
  const useCaseMap = await buildUseCaseProjectIdMap(database, useCaseRows.map((row) => row.useCaseId));

  // "Eigene" (nicht-rekursive) Kontextmenge je Aufgabe aufbauen.
  const ownContext = new Map<number, ProjectContext>();
  const ensureOwn = (taskId: number): ProjectContext => {
    let ctx = ownContext.get(taskId);
    if (!ctx) {
      ctx = new Set<number>();
      ownContext.set(taskId, ctx);
    }
    return ctx;
  };
  for (const taskId of allTaskIds) {
    ensureOwn(taskId);
  }
  for (const row of projectRows) {
    addProjectId(ensureOwn(row.taskId), row.projectId);
  }
  for (const row of milestoneRows) {
    addProjectId(ensureOwn(row.taskId), row.projectId);
  }
  for (const row of featureRows) {
    const ctx = featureMap.get(row.featureId);
    if (ctx) {
      mergeProjectContext(ensureOwn(row.taskId), ctx);
    }
  }
  for (const row of useCaseRows) {
    const ctx = useCaseMap.get(row.useCaseId);
    if (ctx) {
      mergeProjectContext(ensureOwn(row.taskId), ctx);
    }
  }

  // Vollen Kontext je Aufgabe = eigene Menge ∪ Elternkette. Memoisiert, damit
  // gemeinsame Elternketten nur einmal berechnet werden.
  const fullContext = new Map<number, ProjectContext>();
  const resolveFull = (taskId: number, visited: Set<number>): ProjectContext => {
    const cached = fullContext.get(taskId);
    if (cached) {
      return cached;
    }
    if (visited.has(taskId)) {
      return new Set<number>();
    }
    visited.add(taskId);

    const ctx = new Set<number>(ensureOwn(taskId));
    const parentId = parentById.get(taskId);
    if (parentId !== null && parentId !== undefined) {
      mergeProjectContext(ctx, resolveFull(parentId, visited));
    }
    fullContext.set(taskId, ctx);
    return ctx;
  };

  for (const taskId of allTaskIds) {
    resolveFull(taskId, new Set<number>());
  }
  for (const id of rootIds) {
    result.set(id, fullContext.get(id) ?? new Set<number>());
  }

  return result;
}

/**
 * Löst den Projektkontext für ALLE angegebenen Tickets gebündelt auf.
 * Semantik identisch zu ticketProjectContext je Ticket: direkte Projekt-,
 * Meilenstein-, Feature-, Use-Case- und Aufgaben-Bezüge (letztere über den
 * vollen Aufgabenkontext) plus der Kontext der Elternkette (nach oben) und
 * aller über ticketRelations verbundenen Tickets (beide Richtungen).
 */
export async function buildTicketProjectContextMap(database: DbClient, ticketIds: number[]): Promise<Map<number, ProjectContext>> {
  const result = new Map<number, ProjectContext>();
  const rootIds = [...new Set(ticketIds)];
  if (rootIds.length === 0) {
    return result;
  }

  // Erreichbare Tickets bestimmen: nach oben über parentId UND über
  // ticketRelations (beide Richtungen). Schrittweise erweitern, bis stabil.
  const parentById = new Map<number, number | null>();
  const relationPeers = new Map<number, Set<number>>();
  const ensurePeers = (ticketId: number): Set<number> => {
    let peers = relationPeers.get(ticketId);
    if (!peers) {
      peers = new Set<number>();
      relationPeers.set(ticketId, peers);
    }
    return peers;
  };

  let frontier = [...rootIds];
  while (frontier.length > 0) {
    const [ticketRows, relationRows] = await Promise.all([
      database.select({ id: tickets.id, parentId: tickets.parentId }).from(tickets).where(inArray(tickets.id, frontier)),
      database
        .select({ sourceTicketId: ticketRelations.sourceTicketId, targetTicketId: ticketRelations.targetTicketId })
        .from(ticketRelations)
        .where(or(inArray(ticketRelations.sourceTicketId, frontier), inArray(ticketRelations.targetTicketId, frontier)))
    ]);

    const next: number[] = [];
    for (const row of ticketRows) {
      if (!parentById.has(row.id)) {
        parentById.set(row.id, row.parentId);
        if (row.parentId !== null) {
          next.push(row.parentId);
        }
      }
    }
    for (const row of relationRows) {
      ensurePeers(row.sourceTicketId).add(row.targetTicketId);
      ensurePeers(row.targetTicketId).add(row.sourceTicketId);
      next.push(row.sourceTicketId, row.targetTicketId);
    }
    frontier = [...new Set(next.filter((id) => !parentById.has(id)))];
  }

  const allTicketIds = [...parentById.keys()];
  if (allTicketIds.length === 0) {
    for (const id of rootIds) {
      result.set(id, new Set<number>());
    }
    return result;
  }

  // Direkte Kanten aller beteiligten Tickets gebündelt laden.
  const [projectRows, milestoneRows, taskRows, featureRows, useCaseRows] = await Promise.all([
    database.select({ ticketId: projectTickets.ticketId, projectId: projectTickets.ownerId }).from(projectTickets).where(inArray(projectTickets.ticketId, allTicketIds)),
    database
      .select({ ticketId: milestoneTickets.ticketId, projectId: milestones.projectId })
      .from(milestoneTickets)
      .innerJoin(milestones, eq(milestoneTickets.ownerId, milestones.id))
      .where(inArray(milestoneTickets.ticketId, allTicketIds)),
    database.select({ ticketId: taskTickets.ticketId, taskId: taskTickets.ownerId }).from(taskTickets).where(inArray(taskTickets.ticketId, allTicketIds)),
    database.select({ ticketId: featureTickets.ticketId, featureId: featureTickets.ownerId }).from(featureTickets).where(inArray(featureTickets.ticketId, allTicketIds)),
    database.select({ ticketId: useCaseTickets.ticketId, useCaseId: useCaseTickets.ownerId }).from(useCaseTickets).where(inArray(useCaseTickets.ticketId, allTicketIds))
  ]);

  const [featureMap, useCaseMap, taskContextMap] = await Promise.all([
    buildFeatureProjectIdMap(database, featureRows.map((row) => row.featureId)),
    buildUseCaseProjectIdMap(database, useCaseRows.map((row) => row.useCaseId)),
    buildTaskProjectContextMap(database, taskRows.map((row) => row.taskId))
  ]);

  // "Eigene" (nicht über Eltern/Relationen erweiterte) Kontextmenge je Ticket.
  const ownContext = new Map<number, ProjectContext>();
  const ensureOwn = (ticketId: number): ProjectContext => {
    let ctx = ownContext.get(ticketId);
    if (!ctx) {
      ctx = new Set<number>();
      ownContext.set(ticketId, ctx);
    }
    return ctx;
  };
  for (const ticketId of allTicketIds) {
    ensureOwn(ticketId);
  }
  for (const row of projectRows) {
    addProjectId(ensureOwn(row.ticketId), row.projectId);
  }
  for (const row of milestoneRows) {
    addProjectId(ensureOwn(row.ticketId), row.projectId);
  }
  for (const row of taskRows) {
    const ctx = taskContextMap.get(row.taskId);
    if (ctx) {
      mergeProjectContext(ensureOwn(row.ticketId), ctx);
    }
  }
  for (const row of featureRows) {
    const ctx = featureMap.get(row.featureId);
    if (ctx) {
      mergeProjectContext(ensureOwn(row.ticketId), ctx);
    }
  }
  for (const row of useCaseRows) {
    const ctx = useCaseMap.get(row.useCaseId);
    if (ctx) {
      mergeProjectContext(ensureOwn(row.ticketId), ctx);
    }
  }

  // Vollen Kontext je Ticket = eigene Menge ∪ Elternkette ∪ Relationspeers.
  // Der visited-Guard entspricht dem gemeinsamen visitedTickets der Rekursion
  // (Eltern- und Relationskanten teilen sich denselben Besuchsschutz). Pro Root
  // ein frischer visited-Set, exakt wie der frische Top-Level-Aufruf der Rekursion.
  const resolveFull = (ticketId: number, visited: Set<number>): ProjectContext => {
    if (visited.has(ticketId)) {
      return new Set<number>();
    }
    visited.add(ticketId);

    const ctx = new Set<number>(ensureOwn(ticketId));
    const parentId = parentById.get(ticketId);
    if (parentId !== null && parentId !== undefined) {
      mergeProjectContext(ctx, resolveFull(parentId, visited));
    }
    for (const peerId of relationPeers.get(ticketId) ?? []) {
      mergeProjectContext(ctx, resolveFull(peerId, visited));
    }
    return ctx;
  };

  for (const id of rootIds) {
    result.set(id, resolveFull(id, new Set<number>()));
  }

  return result;
}

export function projectContextsAreCompatible(ownerContext: ProjectContext, targetContext: ProjectContext): boolean {
  if (ownerContext.size === 0) {
    return targetContext.size === 0;
  }

  if (targetContext.size === 0) {
    return true;
  }

  for (const projectId of ownerContext) {
    if (targetContext.has(projectId)) {
      return true;
    }
  }
  return false;
}

export function assertCompatibleProjectContexts(ownerContext: ProjectContext, targetContext: ProjectContext): void {
  if (!projectContextsAreCompatible(ownerContext, targetContext)) {
    throw badRequest("Projektfremde Aufgaben- und Ticket-Verknüpfungen sind nicht erlaubt");
  }
}
