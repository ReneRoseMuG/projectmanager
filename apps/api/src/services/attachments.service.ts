import type { Attachment, AttachmentFolder, AttachmentOwner, JournalObjectType, RecentAttachment } from "@taskmanager/shared-types";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { config } from "../config.js";
import type { DbClient, DbSession } from "../db/client.js";
import { firstRow, mutationAffectedRows } from "../db/query-utils.js";
import {
  attachments,
  attachmentFolders,
  featureAttachments,
  features,
  milestoneAttachments,
  milestoneDocumentLinks,
  milestoneTasks,
  milestoneTickets,
  milestones,
  projectAttachments,
  projectDocumentLinks,
  projectTasks,
  projectTickets,
  projects,
  folderAttachments,
  taskAttachments,
  taskDocumentLinks,
  tasks,
  ticketAttachments,
  ticketDocumentLinks,
  tickets,
  users,
  wikiPageAttachments,
  wikiPageDocumentLinks,
  featureDocumentLinks,
  wikiPages
} from "../db/schema.js";
import { attachmentRepository, type AttachmentRecord } from "../repositories/attachment.repository.js";
import { assertVersion } from "../repositories/base.repository.js";
import { parentFileRepository } from "../repositories/parent-file.repository.js";
import { assertSafeTestDirectoryPath } from "../runtime-safety.js";
import { AppError, badRequest, conflict, internalError, notFound } from "../utils/errors.js";
import { removeAttachmentPreviews } from "./attachment-preview.service.js";
import { watchAttachmentForChanges } from "./attachment-watcher.service.js";
import type { FileOpener } from "./file-opener.service.js";
import {
  buildDeleteSummary,
  makeJournalContext,
  makeJournalObject,
  objectTypeLabel,
  recordJournalEntry,
  type JournalActor,
  type JournalObjectRef
} from "./journal.service.js";

type AttachmentCleanupRecord = Pick<AttachmentRecord, "id" | "filename">;

export interface AttachmentFile {
  diskPath: string;
  originalName: string;
  mimetype: string;
  size: number;
}

export interface AttachmentUpload {
  originalName: string;
  mimetype: string;
  buffer: Buffer;
}

export type OwnerAttachmentUpload = AttachmentUpload;

const attachmentSelect = {
  id: attachments.id,
  originalName: attachments.originalName,
  filename: attachments.filename,
  mimetype: attachments.mimetype,
  size: attachments.size,
  displayName: attachments.displayName,
  description: attachments.description,
  contentHash: attachments.contentHash,
  kind: attachments.kind,
  version: attachments.version,
  createdBy: attachments.createdBy,
  updatedBy: attachments.updatedBy,
  createdAt: attachments.createdAt,
  updatedAt: attachments.updatedAt
};

function buildAttachment(
  record: AttachmentRecord,
  owners: AttachmentOwner[],
  folders: AttachmentFolder[],
  parentFolderId: number | null = null
): Attachment {
  return {
    id: record.id,
    kind: record.kind,
    owners,
    originalName: record.originalName,
    filename: record.filename,
    mimetype: record.mimetype,
    size: record.size,
    displayName: record.displayName,
    description: record.description,
    url: record.kind === "document" ? `/api/documents/${record.id}/content` : `/api/attachments/${record.id}/content`,
    contentHash: record.contentHash,
    isInDocumentLibrary: record.kind === "document",
    folder: folders[0] ?? null,
    folders,
    parentFolderId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: record.version
  };
}

async function loadAttachmentFoldersForIds(
  database: DbClient,
  attachmentIds: number[]
): Promise<Map<number, AttachmentFolder[]>> {
  const result = new Map<number, AttachmentFolder[]>();
  if (attachmentIds.length === 0) {
    return result;
  }
  const rows = await database
    .select({
      attachmentId: folderAttachments.attachmentId,
      id: attachmentFolders.id,
      parentId: attachmentFolders.parentId,
      name: attachmentFolders.name,
      version: attachmentFolders.version
    })
    .from(folderAttachments)
    .innerJoin(attachmentFolders, eq(folderAttachments.folderId, attachmentFolders.id))
    .where(inArray(folderAttachments.attachmentId, attachmentIds))
    .orderBy(attachmentFolders.name);
  for (const row of rows) {
    const folder: AttachmentFolder = {
      id: row.id,
      parentId: row.parentId,
      name: row.name,
      childCount: 0,
      directDocumentCount: 0,
      version: row.version
    };
    const existing = result.get(row.attachmentId);
    if (existing) {
      existing.push(folder);
    } else {
      result.set(row.attachmentId, [folder]);
    }
  }
  return result;
}

async function mapAttachment(database: DbClient, record: AttachmentRecord): Promise<Attachment> {
  const [owners, foldersById] = await Promise.all([
    listAttachmentOwners(database, record.id),
    loadAttachmentFoldersForIds(database, [record.id])
  ]);
  return buildAttachment(record, owners, foldersById.get(record.id) ?? []);
}

async function ensureProjectExists(database: DbClient, projectId: number): Promise<void> {
  const project = firstRow(await database.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)));
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
}

async function ensureTaskExists(database: DbClient, taskId: number): Promise<void> {
  const task = firstRow(await database.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId)));
  if (!task) {
    throw notFound(`Task with id ${taskId} not found`);
  }
}

async function ensureMilestoneExists(database: DbClient, milestoneId: number): Promise<void> {
  const milestone = firstRow(await database.select({ id: milestones.id }).from(milestones).where(eq(milestones.id, milestoneId)));
  if (!milestone) {
    throw notFound(`Milestone with id ${milestoneId} not found`);
  }
}

async function ensureFeatureExists(database: DbClient, featureId: number): Promise<void> {
  const feature = firstRow(await database.select({ id: features.id }).from(features).where(eq(features.id, featureId)));
  if (!feature) {
    throw notFound(`Feature with id ${featureId} not found`);
  }
}

async function ensureTicketExists(database: DbClient, ticketId: number): Promise<void> {
  const ticket = firstRow(await database.select({ id: tickets.id }).from(tickets).where(eq(tickets.id, ticketId)));
  if (!ticket) {
    throw notFound(`Ticket with id ${ticketId} not found`);
  }
}

async function ensureWikiPageExists(database: DbClient, wikiPageId: number): Promise<void> {
  const page = firstRow(await database.select({ id: wikiPages.id }).from(wikiPages).where(eq(wikiPages.id, wikiPageId)));
  if (!page) {
    throw notFound(`Wiki page with id ${wikiPageId} not found`);
  }
}

export async function ensureAttachmentOwnerExists(database: DbClient, owner: AttachmentOwner): Promise<void> {
  if (owner.type === "project") {
    await ensureProjectExists(database, owner.id);
    return;
  }
  if (owner.type === "task") {
    await ensureTaskExists(database, owner.id);
    return;
  }
  if (owner.type === "milestone") {
    await ensureMilestoneExists(database, owner.id);
    return;
  }
  if (owner.type === "feature") {
    await ensureFeatureExists(database, owner.id);
    return;
  }
  if (owner.type === "wikiPage") {
    await ensureWikiPageExists(database, owner.id);
    return;
  }
  await ensureTicketExists(database, owner.id);
}

