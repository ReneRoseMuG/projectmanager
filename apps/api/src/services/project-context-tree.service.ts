import type { MoveOwner, ProjectContextTreeNode } from "@taskmanager/shared-types";
import { eq, inArray } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { firstRow } from "../db/query-utils.js";
import {
  milestoneNotes,
  milestoneTasks,
  milestoneTickets,
  milestones,
  notes,
  projectNotes,
  projects,
  projectTasks,
  projectTickets,
  taskNotes,
  taskTickets,
  tasks,
  ticketNotes,
  tickets
} from "../db/schema.js";
import { badRequest, notFound } from "../utils/errors.js";
import { taskProjectContext, ticketProjectContext } from "./project-context.service.js";

// ---------------------------------------------------------------------------
// Gebündelter Baumaufbau
//
// Früher wurde der Kontextbaum rekursiv aufgebaut: pro Baumknoten (Task,
// Subtask, Ticket, Subticket) eigene Queries für Kinder + Notizen, verschachtelt
// in Promise.all. Bei tausenden Knoten ergab das linear viele Einzelqueries und
// eine unbegrenzte Query-Flut, die den entfernten MySQL-Pool (connectionLimit 10)
// sprengt. Ein zwischenzeitlicher Concurrency-Deckel (Chunk-Größe 5) war nur ein
// Sofortschutz.
//
// Diese Fassung lädt ALLE für das Projekt erreichbaren Tasks, Tickets und Notizen
// in WENIGEN gebündelten inArray-Queries und baut die parent→children-Struktur
// danach rein in-memory aus flachen Listen zusammen. Es gibt keine Query pro
// Knoten mehr; die Query-Anzahl hängt nur noch von der Baum-TIEFE (BFS-Ebenen)
// ab, nicht mehr von der Knotenzahl.
// ---------------------------------------------------------------------------

function byLabelAndType(a: ProjectContextTreeNode, b: ProjectContextTreeNode): number {
  const typeOrder: Record<ProjectContextTreeNode["type"], number> = {
    project: 0,
    milestone: 1,
    task: 2,
    ticket: 3,
    note: 4
  };
  return typeOrder[a.type] - typeOrder[b.type] || a.label.localeCompare(b.label, "de-DE") || a.id - b.id;
}

function sorted(nodes: ProjectContextTreeNode[]): ProjectContextTreeNode[] {
  return nodes.sort(byLabelAndType);
}

function noteNode(row: { id: number; label: string }): ProjectContextTreeNode {
  return { type: "note", id: row.id, label: row.label, children: [] };
}

// Rohdaten-Container: alle flach vorgeladenen Kanten und Titel eines Projekts.
interface ProjectTreeData {
  taskTitles: Map<number, string>;
  ticketTitles: Map<number, string>;
  // Hierarchie über parentId: Elternknoten → direkte Kinder-IDs.
  taskChildren: Map<number, number[]>;
  ticketChildren: Map<number, number[]>;
  // Über taskTickets verknüpfte Tickets je Aufgabe (nur solche mit parentId===null
  // werden im Baum als Kinder geführt – exakt wie im rekursiven Original).
  taskLinkedTickets: Map<number, number[]>;
  // Notizen je Trägerknoten (bereits als fertige, unsortierte Note-Nodes).
  taskNotesById: Map<number, ProjectContextTreeNode[]>;
  ticketNotesById: Map<number, ProjectContextTreeNode[]>;
  milestoneNotesById: Map<number, ProjectContextTreeNode[]>;
  projectNotesList: ProjectContextTreeNode[];
  // Root-Einstiegspunkte je Träger.
  milestoneRootTasks: Map<number, number[]>;
  milestoneRootTickets: Map<number, number[]>;
  projectRootTasks: number[];
  projectRootTickets: number[];
}

function pushInto(map: Map<number, number[]>, key: number, value: number): void {
  const list = map.get(key);
  if (list) {
    list.push(value);
  } else {
    map.set(key, [value]);
  }
}

function pushNote(map: Map<number, ProjectContextTreeNode[]>, key: number, node: ProjectContextTreeNode): void {
  const list = map.get(key);
  if (list) {
    list.push(node);
  } else {
    map.set(key, [node]);
  }
}

