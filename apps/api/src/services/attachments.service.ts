import type { Attachment, AttachmentOwner, JournalObjectType, RecentAttachment } from "@taskmanager/shared-types";
import { and, desc, eq, inArray } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import type { DbClient, DbSession } from "../db/client.js";
import { firstRow } from "../db/query-utils.js";
import {
  attachments,
  featureAttachments,
  features,
  milestoneAttachments,
  milestoneTasks,
  milestoneTickets,
  milestones,
  projectAttachments,
  projectTasks,
  projectTickets,
  projects,
  taskAttachments,
  tasks,
  ticketAttachments,
  tickets,
  users,
  wikiPageAttachments,
  wikiPages
} from "../db/schema.js";
import { attachmentRepository, type AttachmentRecord } from "../repositories/attachment.repository.js";
import { assertSafeTestDirectoryPath } from "../runtime-safety.js";
import { badRequest, internalError, notFound } from "../utils/errors.js";
import { removeAttachmentPreviews } from "./attachment-preview.service.js";
import { watchAttachmentForChanges } from "./attachment-watcher.service.js";
import type { FileOpener } from "./file-opener.service.js";
import {
  buildDeleteSummary,
  buildLinkSummary,
  buildUnlinkSummary,
  makeJournalContext,
  makeJournalObject,
  objectTypeLabel,
  recordJournalEntry,
  type JournalActor,
  type JournalObjectRef
} from "./journal.service.js";

type AttachmentCleanupRecord = Pick<AttachmentRecord, "id" | "filename">;

export interface AttachmentUpload {
  originalName: string;
  mimetype: string;
  buffer: Buffer;
}

const attachmentSelect = {
  id: attachments.id,
  originalName: attachments.originalName,
  filename: attachments.filename,
  mimetype: attachments.mimetype,
  size: attachments.size,
  version: attachments.version,
  createdBy: attachments.createdBy,
  updatedBy: attachments.updatedBy,
  createdAt: attachments.createdAt,
  updatedAt: attachments.updatedAt
};