export async function getAttachmentOwnerJournalObject(database: DbClient, owner: AttachmentOwner): Promise<JournalObjectRef> {
  if (owner.type === "project") {
    const project = firstRow(await database.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, owner.id)));
    if (!project) {
      throw notFound(`Project with id ${owner.id} not found`);
    }
    return makeJournalObject("project", project.id, project.name);
  }
  if (owner.type === "task") {
    const task = firstRow(await database.select({ id: tasks.id, title: tasks.title }).from(tasks).where(eq(tasks.id, owner.id)));
    if (!task) {
      throw notFound(`Task with id ${owner.id} not found`);
    }
    return makeJournalObject("task", task.id, task.title);
  }
  if (owner.type === "milestone") {
    const milestone = firstRow(await database.select({ id: milestones.id, name: milestones.name }).from(milestones).where(eq(milestones.id, owner.id)));
    if (!milestone) {
      throw notFound(`Milestone with id ${owner.id} not found`);
    }
    return makeJournalObject("milestone", milestone.id, milestone.name);
  }
  if (owner.type === "feature") {
    const feature = firstRow(await database.select({ id: features.id, title: features.title }).from(features).where(eq(features.id, owner.id)));
    if (!feature) {
      throw notFound(`Feature with id ${owner.id} not found`);
    }
    return makeJournalObject("feature", feature.id, feature.title);
  }
  if (owner.type === "wikiPage") {
    const page = firstRow(await database.select({ id: wikiPages.id, title: wikiPages.title }).from(wikiPages).where(eq(wikiPages.id, owner.id)));
    if (!page) {
      throw notFound(`Wiki page with id ${owner.id} not found`);
    }
    return makeJournalObject("wikiPage", page.id, page.title);
  }
  const ticket = firstRow(await database.select({ id: tickets.id, title: tickets.title }).from(tickets).where(eq(tickets.id, owner.id)));
  if (!ticket) {
    throw notFound(`Ticket with id ${owner.id} not found`);
  }
  return makeJournalObject("ticket", ticket.id, ticket.title);
}

// Tolerante Variante für den Löschpfad: Ist das verknüpfte Fachobjekt bereits gelöscht
// (verwaister Owner-Link), liefert diese Funktion null statt einen NOT_FOUND zu werfen.
// getOwnerJournalObject bleibt für Erstell-/Link-Pfade bewusst streng.
async function resolveOwnerJournalObjectOrNull(database: DbClient, owner: AttachmentOwner): Promise<JournalObjectRef | null> {
  try {
    return await getAttachmentOwnerJournalObject(database, owner);
  } catch (error) {
    if (error instanceof AppError && error.error === "NOT_FOUND") {
      return null;
    }
    throw error;
  }
}

function attachmentJournalObject(record: Pick<AttachmentRecord, "id" | "originalName">): JournalObjectRef {
  return makeJournalObject("attachment", record.id, record.originalName);
}

function buildAttachmentCreateSummary(attachment: JournalObjectRef, owner: JournalObjectRef): string {
  return `${objectTypeLabel(attachment.type)} "${attachment.label}" wurde zu ${objectTypeLabel(owner.type)} "${owner.label}" hinzugefügt.`;
}

function makeFilename(originalName: string): string {
  const extension = path.extname(originalName);
  return `${randomUUID()}${extension}`;
}