/**
 * Lädt alle für den Kontextbaum eines Projekts erreichbaren Tasks, Tickets und
 * Notizen in gebündelten inArray-Queries.
 *
 * Erreichbarkeit entspricht exakt dem rekursiven Original:
 *  - Root-Tasks/-Tickets aus projectTasks/projectTickets und
 *    milestoneTasks/milestoneTickets (jeweils nur parentId === null).
 *  - Kind-Tasks über tasks.parentId, Kind-Tickets über tickets.parentId
 *    (GLOBAL über parentId geladen, NICHT projektgefiltert – genau wie im
 *    Original, wo taskNode/ticketNode die Kinder allein über parentId zogen).
 *  - Über taskTickets verknüpfte Tickets einer Aufgabe (nur parentId === null),
 *    deren Subticket-Bäume wiederum über tickets.parentId.
 *
 * Die Kinder werden schichtweise per BFS aufgelöst: pro Ebene EINE Query für
 * Kind-Tasks, EINE für Kind-Tickets. Damit ist die Query-Anzahl an die Baumtiefe
 * gekoppelt, nicht an die Knotenzahl.
 */
async function loadProjectTreeData(database: DbClient, projectId: number, milestoneIds: number[]): Promise<ProjectTreeData> {
  const taskTitles = new Map<number, string>();
  const ticketTitles = new Map<number, string>();
  const taskChildren = new Map<number, number[]>();
  const ticketChildren = new Map<number, number[]>();
  const taskLinkedTickets = new Map<number, number[]>();

  // --- Root-Tasks / Root-Tickets der Träger (Projekt + Meilensteine) ---------
  const [projectTaskRows, projectTicketRows, milestoneTaskRows, milestoneTicketRows] = await Promise.all([
    database
      .select({ id: tasks.id, title: tasks.title, parentId: tasks.parentId })
      .from(projectTasks)
      .innerJoin(tasks, eq(projectTasks.taskId, tasks.id))
      .where(eq(projectTasks.ownerId, projectId)),
    database
      .select({ id: tickets.id, title: tickets.title, parentId: tickets.parentId })
      .from(projectTickets)
      .innerJoin(tickets, eq(projectTickets.ticketId, tickets.id))
      .where(eq(projectTickets.ownerId, projectId)),
    milestoneIds.length > 0
      ? database
          .select({ ownerId: milestoneTasks.ownerId, id: tasks.id, title: tasks.title, parentId: tasks.parentId })
          .from(milestoneTasks)
          .innerJoin(tasks, eq(milestoneTasks.taskId, tasks.id))
          .where(inArray(milestoneTasks.ownerId, milestoneIds))
      : Promise.resolve([] as { ownerId: number; id: number; title: string; parentId: number | null }[]),
    milestoneIds.length > 0
      ? database
          .select({ ownerId: milestoneTickets.ownerId, id: tickets.id, title: tickets.title, parentId: tickets.parentId })
          .from(milestoneTickets)
          .innerJoin(tickets, eq(milestoneTickets.ticketId, tickets.id))
          .where(inArray(milestoneTickets.ownerId, milestoneIds))
      : Promise.resolve([] as { ownerId: number; id: number; title: string; parentId: number | null }[])
  ]);

  const projectRootTasks: number[] = [];
  const projectRootTickets: number[] = [];
  const milestoneRootTasks = new Map<number, number[]>();
  const milestoneRootTickets = new Map<number, number[]>();

  for (const row of projectTaskRows) {
    taskTitles.set(row.id, row.title);
    if (row.parentId === null) {
      projectRootTasks.push(row.id);
    }
  }
  for (const row of projectTicketRows) {
    ticketTitles.set(row.id, row.title);
    if (row.parentId === null) {
      projectRootTickets.push(row.id);
    }
  }
  for (const row of milestoneTaskRows) {
    taskTitles.set(row.id, row.title);
    if (row.parentId === null) {
      pushInto(milestoneRootTasks, row.ownerId, row.id);
    }
  }
  for (const row of milestoneTicketRows) {
    ticketTitles.set(row.id, row.title);
    if (row.parentId === null) {
      pushInto(milestoneRootTickets, row.ownerId, row.id);
    }
  }

  // --- Ticket-Baum per BFS über tickets.parentId schließen -------------------
  // Startmenge: alle bisher bekannten Tickets (Root-Tickets der Träger). In jeder
  // Runde werden die direkten Kind-Tickets der neu hinzugekommenen IDs geladen.
  const knownTickets = new Set<number>(ticketTitles.keys());
  let ticketFrontier = [...knownTickets];
  while (ticketFrontier.length > 0) {
    const childRows = await database
      .select({ id: tickets.id, title: tickets.title, parentId: tickets.parentId })
      .from(tickets)
      .where(inArray(tickets.parentId, ticketFrontier));
    const nextFrontier: number[] = [];
    for (const row of childRows) {
      if (!knownTickets.has(row.id)) {
        knownTickets.add(row.id);
        ticketTitles.set(row.id, row.title);
        nextFrontier.push(row.id);
      }
      if (row.parentId !== null) {
        pushInto(ticketChildren, row.parentId, row.id);
      }
    }
    ticketFrontier = nextFrontier;
  }

  // --- Task-Baum per BFS über tasks.parentId schließen -----------------------
  // Anders als Tickets können Tasks über verknüpfte Tickets KEINE weiteren Tasks
  // erreichen (der Baum kennt keine Ticket→Task-Kante nach unten). Deshalb
  // genügt reines parentId-Schließen. Neue Root-Tickets, die über taskTickets an
  // erreichbaren Tasks hängen, werden anschließend separat aufgelöst.
  const knownTasks = new Set<number>(taskTitles.keys());
  let taskFrontier = [...knownTasks];
  while (taskFrontier.length > 0) {
    const childRows = await database
      .select({ id: tasks.id, title: tasks.title, parentId: tasks.parentId })
      .from(tasks)
      .where(inArray(tasks.parentId, taskFrontier));
    const nextFrontier: number[] = [];
    for (const row of childRows) {
      if (!knownTasks.has(row.id)) {
        knownTasks.add(row.id);
        taskTitles.set(row.id, row.title);
        nextFrontier.push(row.id);
      }
      if (row.parentId !== null) {
        pushInto(taskChildren, row.parentId, row.id);
      }
    }
    taskFrontier = nextFrontier;
  }

  // --- Über taskTickets verknüpfte (Root-)Tickets aller erreichbaren Tasks ----
  // Nur Tickets mit parentId === null werden im Baum als Task-Kinder geführt
  // (Original: linkedTickets.filter((t) => t.parentId === null)). Deren Subticket-
  // Bäume müssen ggf. neu geschlossen werden, falls sie oben noch unbekannt waren.
  const allTaskIds = [...knownTasks];
  if (allTaskIds.length > 0) {
    const linkRows = await database
      .select({ ownerId: taskTickets.ownerId, id: tickets.id, title: tickets.title, parentId: tickets.parentId })
      .from(taskTickets)
      .innerJoin(tickets, eq(taskTickets.ticketId, tickets.id))
      .where(inArray(taskTickets.ownerId, allTaskIds));

    const newlySeenRootTickets: number[] = [];
    for (const row of linkRows) {
      if (row.parentId === null) {
        pushInto(taskLinkedTickets, row.ownerId, row.id);
        if (!knownTickets.has(row.id)) {
          knownTickets.add(row.id);
          ticketTitles.set(row.id, row.title);
          newlySeenRootTickets.push(row.id);
        }
      }
    }

    // Subticket-Bäume neu erreichbarer verknüpfter Root-Tickets nachziehen.
    let linkedFrontier = newlySeenRootTickets;
    while (linkedFrontier.length > 0) {
      const childRows = await database
        .select({ id: tickets.id, title: tickets.title, parentId: tickets.parentId })
        .from(tickets)
        .where(inArray(tickets.parentId, linkedFrontier));
      const nextFrontier: number[] = [];
      for (const row of childRows) {
        if (!knownTickets.has(row.id)) {
          knownTickets.add(row.id);
          ticketTitles.set(row.id, row.title);
          nextFrontier.push(row.id);
        }
        if (row.parentId !== null) {
          pushInto(ticketChildren, row.parentId, row.id);
        }
      }
      linkedFrontier = nextFrontier;
    }
  }

  // --- Notizen aller Träger gebündelt laden ----------------------------------
  const allTicketIds = [...knownTickets];
  const [projectNoteRows, milestoneNoteRows, taskNoteRows, ticketNoteRows] = await Promise.all([
    database.select({ id: notes.id, label: notes.title }).from(projectNotes).innerJoin(notes, eq(projectNotes.noteId, notes.id)).where(eq(projectNotes.projectId, projectId)),
    milestoneIds.length > 0
      ? database
          .select({ ownerId: milestoneNotes.milestoneId, id: notes.id, label: notes.title })
          .from(milestoneNotes)
          .innerJoin(notes, eq(milestoneNotes.noteId, notes.id))
          .where(inArray(milestoneNotes.milestoneId, milestoneIds))
      : Promise.resolve([] as { ownerId: number; id: number; label: string }[]),
    allTaskIds.length > 0
      ? database
          .select({ ownerId: taskNotes.taskId, id: notes.id, label: notes.title })
          .from(taskNotes)
          .innerJoin(notes, eq(taskNotes.noteId, notes.id))
          .where(inArray(taskNotes.taskId, allTaskIds))
      : Promise.resolve([] as { ownerId: number; id: number; label: string }[]),
    allTicketIds.length > 0
      ? database
          .select({ ownerId: ticketNotes.ticketId, id: notes.id, label: notes.title })
          .from(ticketNotes)
          .innerJoin(notes, eq(ticketNotes.noteId, notes.id))
          .where(inArray(ticketNotes.ticketId, allTicketIds))
      : Promise.resolve([] as { ownerId: number; id: number; label: string }[])
  ]);

  const projectNotesList = projectNoteRows.map(noteNode);
  const milestoneNotesById = new Map<number, ProjectContextTreeNode[]>();
  const taskNotesById = new Map<number, ProjectContextTreeNode[]>();
  const ticketNotesById = new Map<number, ProjectContextTreeNode[]>();
  for (const row of milestoneNoteRows) {
    pushNote(milestoneNotesById, row.ownerId, noteNode(row));
  }
  for (const row of taskNoteRows) {
    pushNote(taskNotesById, row.ownerId, noteNode(row));
  }
  for (const row of ticketNoteRows) {
    pushNote(ticketNotesById, row.ownerId, noteNode(row));
  }

  return {
    taskTitles,
    ticketTitles,
    taskChildren,
    ticketChildren,
    taskLinkedTickets,
    taskNotesById,
    ticketNotesById,
    milestoneNotesById,
    projectNotesList,
    milestoneRootTasks,
    milestoneRootTickets,
    projectRootTasks,
    projectRootTickets
  };
}