async function mapAttachment(database: DbClient, record: AttachmentRecord): Promise<Attachment> {
  return {
    id: record.id,
    owners: await listAttachmentOwners(database, record.id),
    originalName: record.originalName,
    filename: record.filename,
    mimetype: record.mimetype,
    size: record.size,
    url: `/uploads/${record.filename}`,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: record.version
  };
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

async function ensureOwnerExists(database: DbClient, owner: AttachmentOwner): Promise<void> {
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

async function getOwnerJournalObject(database: DbClient, owner: AttachmentOwner): Promise<JournalObjectRef> {
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

async function listAttachmentOwners(database: DbClient, attachmentId: number): Promise<AttachmentOwner[]> {
  const projectRows = await database.select({ id: projectAttachments.projectId }).from(projectAttachments).where(eq(projectAttachments.attachmentId, attachmentId));
  const taskRows = await database.select({ id: taskAttachments.taskId }).from(taskAttachments).where(eq(taskAttachments.attachmentId, attachmentId));
  const milestoneRows = await database.select({ id: milestoneAttachments.milestoneId }).from(milestoneAttachments).where(eq(milestoneAttachments.attachmentId, attachmentId));
  const featureRows = await database.select({ id: featureAttachments.featureId }).from(featureAttachments).where(eq(featureAttachments.attachmentId, attachmentId));
  const wikiPageRows = await database.select({ id: wikiPageAttachments.wikiPageId }).from(wikiPageAttachments).where(eq(wikiPageAttachments.attachmentId, attachmentId));
  const ticketRows = await database.select({ id: ticketAttachments.ticketId }).from(ticketAttachments).where(eq(ticketAttachments.attachmentId, attachmentId));
  return [
    ...projectRows.map((row) => ({ type: "project" as const, id: row.id })),
    ...taskRows.map((row) => ({ type: "task" as const, id: row.id })),
    ...milestoneRows.map((row) => ({ type: "milestone" as const, id: row.id })),
    ...featureRows.map((row) => ({ type: "feature" as const, id: row.id })),
    ...wikiPageRows.map((row) => ({ type: "wikiPage" as const, id: row.id })),
    ...ticketRows.map((row) => ({ type: "ticket" as const, id: row.id }))
  ];
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

async function deleteAttachmentRecords(database: DbClient, records: AttachmentCleanupRecord[]): Promise<void> {
  if (records.length === 0) {
    return;
  }

  await attachmentRepository.deleteByIds(database, records.map((record) => record.id));
  await removeAttachmentFiles(records);
}

async function attachmentOnlyOwnedBy(database: DbClient, attachmentId: number, ownerType: AttachmentOwner["type"], ownerIds: Set<number>): Promise<boolean> {
  const owners = await listAttachmentOwners(database, attachmentId);
  return owners.length > 0 && owners.every((owner) => owner.type === ownerType && ownerIds.has(owner.id));
}

async function deleteAttachmentsOwnedOnlyBy(database: DbClient, ownerType: AttachmentOwner["type"], ownerIds: number[]): Promise<void> {
  const uniqueIds = [...new Set(ownerIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  const idSet = new Set(uniqueIds);
  const candidateRows =
    ownerType === "project"
      ? await database.select({ id: projectAttachments.attachmentId }).from(projectAttachments).where(inArray(projectAttachments.projectId, uniqueIds))
      : ownerType === "task"
        ? await database.select({ id: taskAttachments.attachmentId }).from(taskAttachments).where(inArray(taskAttachments.taskId, uniqueIds))
        : ownerType === "milestone"
          ? await database.select({ id: milestoneAttachments.attachmentId }).from(milestoneAttachments).where(inArray(milestoneAttachments.milestoneId, uniqueIds))
          : ownerType === "feature"
            ? await database.select({ id: featureAttachments.attachmentId }).from(featureAttachments).where(inArray(featureAttachments.featureId, uniqueIds))
            : ownerType === "wikiPage"
              ? await database.select({ id: wikiPageAttachments.attachmentId }).from(wikiPageAttachments).where(inArray(wikiPageAttachments.wikiPageId, uniqueIds))
              : await database.select({ id: ticketAttachments.attachmentId }).from(ticketAttachments).where(inArray(ticketAttachments.ticketId, uniqueIds));

  const attachmentIds: number[] = [];
  for (const attachmentId of [...new Set(candidateRows.map((row) => row.id))]) {
    if (await attachmentOnlyOwnedBy(database, attachmentId, ownerType, idSet)) {
      attachmentIds.push(attachmentId);
    }
  }
  if (attachmentIds.length === 0) {
    return;
  }

  const records = await attachmentRepository.findCleanupRecords(database, attachmentIds);
  await deleteAttachmentRecords(database, records);
}

async function persistAttachment(values: {
  database: DbClient;
  owner: AttachmentOwner;
  upload: AttachmentUpload;
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
      size: values.upload.buffer.byteLength
    }, values.actor?.actorUserId ?? undefined);
    await insertAttachmentLink(tx, values.owner, attachment.id);
    const attachmentObject = attachmentJournalObject(attachment);
    const ownerObject = await getOwnerJournalObject(values.database, values.owner);
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

async function selectOwnerAttachments(database: DbClient, owner: AttachmentOwner): Promise<AttachmentRecord[]> {
  if (owner.type === "project") {
    return database
      .select(attachmentSelect)
      .from(projectAttachments)
      .innerJoin(attachments, eq(projectAttachments.attachmentId, attachments.id))
      .where(eq(projectAttachments.projectId, owner.id))
      .orderBy(desc(attachments.createdAt))
      ;
  }
  if (owner.type === "task") {
    return database
      .select(attachmentSelect)
      .from(taskAttachments)
      .innerJoin(attachments, eq(taskAttachments.attachmentId, attachments.id))
      .where(eq(taskAttachments.taskId, owner.id))
      .orderBy(desc(attachments.createdAt))
      ;
  }
  if (owner.type === "milestone") {
    return database
      .select(attachmentSelect)
      .from(milestoneAttachments)
      .innerJoin(attachments, eq(milestoneAttachments.attachmentId, attachments.id))
      .where(eq(milestoneAttachments.milestoneId, owner.id))
      .orderBy(desc(attachments.createdAt))
      ;
  }
  if (owner.type === "feature") {
    return database
      .select(attachmentSelect)
      .from(featureAttachments)
      .innerJoin(attachments, eq(featureAttachments.attachmentId, attachments.id))
      .where(eq(featureAttachments.featureId, owner.id))
      .orderBy(desc(attachments.createdAt))
      ;
  }
  if (owner.type === "wikiPage") {
    return database
      .select(attachmentSelect)
      .from(wikiPageAttachments)
      .innerJoin(attachments, eq(wikiPageAttachments.attachmentId, attachments.id))
      .where(eq(wikiPageAttachments.wikiPageId, owner.id))
      .orderBy(desc(attachments.createdAt))
      ;
  }
  return database
    .select(attachmentSelect)
    .from(ticketAttachments)
    .innerJoin(attachments, eq(ticketAttachments.attachmentId, attachments.id))
    .where(eq(ticketAttachments.ticketId, owner.id))
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
      url: `/uploads/${row.storageFilename}`,
      createdAt: row.createdAt,
      authorName: attachmentAuthorName(row),
      entityType: row.entityType,
      entityId: row.entityId,
      entityLabel: row.entityLabel
    }));
}

async function listOwnerAttachments(database: DbClient, owner: AttachmentOwner): Promise<Attachment[]> {
  await ensureOwnerExists(database, owner);
  const attachments = await selectOwnerAttachments(database, owner);
  return Promise.all(attachments.map((attachment) => mapAttachment(database, attachment)));
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

export async function deleteProjectAttachmentsForIds(database: DbClient, projectIds: number[]): Promise<void> {
  await deleteAttachmentsOwnedOnlyBy(database, "project", projectIds);
}

export async function deleteTaskAttachmentsForIds(database: DbClient, taskIds: number[]): Promise<void> {
  await deleteAttachmentsOwnedOnlyBy(database, "task", taskIds);
}

export async function deleteMilestoneAttachmentsForIds(database: DbClient, milestoneIds: number[]): Promise<void> {
  await deleteAttachmentsOwnedOnlyBy(database, "milestone", milestoneIds);
}

export async function deleteFeatureAttachmentsForIds(database: DbClient, featureIds: number[]): Promise<void> {
  await deleteAttachmentsOwnedOnlyBy(database, "feature", featureIds);
}

export async function deleteTicketAttachmentsForIds(database: DbClient, ticketIds: number[]): Promise<void> {
  await deleteAttachmentsOwnedOnlyBy(database, "ticket", ticketIds);
}

export async function deleteWikiPageAttachmentsForIds(database: DbClient, wikiPageIds: number[]): Promise<void> {
  await deleteAttachmentsOwnedOnlyBy(database, "wikiPage", wikiPageIds);
}

export async function createProjectAttachment(database: DbClient, projectId: number, upload: AttachmentUpload, actor?: JournalActor | null): Promise<Attachment> {
  const owner = { type: "project" as const, id: projectId };
  await ensureOwnerExists(database, owner);
  return persistAttachment({ database, owner, upload, actor });
}

export async function createTaskAttachment(database: DbClient, taskId: number, upload: AttachmentUpload, actor?: JournalActor | null): Promise<Attachment> {
  const owner = { type: "task" as const, id: taskId };
  await ensureOwnerExists(database, owner);
  return persistAttachment({ database, owner, upload, actor });
}

export async function createMilestoneAttachment(database: DbClient, milestoneId: number, upload: AttachmentUpload, actor?: JournalActor | null): Promise<Attachment> {
  const owner = { type: "milestone" as const, id: milestoneId };
  await ensureOwnerExists(database, owner);
  return persistAttachment({ database, owner, upload, actor });
}

export async function createFeatureAttachment(database: DbClient, featureId: number, upload: AttachmentUpload, actor?: JournalActor | null): Promise<Attachment> {
  const owner = { type: "feature" as const, id: featureId };
  await ensureOwnerExists(database, owner);
  return persistAttachment({ database, owner, upload, actor });
}

export async function createTicketAttachment(database: DbClient, ticketId: number, upload: AttachmentUpload, actor?: JournalActor | null): Promise<Attachment> {
  const owner = { type: "ticket" as const, id: ticketId };
  await ensureOwnerExists(database, owner);
  return persistAttachment({ database, owner, upload, actor });
}

export async function createWikiPageAttachment(database: DbClient, wikiPageId: number, upload: AttachmentUpload, actor?: JournalActor | null): Promise<Attachment> {
  const owner = { type: "wikiPage" as const, id: wikiPageId };
  await ensureOwnerExists(database, owner);
  return persistAttachment({ database, owner, upload, actor });
}

export async function linkAttachment(database: DbClient, owner: AttachmentOwner, attachmentId: number, actor?: JournalActor | null): Promise<Attachment> {
  await ensureOwnerExists(database, owner);
  const attachment = await attachmentRepository.findById(database, attachmentId);
  if (!attachment) {
    throw notFound(`Attachment with id ${attachmentId} not found`);
  }
  const ownerObject = await getOwnerJournalObject(database, owner);
  const attachmentObject = attachmentJournalObject(attachment);
  const alreadyLinked = (await listAttachmentOwners(database, attachmentId)).some((currentOwner) => currentOwner.type === owner.type && currentOwner.id === owner.id);
  await database.transaction(async (tx) => {
    await insertAttachmentLink(tx, owner, attachmentId);
    if (!alreadyLinked) {
      await recordJournalEntry(tx, {
        operation: "link",
        object: attachmentObject,
        summary: buildLinkSummary(attachmentObject, ownerObject),
        actor,
        contexts: [makeJournalContext(ownerObject, "owner")]
      });
    }
  });
  return mapAttachment(database, attachment);
}

export async function deleteWikiPageAttachment(database: DbClient, wikiPageId: number, attachmentId: number, actor?: JournalActor | null): Promise<void> {
  const owner = { type: "wikiPage" as const, id: wikiPageId };
  await ensureOwnerExists(database, owner);
  const record = await attachmentRepository.findById(database, attachmentId);
  if (!record) {
    throw notFound(`Attachment with id ${attachmentId} not found`);
  }
  const linked = (await listAttachmentOwners(database, attachmentId)).some((currentOwner) => currentOwner.type === owner.type && currentOwner.id === owner.id);
  if (!linked) {
    throw notFound(`Attachment with id ${attachmentId} is not linked to wiki page ${wikiPageId}`);
  }

  const ownerObject = await getOwnerJournalObject(database, owner);
  const attachmentObject = attachmentJournalObject(record);
  await database.transaction(async (tx) => {
    await tx.delete(wikiPageAttachments)
      .where(and(eq(wikiPageAttachments.wikiPageId, wikiPageId), eq(wikiPageAttachments.attachmentId, attachmentId)))
      ;
    await recordJournalEntry(tx, {
      operation: "unlink",
      object: attachmentObject,
      summary: buildUnlinkSummary(attachmentObject, ownerObject),
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });

  if ((await listAttachmentOwners(database, attachmentId)).length === 0) {
    await deleteAttachmentRecords(database, [record]);
  }
}

export async function deleteAttachment(database: DbClient, id: number, actor?: JournalActor | null): Promise<void> {
  const record = await attachmentRepository.findById(database, id);
  if (!record) {
    throw notFound(`Attachment with id ${id} not found`);
  }

  const ownerContexts = await Promise.all((await listAttachmentOwners(database, id)).map(async (owner) => makeJournalContext(await getOwnerJournalObject(database, owner), "owner")));
  await database.transaction(async (tx) => {
    const journalObject = attachmentJournalObject(record);
    await recordJournalEntry(tx, {
      operation: "delete",
      object: journalObject,
      summary: buildDeleteSummary(journalObject),
      actor,
      contexts: ownerContexts
    });
    await attachmentRepository.deleteByIds(tx, [id]);
  });
  await removeAttachmentFiles([record]);
}

export async function openAttachment(database: DbClient, id: number, fileOpener: FileOpener, actor?: JournalActor | null): Promise<void> {
  const record = await attachmentRepository.findById(database, id);
  if (!record) {
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