function isSameOrInside(targetPath: string, rootPath: string): boolean {
  const relative = path.relative(path.resolve(rootPath), path.resolve(targetPath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function attachmentDiskPath(record: AttachmentRecord): string {
  const diskPath = path.resolve(config.uploadDir, record.filename);
  if (!isSameOrInside(diskPath, config.uploadDir)) {
    throw badRequest("Attachment filename points outside the upload directory");
  }
  return diskPath;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listAttachmentOwners(database: DbClient, attachmentId: number): Promise<AttachmentOwner[]> {
  const projectRows = await database.select({ id: projectAttachments.projectId }).from(projectAttachments).where(eq(projectAttachments.attachmentId, attachmentId));
  const taskRows = await database.select({ id: taskAttachments.taskId }).from(taskAttachments).where(eq(taskAttachments.attachmentId, attachmentId));
  const milestoneRows = await database.select({ id: milestoneAttachments.milestoneId }).from(milestoneAttachments).where(eq(milestoneAttachments.attachmentId, attachmentId));
  const featureRows = await database.select({ id: featureAttachments.featureId }).from(featureAttachments).where(eq(featureAttachments.attachmentId, attachmentId));
  const wikiPageRows = await database.select({ id: wikiPageAttachments.wikiPageId }).from(wikiPageAttachments).where(eq(wikiPageAttachments.attachmentId, attachmentId));
  const ticketRows = await database.select({ id: ticketAttachments.ticketId }).from(ticketAttachments).where(eq(ticketAttachments.attachmentId, attachmentId));
  const projectDocumentRows = await database.select({ id: projectDocumentLinks.ownerId }).from(projectDocumentLinks).where(eq(projectDocumentLinks.documentId, attachmentId));
  const taskDocumentRows = await database.select({ id: taskDocumentLinks.ownerId }).from(taskDocumentLinks).where(eq(taskDocumentLinks.documentId, attachmentId));
  const milestoneDocumentRows = await database.select({ id: milestoneDocumentLinks.ownerId }).from(milestoneDocumentLinks).where(eq(milestoneDocumentLinks.documentId, attachmentId));
  const featureDocumentRows = await database.select({ id: featureDocumentLinks.ownerId }).from(featureDocumentLinks).where(eq(featureDocumentLinks.documentId, attachmentId));
  const wikiPageDocumentRows = await database.select({ id: wikiPageDocumentLinks.ownerId }).from(wikiPageDocumentLinks).where(eq(wikiPageDocumentLinks.documentId, attachmentId));
  const ticketDocumentRows = await database.select({ id: ticketDocumentLinks.ownerId }).from(ticketDocumentLinks).where(eq(ticketDocumentLinks.documentId, attachmentId));
  const owners: AttachmentOwner[] = [
    ...projectRows.map((row) => ({ type: "project" as const, id: row.id })),
    ...taskRows.map((row) => ({ type: "task" as const, id: row.id })),
    ...milestoneRows.map((row) => ({ type: "milestone" as const, id: row.id })),
    ...featureRows.map((row) => ({ type: "feature" as const, id: row.id })),
    ...wikiPageRows.map((row) => ({ type: "wikiPage" as const, id: row.id })),
    ...ticketRows.map((row) => ({ type: "ticket" as const, id: row.id })),
    ...projectDocumentRows.map((row) => ({ type: "project" as const, id: row.id })),
    ...taskDocumentRows.map((row) => ({ type: "task" as const, id: row.id })),
    ...milestoneDocumentRows.map((row) => ({ type: "milestone" as const, id: row.id })),
    ...featureDocumentRows.map((row) => ({ type: "feature" as const, id: row.id })),
    ...wikiPageDocumentRows.map((row) => ({ type: "wikiPage" as const, id: row.id })),
    ...ticketDocumentRows.map((row) => ({ type: "ticket" as const, id: row.id }))
  ];
  return owners.filter((owner, index) => owners.findIndex((candidate) => candidate.type === owner.type && candidate.id === owner.id) === index);
}

// Batch-Variante von listAttachmentOwners: lädt die Owner ALLER übergebenen Anhänge in
// 6 gebündelten Queries (statt 6 sequenziellen Queries pro Anhang) und ordnet sie im
// Speicher zu. Für Listen-Pfade wie die Dokumentenbibliothek (MS-75), damit die Query-Zahl
// unabhängig von der Anzahl der Dokumente konstant bleibt. Owner-Reihenfolge je Anhang
// identisch zu listAttachmentOwners (project, task, milestone, feature, wikiPage, ticket).
export async function listAttachmentOwnersForIds(
  database: DbClient,
  attachmentIds: number[]
): Promise<Map<number, AttachmentOwner[]>> {
  const result = new Map<number, AttachmentOwner[]>();
  if (attachmentIds.length === 0) {
    return result;
  }
  const push = (attachmentId: number, owner: AttachmentOwner): void => {
    const existing = result.get(attachmentId);
    if (existing) {
      existing.push(owner);
    } else {
      result.set(attachmentId, [owner]);
    }
  };
  // Bewusst seriell: Ein Bibliotheksaufruf darf nicht sechs Pool-Verbindungen gleichzeitig
  // belegen. Die Query-Zahl bleibt konstant, während die zentrale DB unter parallelen
  // Benutzeranfragen genügend Verbindungen für andere Requests behält.
  const projectRows = await database.select({ attachmentId: projectAttachments.attachmentId, id: projectAttachments.projectId }).from(projectAttachments).where(inArray(projectAttachments.attachmentId, attachmentIds));
  const taskRows = await database.select({ attachmentId: taskAttachments.attachmentId, id: taskAttachments.taskId }).from(taskAttachments).where(inArray(taskAttachments.attachmentId, attachmentIds));
  const milestoneRows = await database.select({ attachmentId: milestoneAttachments.attachmentId, id: milestoneAttachments.milestoneId }).from(milestoneAttachments).where(inArray(milestoneAttachments.attachmentId, attachmentIds));
  const featureRows = await database.select({ attachmentId: featureAttachments.attachmentId, id: featureAttachments.featureId }).from(featureAttachments).where(inArray(featureAttachments.attachmentId, attachmentIds));
  const wikiPageRows = await database.select({ attachmentId: wikiPageAttachments.attachmentId, id: wikiPageAttachments.wikiPageId }).from(wikiPageAttachments).where(inArray(wikiPageAttachments.attachmentId, attachmentIds));
  const ticketRows = await database.select({ attachmentId: ticketAttachments.attachmentId, id: ticketAttachments.ticketId }).from(ticketAttachments).where(inArray(ticketAttachments.attachmentId, attachmentIds));
  const projectDocumentRows = await database.select({ attachmentId: projectDocumentLinks.documentId, id: projectDocumentLinks.ownerId }).from(projectDocumentLinks).where(inArray(projectDocumentLinks.documentId, attachmentIds));
  const taskDocumentRows = await database.select({ attachmentId: taskDocumentLinks.documentId, id: taskDocumentLinks.ownerId }).from(taskDocumentLinks).where(inArray(taskDocumentLinks.documentId, attachmentIds));
  const milestoneDocumentRows = await database.select({ attachmentId: milestoneDocumentLinks.documentId, id: milestoneDocumentLinks.ownerId }).from(milestoneDocumentLinks).where(inArray(milestoneDocumentLinks.documentId, attachmentIds));
  const featureDocumentRows = await database.select({ attachmentId: featureDocumentLinks.documentId, id: featureDocumentLinks.ownerId }).from(featureDocumentLinks).where(inArray(featureDocumentLinks.documentId, attachmentIds));
  const wikiPageDocumentRows = await database.select({ attachmentId: wikiPageDocumentLinks.documentId, id: wikiPageDocumentLinks.ownerId }).from(wikiPageDocumentLinks).where(inArray(wikiPageDocumentLinks.documentId, attachmentIds));
  const ticketDocumentRows = await database.select({ attachmentId: ticketDocumentLinks.documentId, id: ticketDocumentLinks.ownerId }).from(ticketDocumentLinks).where(inArray(ticketDocumentLinks.documentId, attachmentIds));
  for (const row of projectRows) push(row.attachmentId, { type: "project", id: row.id });
  for (const row of taskRows) push(row.attachmentId, { type: "task", id: row.id });
  for (const row of milestoneRows) push(row.attachmentId, { type: "milestone", id: row.id });
  for (const row of featureRows) push(row.attachmentId, { type: "feature", id: row.id });
  for (const row of wikiPageRows) push(row.attachmentId, { type: "wikiPage", id: row.id });
  for (const row of ticketRows) push(row.attachmentId, { type: "ticket", id: row.id });
  for (const row of projectDocumentRows) push(row.attachmentId, { type: "project", id: row.id });
  for (const row of taskDocumentRows) push(row.attachmentId, { type: "task", id: row.id });
  for (const row of milestoneDocumentRows) push(row.attachmentId, { type: "milestone", id: row.id });
  for (const row of featureDocumentRows) push(row.attachmentId, { type: "feature", id: row.id });
  for (const row of wikiPageDocumentRows) push(row.attachmentId, { type: "wikiPage", id: row.id });
  for (const row of ticketDocumentRows) push(row.attachmentId, { type: "ticket", id: row.id });
  for (const [attachmentId, owners] of result) {
    result.set(attachmentId, owners.filter((owner, index) => owners.findIndex((candidate) => candidate.type === owner.type && candidate.id === owner.id) === index));
  }
  return result;
}

async function insertAttachmentLink(database: DbSession, owner: AttachmentOwner, attachmentId: number): Promise<void> {
  if (owner.type === "project") {
    await database.insert(projectAttachments).ignore().values({ projectId: owner.id, attachmentId });
    return;
  }
  if (owner.type === "task") {
    await database.insert(taskAttachments).ignore().values({ taskId: owner.id, attachmentId });
    return;
  }
  if (owner.type === "milestone") {
    await database.insert(milestoneAttachments).ignore().values({ milestoneId: owner.id, attachmentId });
    return;
  }
  if (owner.type === "feature") {
    await database.insert(featureAttachments).ignore().values({ featureId: owner.id, attachmentId });
    return;
  }
  if (owner.type === "wikiPage") {
    await database.insert(wikiPageAttachments).ignore().values({ wikiPageId: owner.id, attachmentId });
    return;
  }
  await database.insert(ticketAttachments).ignore().values({ ticketId: owner.id, attachmentId });
}

async function removeAttachmentFiles(records: AttachmentCleanupRecord[]): Promise<void> {
  assertSafeTestDirectoryPath(config.uploadDir, "UPLOAD_DIR");

  for (const record of records) {
    const diskPath = path.join(config.uploadDir, record.filename);
    await fs.rm(diskPath, { force: true });
    await removeAttachmentPreviews(record.id);
  }
}

// MS-75 (DMS): Der frühere Owner-basierte Auto-Cleanup von Anhängen entfällt. Beim
// Löschen eines Fachobjekts entfernt die FK-Cascade der Junction-Tabellen nur die
// Verknüpfung; das Dokument selbst bleibt bestehen und wird im DMS als "Nicht
// einsortiert" geführt, solange es keiner Sammlung zugeordnet ist (eine reine
// Fachobjekt-Bindung zählt nicht als einsortiert). Endgültiges Löschen erfolgt nur
// noch explizit über deleteAttachment.

async function persistAttachment(values: {
  database: DbClient;
  owner: AttachmentOwner;
  upload: OwnerAttachmentUpload;
  actor?: JournalActor | null;
}): Promise<Attachment> {
  assertSafeTestDirectoryPath(config.uploadDir, "UPLOAD_DIR");
  await fs.mkdir(config.uploadDir, { recursive: true });

  const filename = makeFilename(values.upload.originalName);
  const diskPath = path.join(config.uploadDir, filename);
  await fs.writeFile(diskPath, values.upload.buffer);

  const created = await values.database.transaction(async (tx) => {
    const attachment = await attachmentRepository.create(tx, {
      originalName: values.upload.originalName,
      filename,
      mimetype: values.upload.mimetype,
      size: values.upload.buffer.byteLength,
      contentHash: createHash("sha256").update(values.upload.buffer).digest("hex"),
      kind: "parent_attachment"
    }, values.actor?.actorUserId ?? undefined);
    await insertAttachmentLink(tx, values.owner, attachment.id);
    const attachmentObject = attachmentJournalObject(attachment);
    const ownerObject = await getAttachmentOwnerJournalObject(values.database, values.owner);
    await recordJournalEntry(tx, {
      operation: "create",
      object: attachmentObject,
      summary: buildAttachmentCreateSummary(attachmentObject, ownerObject),
      actor: values.actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
    return attachment;
  });

  return mapAttachment(values.database, created);
}

// MS-75 (DMS): Direktupload in die Dokumentenbibliothek ohne Bindung an ein Fachobjekt.
// Das Dokument existiert danach über seine DMS-Zugehörigkeit (Sammlung) bzw. wird unter
// "Nicht einsortiert" geführt.
export async function createUnboundAttachment(database: DbClient, upload: AttachmentUpload, actor?: JournalActor | null): Promise<Attachment> {
  assertSafeTestDirectoryPath(config.uploadDir, "UPLOAD_DIR");
  await fs.mkdir(config.uploadDir, { recursive: true });

  const filename = makeFilename(upload.originalName);
  const diskPath = path.join(config.uploadDir, filename);
  await fs.writeFile(diskPath, upload.buffer);

  const created = await database.transaction(async (tx) => {
    const attachment = await attachmentRepository.create(
      tx,
      {
        originalName: upload.originalName,
        filename,
        mimetype: upload.mimetype,
        size: upload.buffer.byteLength,
        contentHash: createHash("sha256").update(upload.buffer).digest("hex"),
        kind: "document"
      },
      actor?.actorUserId ?? undefined
    );
    const journalObject = attachmentJournalObject(attachment);
    await recordJournalEntry(tx, {
      operation: "create",
      object: journalObject,
      summary: `${journalObject.label} wurde in die Dokumentenbibliothek importiert.`,
      actor
    });
    return attachment;
  });
  return mapAttachment(database, created);
}

async function selectOwnerAttachments(
  database: DbClient,
  owner: AttachmentOwner,
  attachmentIds?: number[]
): Promise<AttachmentRecord[]> {
  if (attachmentIds && attachmentIds.length === 0) {
    return [];
  }
  const idsCondition = attachmentIds ? inArray(attachments.id, attachmentIds) : undefined;
  if (owner.type === "project") {
    return database
      .select(attachmentSelect)
      .from(projectAttachments)
      .innerJoin(attachments, eq(projectAttachments.attachmentId, attachments.id))
      .where(and(eq(projectAttachments.projectId, owner.id), eq(attachments.kind, "parent_attachment"), idsCondition))
      .orderBy(desc(attachments.createdAt))
      ;
  }
  if (owner.type === "task") {
    return database
      .select(attachmentSelect)
      .from(taskAttachments)
      .innerJoin(attachments, eq(taskAttachments.attachmentId, attachments.id))
      .where(and(eq(taskAttachments.taskId, owner.id), eq(attachments.kind, "parent_attachment"), idsCondition))
      .orderBy(desc(attachments.createdAt))
      ;
  }
  if (owner.type === "milestone") {
    return database
      .select(attachmentSelect)
      .from(milestoneAttachments)
      .innerJoin(attachments, eq(milestoneAttachments.attachmentId, attachments.id))
      .where(and(eq(milestoneAttachments.milestoneId, owner.id), eq(attachments.kind, "parent_attachment"), idsCondition))
      .orderBy(desc(attachments.createdAt))
      ;
  }
  if (owner.type === "feature") {
    return database
      .select(attachmentSelect)
      .from(featureAttachments)
      .innerJoin(attachments, eq(featureAttachments.attachmentId, attachments.id))
      .where(and(eq(featureAttachments.featureId, owner.id), eq(attachments.kind, "parent_attachment"), idsCondition))
      .orderBy(desc(attachments.createdAt))
      ;
  }
  if (owner.type === "wikiPage") {
    return database
      .select(attachmentSelect)
      .from(wikiPageAttachments)
      .innerJoin(attachments, eq(wikiPageAttachments.attachmentId, attachments.id))
      .where(and(eq(wikiPageAttachments.wikiPageId, owner.id), eq(attachments.kind, "parent_attachment"), idsCondition))
      .orderBy(desc(attachments.createdAt))
      ;
  }
  return database
    .select(attachmentSelect)
    .from(ticketAttachments)
    .innerJoin(attachments, eq(ticketAttachments.attachmentId, attachments.id))
    .where(and(eq(ticketAttachments.ticketId, owner.id), eq(attachments.kind, "parent_attachment"), idsCondition))
    .orderBy(desc(attachments.createdAt))
    ;
}

type RecentAttachmentOwner = { type: "project" | "milestone" | "task"; id: number };

interface RecentAttachmentRow {
  id: number;
  filename: string;
  storageFilename: string;
  mimetype: string;
  fileSize: number;
  createdAt: string;
  authorFullName: string | null;
  authorEmail: string | null;
  entityType: JournalObjectType;
  entityId: number;
  entityLabel: string;
}

function attachmentAuthorName(row: Pick<RecentAttachmentRow, "authorFullName" | "authorEmail">): string {
  const name = row.authorFullName?.trim();
  return name || row.authorEmail || "System";
}

async function collectAttachmentTaskDescendantIds(database: DbClient, rootIds: number[]): Promise<number[]> {
  const result = new Set(rootIds);
  let frontier = [...new Set(rootIds)];
  while (frontier.length > 0) {
    const rows = await database.select({ id: tasks.id }).from(tasks).where(inArray(tasks.parentId, frontier));
    frontier = rows.map((row) => row.id).filter((id) => !result.has(id));
    for (const id of frontier) {
      result.add(id);
    }
  }
  return [...result];
}

async function attachmentProjectMilestoneIds(database: DbClient, projectId: number): Promise<number[]> {
  return (await database.select({ id: milestones.id }).from(milestones).where(eq(milestones.projectId, projectId))).map((row) => row.id);
}

async function attachmentTaskIdsForOwner(database: DbClient, owner: RecentAttachmentOwner): Promise<number[]> {
  if (owner.type === "task") {
    return [owner.id];
  }
  const directRows =
    owner.type === "project"
      ? await database.select({ id: projectTasks.taskId }).from(projectTasks).where(eq(projectTasks.ownerId, owner.id))
      : await database.select({ id: milestoneTasks.taskId }).from(milestoneTasks).where(eq(milestoneTasks.ownerId, owner.id));
  const direct = directRows.map((row) => row.id);
  if (owner.type === "project") {
    const milestoneIds = await attachmentProjectMilestoneIds(database, owner.id);
    const milestoneLinked =
      milestoneIds.length === 0
        ? []
        : (await database.select({ id: milestoneTasks.taskId }).from(milestoneTasks).where(inArray(milestoneTasks.ownerId, milestoneIds))).map((row) => row.id);
    return collectAttachmentTaskDescendantIds(database, [...direct, ...milestoneLinked]);
  }
  return collectAttachmentTaskDescendantIds(database, direct);
}

async function attachmentTicketIdsForOwner(database: DbClient, owner: RecentAttachmentOwner): Promise<number[]> {
  if (owner.type === "task") {
    return [];
  }
  const directRows =
    owner.type === "project"
      ? await database.select({ id: projectTickets.ticketId }).from(projectTickets).where(eq(projectTickets.ownerId, owner.id))
      : await database.select({ id: milestoneTickets.ticketId }).from(milestoneTickets).where(eq(milestoneTickets.ownerId, owner.id));
  const direct = directRows.map((row) => row.id);
  if (owner.type === "project") {
    const milestoneIds = await attachmentProjectMilestoneIds(database, owner.id);
    const milestoneLinked =
      milestoneIds.length === 0
        ? []
        : (await database.select({ id: milestoneTickets.ticketId }).from(milestoneTickets).where(inArray(milestoneTickets.ownerId, milestoneIds))).map((row) => row.id);
    return [...new Set([...direct, ...milestoneLinked])];
  }
  return [...new Set(direct)];
}

function mapRecentAttachmentRow(row: Omit<RecentAttachmentRow, "entityType">, entityType: JournalObjectType): RecentAttachmentRow {
  return { ...row, entityType };
}

async function recentProjectAttachmentRows(database: DbClient, ids: number[], mineUserId?: number): Promise<RecentAttachmentRow[]> {
  if (ids.length === 0) {
    return [];
  }
  const rows = await database
    .select({
      id: attachments.id,
      filename: attachments.originalName,
      storageFilename: attachments.filename,
      mimetype: attachments.mimetype,
      fileSize: attachments.size,
      createdAt: attachments.createdAt,
      authorFullName: users.fullName,
      authorEmail: users.email,
      entityId: projects.id,
      entityLabel: projects.name
    })
    .from(projectAttachments)
    .innerJoin(attachments, eq(projectAttachments.attachmentId, attachments.id))
    .innerJoin(projects, eq(projectAttachments.projectId, projects.id))
    .leftJoin(users, eq(attachments.createdBy, users.id))
    .where(mineUserId === undefined ? inArray(projectAttachments.projectId, ids) : and(inArray(projectAttachments.projectId, ids), eq(attachments.createdBy, mineUserId)))
    .orderBy(desc(attachments.createdAt), desc(attachments.id));
  return rows.map((row) => mapRecentAttachmentRow(row, "project"));
}

async function recentMilestoneAttachmentRows(database: DbClient, ids: number[], mineUserId?: number): Promise<RecentAttachmentRow[]> {
  if (ids.length === 0) {
    return [];
  }
  const rows = await database
    .select({
      id: attachments.id,
      filename: attachments.originalName,
      storageFilename: attachments.filename,
      mimetype: attachments.mimetype,
      fileSize: attachments.size,
      createdAt: attachments.createdAt,
      authorFullName: users.fullName,
      authorEmail: users.email,
      entityId: milestones.id,
      entityLabel: milestones.name
    })
    .from(milestoneAttachments)
    .innerJoin(attachments, eq(milestoneAttachments.attachmentId, attachments.id))
    .innerJoin(milestones, eq(milestoneAttachments.milestoneId, milestones.id))
    .leftJoin(users, eq(attachments.createdBy, users.id))
    .where(mineUserId === undefined ? inArray(milestoneAttachments.milestoneId, ids) : and(inArray(milestoneAttachments.milestoneId, ids), eq(attachments.createdBy, mineUserId)))
    .orderBy(desc(attachments.createdAt), desc(attachments.id));
  return rows.map((row) => mapRecentAttachmentRow(row, "milestone"));
}

async function recentFeatureAttachmentRows(database: DbClient, ids: number[], mineUserId?: number): Promise<RecentAttachmentRow[]> {
  if (ids.length === 0) {
    return [];
  }
  const rows = await database
    .select({
      id: attachments.id,
      filename: attachments.originalName,
      storageFilename: attachments.filename,
      mimetype: attachments.mimetype,
      fileSize: attachments.size,
      createdAt: attachments.createdAt,
      authorFullName: users.fullName,
      authorEmail: users.email,
      entityId: features.id,
      entityLabel: features.title
    })
    .from(featureAttachments)
    .innerJoin(attachments, eq(featureAttachments.attachmentId, attachments.id))
    .innerJoin(features, eq(featureAttachments.featureId, features.id))
    .leftJoin(users, eq(attachments.createdBy, users.id))
    .where(mineUserId === undefined ? inArray(featureAttachments.featureId, ids) : and(inArray(featureAttachments.featureId, ids), eq(attachments.createdBy, mineUserId)))
    .orderBy(desc(attachments.createdAt), desc(attachments.id));
  return rows.map((row) => mapRecentAttachmentRow(row, "feature"));
}

async function recentTaskAttachmentRows(database: DbClient, ids: number[], mineUserId?: number): Promise<RecentAttachmentRow[]> {
  if (ids.length === 0) {
    return [];
  }
  const rows = await database
    .select({
      id: attachments.id,
      filename: attachments.originalName,
      storageFilename: attachments.filename,
      mimetype: attachments.mimetype,
      fileSize: attachments.size,
      createdAt: attachments.createdAt,
      authorFullName: users.fullName,
      authorEmail: users.email,
      entityId: tasks.id,
      entityLabel: tasks.title
    })
    .from(taskAttachments)
    .innerJoin(attachments, eq(taskAttachments.attachmentId, attachments.id))
    .innerJoin(tasks, eq(taskAttachments.taskId, tasks.id))
    .leftJoin(users, eq(attachments.createdBy, users.id))
    .where(mineUserId === undefined ? inArray(taskAttachments.taskId, ids) : and(inArray(taskAttachments.taskId, ids), eq(attachments.createdBy, mineUserId)))
    .orderBy(desc(attachments.createdAt), desc(attachments.id));
  return rows.map((row) => mapRecentAttachmentRow(row, "task"));
}

async function recentTicketAttachmentRows(database: DbClient, ids: number[], mineUserId?: number): Promise<RecentAttachmentRow[]> {
  if (ids.length === 0) {
    return [];
  }
  const rows = await database
    .select({
      id: attachments.id,
      filename: attachments.originalName,
      storageFilename: attachments.filename,
      mimetype: attachments.mimetype,
      fileSize: attachments.size,
      createdAt: attachments.createdAt,
      authorFullName: users.fullName,
      authorEmail: users.email,
      entityId: tickets.id,
      entityLabel: tickets.title
    })
    .from(ticketAttachments)
    .innerJoin(attachments, eq(ticketAttachments.attachmentId, attachments.id))
    .innerJoin(tickets, eq(ticketAttachments.ticketId, tickets.id))
    .leftJoin(users, eq(attachments.createdBy, users.id))
    .where(mineUserId === undefined ? inArray(ticketAttachments.ticketId, ids) : and(inArray(ticketAttachments.ticketId, ids), eq(attachments.createdBy, mineUserId)))
    .orderBy(desc(attachments.createdAt), desc(attachments.id));
  return rows.map((row) => mapRecentAttachmentRow(row, "ticket"));
}

async function recentWikiPageAttachmentRows(database: DbClient, ids: number[], mineUserId?: number): Promise<RecentAttachmentRow[]> {
  if (ids.length === 0) {
    return [];
  }
  const rows = await database
    .select({
      id: attachments.id,
      filename: attachments.originalName,
      storageFilename: attachments.filename,
      mimetype: attachments.mimetype,
      fileSize: attachments.size,
      createdAt: attachments.createdAt,
      authorFullName: users.fullName,
      authorEmail: users.email,
      entityId: wikiPages.id,
      entityLabel: wikiPages.title
    })
    .from(wikiPageAttachments)
    .innerJoin(attachments, eq(wikiPageAttachments.attachmentId, attachments.id))
    .innerJoin(wikiPages, eq(wikiPageAttachments.wikiPageId, wikiPages.id))
    .leftJoin(users, eq(attachments.createdBy, users.id))
    .where(mineUserId === undefined ? inArray(wikiPageAttachments.wikiPageId, ids) : and(inArray(wikiPageAttachments.wikiPageId, ids), eq(attachments.createdBy, mineUserId)))
    .orderBy(desc(attachments.createdAt), desc(attachments.id));
  return rows.map((row) => mapRecentAttachmentRow(row, "wikiPage"));
}

async function recentAttachmentRowsForOwner(database: DbClient, owner: RecentAttachmentOwner): Promise<RecentAttachmentRow[]> {
  if (owner.type === "project") {
    const milestoneIds = await attachmentProjectMilestoneIds(database, owner.id);
    const taskIds = await attachmentTaskIdsForOwner(database, owner);
    const ticketIds = await attachmentTicketIdsForOwner(database, owner);
    return [
      ...(await recentProjectAttachmentRows(database, [owner.id])),
      ...(await recentMilestoneAttachmentRows(database, milestoneIds)),
      ...(await recentTaskAttachmentRows(database, taskIds)),
      ...(await recentTicketAttachmentRows(database, ticketIds))
    ];
  }
  if (owner.type === "milestone") {
    const taskIds = await attachmentTaskIdsForOwner(database, owner);
    const ticketIds = await attachmentTicketIdsForOwner(database, owner);
    return [
      ...(await recentMilestoneAttachmentRows(database, [owner.id])),
      ...(await recentTaskAttachmentRows(database, taskIds)),
      ...(await recentTicketAttachmentRows(database, ticketIds))
    ];
  }
  return recentTaskAttachmentRows(database, [owner.id]);
}

async function recentOwnAttachmentRows(database: DbClient, userId: number): Promise<RecentAttachmentRow[]> {
  const projectIds = (await database.select({ id: projects.id }).from(projects)).map((row) => row.id);
  const milestoneIds = (await database.select({ id: milestones.id }).from(milestones)).map((row) => row.id);
  const featureIds = (await database.select({ id: features.id }).from(features)).map((row) => row.id);
  const taskIds = (await database.select({ id: tasks.id }).from(tasks)).map((row) => row.id);
  const ticketIds = (await database.select({ id: tickets.id }).from(tickets)).map((row) => row.id);
  const wikiPageIds = (await database.select({ id: wikiPages.id }).from(wikiPages)).map((row) => row.id);
  return [
    ...(await recentProjectAttachmentRows(database, projectIds, userId)),
    ...(await recentMilestoneAttachmentRows(database, milestoneIds, userId)),
    ...(await recentFeatureAttachmentRows(database, featureIds, userId)),
    ...(await recentTaskAttachmentRows(database, taskIds, userId)),
    ...(await recentTicketAttachmentRows(database, ticketIds, userId)),
    ...(await recentWikiPageAttachmentRows(database, wikiPageIds, userId))
  ];
}

async function recentAllAttachmentRows(database: DbClient): Promise<RecentAttachmentRow[]> {
  const projectIds = (await database.select({ id: projects.id }).from(projects)).map((row) => row.id);
  const milestoneIds = (await database.select({ id: milestones.id }).from(milestones)).map((row) => row.id);
  const featureIds = (await database.select({ id: features.id }).from(features)).map((row) => row.id);
  const taskIds = (await database.select({ id: tasks.id }).from(tasks)).map((row) => row.id);
  const ticketIds = (await database.select({ id: tickets.id }).from(tickets)).map((row) => row.id);
  const wikiPageIds = (await database.select({ id: wikiPages.id }).from(wikiPages)).map((row) => row.id);
  return [
    ...(await recentProjectAttachmentRows(database, projectIds)),
    ...(await recentMilestoneAttachmentRows(database, milestoneIds)),
    ...(await recentFeatureAttachmentRows(database, featureIds)),
    ...(await recentTaskAttachmentRows(database, taskIds)),
    ...(await recentTicketAttachmentRows(database, ticketIds)),
    ...(await recentWikiPageAttachmentRows(database, wikiPageIds))
  ];
}

export async function listRecentAttachments(database: DbClient, options: { owner?: RecentAttachmentOwner; currentUserId: number; limit?: number; mine?: boolean }): Promise<RecentAttachment[]> {
  const limit = Math.max(1, Math.min(options.limit ?? 10, 50));
  const rows = options.owner ? await recentAttachmentRowsForOwner(database, options.owner) : options.mine === true ? await recentOwnAttachmentRows(database, options.currentUserId) : await recentAllAttachmentRows(database);
  return rows
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime() || right.id - left.id)
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      filename: row.filename,
      storageFilename: row.storageFilename,
      mimetype: row.mimetype,
      fileSize: row.fileSize,
      url: `/api/attachments/${row.id}/content`,
      createdAt: row.createdAt,
      authorName: attachmentAuthorName(row),
      entityType: row.entityType,
      entityId: row.entityId,
      entityLabel: row.entityLabel
    }));
}

export async function listOwnerAttachments(database: DbClient, owner: AttachmentOwner): Promise<Attachment[]> {
  await ensureAttachmentOwnerExists(database, owner);
  const ownerAttachments = await selectOwnerAttachments(database, owner);
  const attachmentIds = ownerAttachments.map((attachment) => attachment.id);
  const ownersById = await listAttachmentOwnersForIds(database, attachmentIds);
  const assignments = await parentFileRepository.listAttachmentFolderAssignments(database, owner);
  const parentFolderByAttachmentId = new Map(assignments.map((assignment) => [assignment.attachmentId, assignment.folderId]));
  return ownerAttachments.map((attachment) =>
    buildAttachment(
      attachment,
      ownersById.get(attachment.id) ?? [],
      [],
      parentFolderByAttachmentId.get(attachment.id) ?? null
    )
  );
}

export async function deleteParentAttachmentsForOwners(
  database: DbClient,
  owners: AttachmentOwner[]
): Promise<void> {
  const ownerIdsByType = new Map<AttachmentOwner["type"], Set<number>>();
  for (const owner of owners) {
    const ids = ownerIdsByType.get(owner.type) ?? new Set<number>();
    ids.add(owner.id);
    ownerIdsByType.set(owner.type, ids);
  }

  const records: AttachmentRecord[] = [];
  const projectIds = [...(ownerIdsByType.get("project") ?? [])];
  if (projectIds.length > 0) {
    records.push(...await database
      .select(attachmentSelect)
      .from(attachments)
      .innerJoin(projectAttachments, eq(projectAttachments.attachmentId, attachments.id))
      .where(and(inArray(projectAttachments.projectId, projectIds), eq(attachments.kind, "parent_attachment"))));
  }
  const taskIds = [...(ownerIdsByType.get("task") ?? [])];
  if (taskIds.length > 0) {
    records.push(...await database
      .select(attachmentSelect)
      .from(attachments)
      .innerJoin(taskAttachments, eq(taskAttachments.attachmentId, attachments.id))
      .where(and(inArray(taskAttachments.taskId, taskIds), eq(attachments.kind, "parent_attachment"))));
  }
  const milestoneIds = [...(ownerIdsByType.get("milestone") ?? [])];
  if (milestoneIds.length > 0) {
    records.push(...await database
      .select(attachmentSelect)
      .from(attachments)
      .innerJoin(milestoneAttachments, eq(milestoneAttachments.attachmentId, attachments.id))
      .where(and(inArray(milestoneAttachments.milestoneId, milestoneIds), eq(attachments.kind, "parent_attachment"))));
  }
  const featureIds = [...(ownerIdsByType.get("feature") ?? [])];
  if (featureIds.length > 0) {
    records.push(...await database
      .select(attachmentSelect)
      .from(attachments)
      .innerJoin(featureAttachments, eq(featureAttachments.attachmentId, attachments.id))
      .where(and(inArray(featureAttachments.featureId, featureIds), eq(attachments.kind, "parent_attachment"))));
  }
  const ticketIds = [...(ownerIdsByType.get("ticket") ?? [])];
  if (ticketIds.length > 0) {
    records.push(...await database
      .select(attachmentSelect)
      .from(attachments)
      .innerJoin(ticketAttachments, eq(ticketAttachments.attachmentId, attachments.id))
      .where(and(inArray(ticketAttachments.ticketId, ticketIds), eq(attachments.kind, "parent_attachment"))));
  }
  const wikiPageIds = [...(ownerIdsByType.get("wikiPage") ?? [])];
  if (wikiPageIds.length > 0) {
    records.push(...await database
      .select(attachmentSelect)
      .from(attachments)
      .innerJoin(wikiPageAttachments, eq(wikiPageAttachments.attachmentId, attachments.id))
      .where(and(inArray(wikiPageAttachments.wikiPageId, wikiPageIds), eq(attachments.kind, "parent_attachment"))));
  }

  const uniqueRecords = [...new Map(records.map((record) => [record.id, record])).values()];
  if (uniqueRecords.length === 0) {
    return;
  }
  const attachmentIds = uniqueRecords.map((record) => record.id);
  const deleted = mutationAffectedRows(
    await database
      .delete(attachments)
      .where(and(inArray(attachments.id, attachmentIds), eq(attachments.kind, "parent_attachment")))
  );
  if (deleted !== uniqueRecords.length) {
    throw conflict("Mindestens ein Parent-Anhang wurde zwischenzeitlich geändert.");
  }
  try {
    await removeAttachmentFiles(uniqueRecords);
  } catch {
    throw internalError("Die Parent-Anhänge wurden gelöscht, mindestens eine physische Datei konnte jedoch nicht vollständig entfernt werden.");
  }
}

export async function listProjectAttachments(database: DbClient, projectId: number): Promise<Attachment[]> {
  return listOwnerAttachments(database, { type: "project", id: projectId });
}

export async function listTaskAttachments(database: DbClient, taskId: number): Promise<Attachment[]> {
  return listOwnerAttachments(database, { type: "task", id: taskId });
}

export async function listMilestoneAttachments(database: DbClient, milestoneId: number): Promise<Attachment[]> {
  return listOwnerAttachments(database, { type: "milestone", id: milestoneId });
}

export async function listFeatureAttachments(database: DbClient, featureId: number): Promise<Attachment[]> {
  return listOwnerAttachments(database, { type: "feature", id: featureId });
}

export async function listTicketAttachments(database: DbClient, ticketId: number): Promise<Attachment[]> {
  return listOwnerAttachments(database, { type: "ticket", id: ticketId });
}

export async function listWikiPageAttachments(database: DbClient, wikiPageId: number): Promise<Attachment[]> {
  return listOwnerAttachments(database, { type: "wikiPage", id: wikiPageId });
}

export async function createProjectAttachment(database: DbClient, projectId: number, upload: OwnerAttachmentUpload, actor?: JournalActor | null): Promise<Attachment> {
  const owner = { type: "project" as const, id: projectId };
  await ensureAttachmentOwnerExists(database, owner);
  return persistAttachment({ database, owner, upload, actor });
}

export async function createTaskAttachment(database: DbClient, taskId: number, upload: OwnerAttachmentUpload, actor?: JournalActor | null): Promise<Attachment> {
  const owner = { type: "task" as const, id: taskId };
  await ensureAttachmentOwnerExists(database, owner);
  return persistAttachment({ database, owner, upload, actor });
}

export async function createMilestoneAttachment(database: DbClient, milestoneId: number, upload: OwnerAttachmentUpload, actor?: JournalActor | null): Promise<Attachment> {
  const owner = { type: "milestone" as const, id: milestoneId };
  await ensureAttachmentOwnerExists(database, owner);
  return persistAttachment({ database, owner, upload, actor });
}

export async function createFeatureAttachment(database: DbClient, featureId: number, upload: OwnerAttachmentUpload, actor?: JournalActor | null): Promise<Attachment> {
  const owner = { type: "feature" as const, id: featureId };
  await ensureAttachmentOwnerExists(database, owner);
  return persistAttachment({ database, owner, upload, actor });
}

export async function createTicketAttachment(database: DbClient, ticketId: number, upload: OwnerAttachmentUpload, actor?: JournalActor | null): Promise<Attachment> {
  const owner = { type: "ticket" as const, id: ticketId };
  await ensureAttachmentOwnerExists(database, owner);
  return persistAttachment({ database, owner, upload, actor });
}

export async function createWikiPageAttachment(database: DbClient, wikiPageId: number, upload: OwnerAttachmentUpload, actor?: JournalActor | null): Promise<Attachment> {
  const owner = { type: "wikiPage" as const, id: wikiPageId };
  await ensureAttachmentOwnerExists(database, owner);
  return persistAttachment({ database, owner, upload, actor });
}

export async function deleteParentAttachment(
  database: DbClient,
  owner: AttachmentOwner,
  attachmentId: number,
  input: { expectedVersion: number },
  actor?: JournalActor | null
): Promise<void> {
  await bulkDeleteAttachments(
    database,
    owner,
    [{ id: attachmentId, expectedVersion: input.expectedVersion }],
    actor
  );
}

interface AttachmentVersionSelection {
  id: number;
  expectedVersion: number;
}

function normalizeAttachmentVersionSelection(
  items: AttachmentVersionSelection[]
): AttachmentVersionSelection[] {
  if (items.length === 0) {
    throw badRequest("Es wurden keine Attachments ausgewählt.");
  }
  if (items.length > 100) {
    throw badRequest("Höchstens 100 Attachments können gleichzeitig bearbeitet werden.");
  }
  const byId = new Map<number, AttachmentVersionSelection>();
  for (const item of items) {
    const existing = byId.get(item.id);
    if (existing && existing.expectedVersion !== item.expectedVersion) {
      throw badRequest(`Attachment ${item.id} wurde mit widersprüchlichen Versionen ausgewählt.`);
    }
    byId.set(item.id, item);
  }
  return [...byId.values()];
}

async function loadSelectedOwnerAttachments(
  database: DbClient,
  owner: AttachmentOwner,
  items: AttachmentVersionSelection[]
): Promise<{ selections: AttachmentVersionSelection[]; records: AttachmentRecord[] }> {
  await ensureAttachmentOwnerExists(database, owner);
  const selections = normalizeAttachmentVersionSelection(items);
  const records = await selectOwnerAttachments(
    database,
    owner,
    selections.map((item) => item.id)
  );
  if (records.length !== selections.length) {
    throw notFound("Mindestens ein ausgewähltes Attachment ist nicht mehr mit diesem Item verknüpft.");
  }
  const recordById = new Map(records.map((record) => [record.id, record]));
  for (const selection of selections) {
    const record = recordById.get(selection.id);
    if (!record) {
      throw notFound(`Attachment with id ${selection.id} not found`);
    }
    assertVersion(record.version, selection.expectedVersion);
  }
  return { selections, records };
}

function versionSelectionCondition(items: AttachmentVersionSelection[]) {
  const condition = or(
    ...items.map((item) =>
      and(eq(attachments.id, item.id), eq(attachments.version, item.expectedVersion))
    )
  );
  if (!condition) {
    throw badRequest("Es wurden keine Attachments ausgewählt.");
  }
  return condition;
}

export async function bulkDeleteAttachments(
  database: DbClient,
  owner: AttachmentOwner,
  items: AttachmentVersionSelection[],
  actor?: JournalActor | null
): Promise<void> {
  const { selections, records } = await loadSelectedOwnerAttachments(database, owner, items);
  const ownerObject = await getAttachmentOwnerJournalObject(database, owner);
  await database.transaction(async (tx) => {
    await recordJournalEntry(tx, {
      operation: "update",
      object: ownerObject,
      summary: `${selections.length} Attachment(s) wurden gesammelt endgültig gelöscht.`,
      actor
    });
    const deleted = mutationAffectedRows(
      await tx.delete(attachments).where(versionSelectionCondition(selections))
    );
    if (deleted !== selections.length) {
      throw conflict("Mindestens ein Attachment wurde zwischenzeitlich geändert.");
    }
  });
  try {
    await removeAttachmentFiles(records);
  } catch {
    throw internalError("Die Attachment-Datensätze wurden gelöscht, mindestens eine physische Datei konnte jedoch nicht vollständig entfernt werden.");
  }
}

export async function deleteAttachment(
  database: DbClient,
  id: number,
  expectedVersion: number,
  actor?: JournalActor | null,
  expectedKind?: AttachmentRecord["kind"]
): Promise<void> {
  const record = await attachmentRepository.findById(database, id);
  if (!record || (expectedKind !== undefined && record.kind !== expectedKind)) {
    throw notFound(`Attachment with id ${id} not found`);
  }
  assertVersion(record.version, expectedVersion);

  // Verwaiste Owner-Links (Fachobjekt bereits gelöscht) dürfen das Löschen nicht blockieren:
  // Für solche Owner wird der Journal-Kontext übersprungen statt mit 404 abzubrechen.
  const owners = await listAttachmentOwners(database, id);
  const ownerContexts: Array<ReturnType<typeof makeJournalContext>> = [];
  for (const owner of owners) {
    const ownerObject = await resolveOwnerJournalObjectOrNull(database, owner);
    if (ownerObject) {
      ownerContexts.push(makeJournalContext(ownerObject, "owner"));
    }
  }
  await database.transaction(async (tx) => {
    const journalObject = attachmentJournalObject(record);
    await recordJournalEntry(tx, {
      operation: "delete",
      object: journalObject,
      summary: buildDeleteSummary(journalObject),
      actor,
      contexts: ownerContexts
    });
    if (!(await attachmentRepository.deleteVersioned(tx, id, expectedVersion))) {
      throw conflict("Das Attachment wurde zwischenzeitlich geändert.");
    }
  });
  try {
    await removeAttachmentFiles([record]);
  } catch {
    throw internalError("Der Attachment-Datensatz wurde gelöscht, die physische Datei konnte jedoch nicht vollständig entfernt werden und muss geprüft werden.");
  }
}

export async function openAttachment(
  database: DbClient,
  id: number,
  fileOpener: FileOpener,
  actor?: JournalActor | null,
  expectedKind?: AttachmentRecord["kind"]
): Promise<void> {
  const record = await attachmentRepository.findById(database, id);
  if (!record || (expectedKind !== undefined && record.kind !== expectedKind)) {
    throw notFound(`Attachment with id ${id} not found`);
  }

  assertSafeTestDirectoryPath(config.uploadDir, "UPLOAD_DIR");
  const diskPath = attachmentDiskPath(record);
  if (!(await fileExists(diskPath))) {
    throw notFound("Die Datei wurde im Upload-Verzeichnis nicht gefunden.");
  }

  try {
    await fileOpener(diskPath);
  } catch {
    throw internalError("Datei konnte nicht geöffnet werden.");
  }
  await watchAttachmentForChanges(database, record.id, diskPath, actor?.actorUserId ?? null);
}

export async function getAttachmentFile(
  database: DbClient,
  id: number,
  expectedKind?: AttachmentRecord["kind"]
): Promise<AttachmentFile> {
  const record = await attachmentRepository.findById(database, id);
  if (!record || (expectedKind !== undefined && record.kind !== expectedKind)) {
    throw notFound(`Attachment with id ${id} not found`);
  }
  assertSafeTestDirectoryPath(config.uploadDir, "UPLOAD_DIR");
  const diskPath = attachmentDiskPath(record);
  if (!(await fileExists(diskPath))) {
    throw notFound("Die Datei wurde im Upload-Verzeichnis nicht gefunden.");
  }
  return { diskPath, originalName: record.originalName, mimetype: record.mimetype, size: record.size };
}

export async function getAttachmentFilesForOwner(
  database: DbClient,
  owner: AttachmentOwner,
  attachmentIds: number[]
): Promise<AttachmentFile[]> {
  await ensureAttachmentOwnerExists(database, owner);
  const uniqueIds = [...new Set(attachmentIds)];
  if (uniqueIds.length === 0) {
    return [];
  }
  assertSafeTestDirectoryPath(config.uploadDir, "UPLOAD_DIR");
  const records = await selectOwnerAttachments(database, owner, uniqueIds);
  if (records.length !== uniqueIds.length) {
    throw notFound("Mindestens ein ausgewähltes Attachment ist nicht mehr mit diesem Item verknüpft.");
  }
  const files: AttachmentFile[] = [];
  for (const record of records) {
    const diskPath = attachmentDiskPath(record);
    if (!(await fileExists(diskPath))) {
      throw notFound(`Die Datei "${record.originalName}" wurde im Upload-Verzeichnis nicht gefunden.`);
    }
    files.push({
      diskPath,
      originalName: record.originalName,
      mimetype: record.mimetype,
      size: record.size
    });
  }
  return files;
}