// ---------------------------------------------------------------------------
// In-Memory-Baumaufbau mit DETERMINISTISCHER Dedup-Regel
//
// Ein Knoten, der über mehrere Pfade erreichbar ist (z. B. ein Ticket unter zwei
// Aufgaben, oder ein per parentId verketteter Task, der zusätzlich verlinkt ist),
// trägt seinen VOLLEN Teilbaum nur bei seinem ERSTEN Vorkommen; jedes weitere
// Vorkommen wird zum Blattknoten degradiert. Das entspricht funktional den
// visited-Sets des rekursiven Originals.
//
// Determinismus-Regel (löst die frühere microtask-/DB-Reihenfolge-Abhängigkeit
// ab): Die Traversierung ist eine Pre-Order-DFS in fester Phasenreihenfolge
//   1. Meilensteine (nach byLabelAndType), je Meilenstein: Root-Tasks → Root-
//      Tickets → Notizen,
//   2. Projekt-Root-Tasks,
//   3. Projekt-Root-Tickets,
//   4. Projekt-Notizen,
// und JEDE Kandidatenliste (Kind-Tasks, verknüpfte Root-Tickets, Kind-Tickets)
// wird VOR dem Abstieg per byLabelAndType sortiert durchlaufen. Der erste Besuch
// in genau dieser Ordnung bestimmt, welches Vorkommen den vollen Teilbaum trägt.
// Damit ist die Degradierung von "zufällig" auf "definiert stabil" gehoben.
//
// Der visited-Zustand ist ein gemeinsamer Lauf über den GESAMTEN Baum – exakt wie
// die durch alle Ebenen durchgereichten visitedTasks/visitedTickets im Original.
// ---------------------------------------------------------------------------

interface TreeBuilder {
  data: ProjectTreeData;
  visitedTasks: Set<number>;
  visitedTickets: Set<number>;
}

function buildTicketSubtree(builder: TreeBuilder, ticketId: number): ProjectContextTreeNode {
  const label = builder.data.ticketTitles.get(ticketId) ?? "";
  if (builder.visitedTickets.has(ticketId)) {
    return { type: "ticket", id: ticketId, label, children: [] };
  }
  builder.visitedTickets.add(ticketId);

  const childTicketNodes = (builder.data.ticketChildren.get(ticketId) ?? [])
    .map((childId) => ({ type: "ticket" as const, id: childId, label: builder.data.ticketTitles.get(childId) ?? "", children: [] }))
    .sort(byLabelAndType)
    .map((stub) => buildTicketSubtree(builder, stub.id));
  const noteNodes = builder.data.ticketNotesById.get(ticketId) ?? [];
  return { type: "ticket", id: ticketId, label, children: sorted([...childTicketNodes, ...noteNodes]) };
}

function buildTaskSubtree(builder: TreeBuilder, taskId: number): ProjectContextTreeNode {
  const label = builder.data.taskTitles.get(taskId) ?? "";
  if (builder.visitedTasks.has(taskId)) {
    return { type: "task", id: taskId, label, children: [] };
  }
  builder.visitedTasks.add(taskId);

  const childTaskNodes = (builder.data.taskChildren.get(taskId) ?? [])
    .map((childId) => ({ type: "task" as const, id: childId, label: builder.data.taskTitles.get(childId) ?? "", children: [] }))
    .sort(byLabelAndType)
    .map((stub) => buildTaskSubtree(builder, stub.id));
  const linkedTicketNodes = (builder.data.taskLinkedTickets.get(taskId) ?? [])
    .map((ticketId) => ({ type: "ticket" as const, id: ticketId, label: builder.data.ticketTitles.get(ticketId) ?? "", children: [] }))
    .sort(byLabelAndType)
    .map((stub) => buildTicketSubtree(builder, stub.id));
  const noteNodes = builder.data.taskNotesById.get(taskId) ?? [];
  return { type: "task", id: taskId, label, children: sorted([...childTaskNodes, ...linkedTicketNodes, ...noteNodes]) };
}

// Root-Task-/Root-Ticket-Listen VOR dem Abstieg deterministisch ordnen, damit der
// erste Besuch (und damit die Teilbaum-Vergabe) stabil ist.
function buildRootTaskNodes(builder: TreeBuilder, taskIds: number[]): ProjectContextTreeNode[] {
  return taskIds
    .map((id) => ({ type: "task" as const, id, label: builder.data.taskTitles.get(id) ?? "", children: [] }))
    .sort(byLabelAndType)
    .map((stub) => buildTaskSubtree(builder, stub.id));
}

function buildRootTicketNodes(builder: TreeBuilder, ticketIds: number[]): ProjectContextTreeNode[] {
  return ticketIds
    .map((id) => ({ type: "ticket" as const, id, label: builder.data.ticketTitles.get(id) ?? "", children: [] }))
    .sort(byLabelAndType)
    .map((stub) => buildTicketSubtree(builder, stub.id));
}

export async function getProjectContextTree(database: DbClient, projectId: number): Promise<ProjectContextTreeNode> {
  const project = firstRow(await database.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, projectId)));
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }

  const milestoneRows = await database.select({ id: milestones.id, name: milestones.name }).from(milestones).where(eq(milestones.projectId, projectId));
  const milestoneIds = milestoneRows.map((row) => row.id);

  const data = await loadProjectTreeData(database, projectId, milestoneIds);
  const builder: TreeBuilder = { data, visitedTasks: new Set<number>(), visitedTickets: new Set<number>() };

  // Deterministische Phasenreihenfolge: Meilensteine zuerst (nach byLabelAndType),
  // dann Projekt-Root-Tasks, Root-Tickets, Notizen. Die Reihenfolge der visited-
  // Vergabe ergibt sich exakt aus dieser Traversierung.
  const milestoneNodes = milestoneRows
    .map((row) => ({ type: "milestone" as const, id: row.id, name: row.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "de-DE") || a.id - b.id)
    .map((milestone) => {
      const children = [
        ...buildRootTaskNodes(builder, data.milestoneRootTasks.get(milestone.id) ?? []),
        ...buildRootTicketNodes(builder, data.milestoneRootTickets.get(milestone.id) ?? []),
        ...(data.milestoneNotesById.get(milestone.id) ?? [])
      ];
      return { type: "milestone" as const, id: milestone.id, label: milestone.name, children: sorted(children) };
    });

  const children = [
    ...milestoneNodes,
    ...buildRootTaskNodes(builder, data.projectRootTasks),
    ...buildRootTicketNodes(builder, data.projectRootTickets),
    ...data.projectNotesList
  ];

  return { type: "project", id: project.id, label: project.name, children: sorted(children) };
}

export async function resolveProjectIdForMoveOwner(database: DbClient, owner: MoveOwner): Promise<number> {
  if (owner.type === "project") {
    return owner.id;
  }
  if (owner.type === "milestone") {
    const milestone = firstRow(await database.select({ projectId: milestones.projectId }).from(milestones).where(eq(milestones.id, owner.id)));
    if (!milestone) {
      throw notFound(`Milestone with id ${owner.id} not found`);
    }
    return milestone.projectId;
  }

  const context = owner.type === "task" ? await taskProjectContext(database, owner.id) : await ticketProjectContext(database, owner.id);
  if (context.size === 0) {
    throw badRequest("Für diesen Kontext konnte kein Projektbaum bestimmt werden");
  }
  if (context.size > 1) {
    throw badRequest("Für diesen Kontext gibt es mehrere Projektbäume");
  }
  return [...context][0] as number;
}
