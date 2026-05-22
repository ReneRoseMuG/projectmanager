import type { Attachment, AttachmentOwner, JournalObjectType, RecentAttachment } from "@taskmanager/shared-types";
import { and, desc, eq, inArray } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import type { DbClient, DbSession } from "../db/client.js";
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
  users
} from "../db/schema.js";
import { attachmentRepository, type AttachmentRecord } from "../repositories/attachment.repository.js";
import { assertSafeTestDirectoryPath } from "../runtime-safety.js";
import { badRequest, internalError, notFound } from "../utils/errors.js";
import { removeAttachmentPreviews } from "./attachment-preview.service.js";
import type { FileOpener } from "./file-opener.service.js";
import {
  buildDeleteSummary,
  buildLinkSummary,
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

function mapAttachment(database: DbClient, record: AttachmentRecord): Attachment {
  return {
    id: record.id,
    owners: listAttachmentOwners(database, record.id),
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

function ensureProjectExists(database: DbClient, projectId: number): void {
  const project = database.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
}

function ensureTaskExists(database: DbClient, taskId: number): void {
  const task = database.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) {
    throw notFound(`Task with id ${taskId} not found`);
  }
}

function ensureMilestoneExists(database: DbClient, milestoneId: number): void {
  const milestone = database.select({ id: milestones.id }).from(milestones).where(eq(milestones.id, milestoneId)).get();
  if (!milestone) {
    throw notFound(`Milestone with id ${milestoneId} not found`);
  }
}

function ensureFeatureExists(database: DbClient, featureId: number): void {
  const feature = database.select({ id: features.id }).from(features).where(eq(features.id, featureId)).get();
  if (!feature) {
    throw notFound(`Feature with id ${featureId} not found`);
  }
}

function ensureTicketExists(database: DbClient, ticketId: number): void {
  const ticket = database.select({ id: tickets.id }).from(tickets).where(eq(tickets.id, ticketId)).get();
  if (!ticket) {
    throw notFound(`Ticket with id ${ticketId} not found`);
  }
}

function ensureOwnerExists(database: DbClient, owner: AttachmentOwner): void {
  if (owner.type === "project") {
    ensureProjectExists(database, owner.id);
    return;
  }
  if (owner.type === "task") {
    ensureTaskExists(database, owner.id);
    return;
  }
  if (owner.type === "milestone") {
    ensureMilestoneExists(database, owner.id);
    return;
  }
  if (owner.type === "feature") {
    ensureFeatureExists(database, owner.id);
    return;
  }
  ensureTicketExists(database, owner.id);
}

function getOwnerJournalObject(database: DbClient, owner: AttachmentOwner): JournalObjectRef {
  if (owner.type === "project") {
    const project = database.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, owner.id)).get();
    if (!project) {
      throw notFound(`Project with id ${owner.id} not found`);
    }
    return makeJournalObject("project", project.id, project.name);
  }
  if (owner.type === "task") {
    const task = database.select({ id: tasks.id, title: tasks.title }).from(tasks).where(eq(tasks.id, owner.id)).get();
    if (!task) {
      throw notFound(`Task with id ${owner.id} not found`);
    }
    return makeJournalObject("task", task.id, task.title);
  }
  if (owner.type === "milestone") {
    const milestone = database.select({ id: milestones.id, name: milestones.name }).from(milestones).where(eq(milestones.id, owner.id)).get();
    if (!milestone) {
      throw notFound(`Milestone with id ${owner.id} not found`);
    }
    return makeJournalObject("milestone", milestone.id, milestone.name);
  }
  if (owner.type === "feature") {
    const feature = database.select({ id: features.id, title: features.title }).from(features).where(eq(features.id, owner.id)).get();
    if (!feature) {
      throw notFound(`Feature with id ${owner.id} not found`);
    }
    return makeJournalObject("feature", feature.id, feature.title);
  }
  const ticket = database.select({ id: tickets.id, title: tickets.title }).from(tickets).where(eq(tickets.id, owner.id)).get();
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

function listAttachmentOwners(database: DbClient, attachmentId: number): AttachmentOwner[] {
  return [
    ...database
      .select({ id: projectAttachments.projectId })
      .from(projectAttachments)
      .where(eq(projectAttachments.attachmentId, attachmentId))
      .all()
      .map((row) => ({ type: "project" as const, id: row.id })),
    ...database
      .select({ id: taskAttachments.taskId })
      .from(taskAttachments)
      .where(eq(taskAttachments.attachmentId, attachmentId))
      .all()
      .map((row) => ({ type: "task" as const, id: row.id })),
    ...database
      .select({ id: milestoneAttachments.milestoneId })
      .from(milestoneAttachments)
      .where(eq(milestoneAttachments.attachmentId, attachmentId))
      .all()
      .map((row) => ({ type: "milestone" as const, id: row.id })),
    ...database
      .select({ id: featureAttachments.featureId })
      .from(featureAttachments)
      .where(eq(featureAttachments.attachmentId, attachmentId))
      .all()
      .map((row) => ({ type: "feature" as const, id: row.id })),
    ...database
      .select({ id: ticketAttachments.ticketId })
      .from(ticketAttachments)
      .where(eq(ticketAttachments.attachmentId, attachmentId))
      .all()
      .map((row) => ({ type: "ticket" as const, id: row.id }))
  ];
}

function insertAttachmentLink(database: DbSession, owner: AttachmentOwner, attachmentId: number): void {
  if (owner.type === "project") {
    database.insert(projectAttachments).values({ projectId: owner.id, attachmentId }).onConflictDoNothing().run();
    return;
  }
  if (owner.type === "task") {
    database.insert(taskAttachments).values({ taskId: owner.id, attachmentId }).onConflictDoNothing().run();
    return;
  }
  if (owner.type === "milestone") {
    database.insert(milestoneAttachments).values({ milestoneId: owner.id, attachmentId }).onConflictDoNothing().run();
    return;
  }
  if (owner.type === "feature") {
    database.insert(featureAttachments).values({ featureId: owner.id, attachmentId }).onConflictDoNothing().run();
    return;
  }
  database.insert(ticketAttachments).values({ ticketId: owner.id, attachmentId }).onConflictDoNothing().run();
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

  attachmentRepository.deleteByIds(database, records.map((record) => record.id));
  await removeAttachmentFiles(records);
}

function attachmentOnlyOwnedBy(database: DbClient, attachmentId: number, ownerType: AttachmentOwner["type"], ownerIds: Set<number>): boolean {
  const owners = listAttachmentOwners(database, attachmentId);
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
      ? database.select({ id: projectAttachments.attachmentId }).from(projectAttachments).where(inArray(projectAttachments.projectId, uniqueIds)).all()
      : ownerType === "task"
        ? database.select({ id: taskAttachments.attachmentId }).from(taskAttachments).where(inArray(taskAttachments.taskId, uniqueIds)).all()
        : ownerType === "milestone"
          ? database.select({ id: milestoneAttachments.attachmentId }).from(milestoneAttachments).where(inArray(milestoneAttachments.milestoneId, uniqueIds)).all()
          : ownerType === "feature"
            ? database.select({ id: featureAttachments.attachmentId }).from(featureAttachments).where(inArray(featureAttachments.featureId, uniqueIds)).all()
            : database.select({ id: ticketAttachments.attachmentId }).from(ticketAttachments).where(inArray(ticketAttachments.ticketId, uniqueIds)).all();

  const attachmentIds = [...new Set(candidateRows.map((row) => row.id))].filter((attachmentId) => attachmentOnlyOwnedBy(database, attachmentId, ownerType, idSet));
  if (attachmentIds.length === 0) {
    return;
  }

  const records = attachmentRepository.findCleanupRecords(database, attachmentIds);
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

  const created = values.database.transaction((tx) => {
    const attachment = attachmentRepository.create(tx, {
      originalName: values.upload.originalName,
      filename,
      mimetype: values.upload.mimetype,
      size: values.upload.buffer.byteLength
    }, values.actor?.actorUserId ?? undefined);
    insertAttachmentLink(tx, values.owner, attachment.id);
    const attachmentObject = attachmentJournalObject(attachment);
    const ownerObject = getOwnerJournalObject(values.database, values.owner);
    recordJournalEntry(tx, {
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

function selectOwnerAttachments(database: DbClient, owner: AttachmentOwner): AttachmentRecord[] {
  if (owner.type === "project") {
    return database
      .select(attachmentSelect)
      .from(projectAttachments)
      .innerJoin(attachments, eq(projectAttachments.attachmentId, attachments.id))
      .where(eq(projectAttachments.projectId, owner.id))
      .orderBy(desc(attachments.createdAt))
      .all();
  }
  if (owner.type === "task") {
    return database
      .select(attachmentSelect)
      .from(taskAttachments)
      .innerJoin(attachments, eq(taskAttachments.attachmentId, attachments.id))
      .where(eq(taskAttachments.taskId, owner.id))
      .orderBy(desc(attachments.createdAt))
      .all();
  }
  if (owner.type === "milestone") {
    return database
      .select(attachmentSelect)
      .from(milestoneAttachments)
      .innerJoin(attachments, eq(milestoneAttachments.attachmentId, attachments.id))
      .where(eq(milestoneAttachments.milestoneId, owner.id))
      .orderBy(desc(attachments.createdAt))
      .all();
  }
  if (owner.type === "feature") {
    return database
      .select(attachmentSelect)
      .from(featureAttachments)
      .innerJoin(attachments, eq(featureAttachments.attachmentId, attachments.id))
      .where(eq(featureAttachments.featureId, owner.id))
      .orderBy(desc(attachments.createdAt))
      .all();
  }
  return database
    .select(attachmentSelect)
    .from(ticketAttachments)
    .innerJoin(attachments, eq(ticketAttachments.attachmentId, attachments.id))
    .where(eq(ticketAttachments.ticketId, owner.id))
    .orderBy(desc(attachments.createdAt))
    .all();
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

function collectAttachmentTaskDescendantIds(database: DbClient, rootIds: number[]): number[] {
  const result = new Set(rootIds);
  let frontier = [...new Set(rootIds)];
  while (frontier.length > 0) {
    const rows = database.select({ id: tasks.id }).from(tasks).where(inArray(tasks.parentId, frontier)).all();
    frontier = rows.map((row) => row.id).filter((id) => !result.has(id));
    for (const id of frontier) {
      result.add(id);
    }
  }
  return [...result];
}

function attachmentProjectMilestoneIds(database: DbClient, projectId: number): number[] {
  return database.select({ id: milestones.id }).from(milestones).where(eq(milestones.projectId, projectId)).all().map((row) => row.id);
}

function attachmentTaskIdsForOwner(database: DbClient, owner: RecentAttachmentOwner): number[] {
  if (owner.type === "task") {
    return [owner.id];
  }
  const direct =
    owner.type === "project"
      ? database.select({ id: projectTasks.taskId }).from(projectTasks).where(eq(projectTasks.ownerId, owner.id)).all().map((row) => row.id)
      : database.select({ id: milestoneTasks.taskId }).from(milestoneTasks).where(eq(milestoneTasks.ownerId, owner.id)).all().map((row) => row.id);
  if (owner.type === "project") {
    const milestoneIds = attachmentProjectMilestoneIds(database, owner.id);
    const milestoneLinked =
      milestoneIds.length === 0
        ? []
        : database.select({ id: milestoneTasks.taskId }).from(milestoneTasks).where(inArray(milestoneTasks.ownerId, milestoneIds)).all().map((row) => row.id);
    return collectAttachmentTaskDescendantIds(database, [...direct, ...milestoneLinked]);
  }
  return collectAttachmentTaskDescendantIds(database, direct);
}

function attachmentTicketIdsForOwner(database: DbClient, owner: RecentAttachmentOwner): number[] {
  if (owner.type === "task") {
    return [];
  }
  const direct =
    owner.type === "project"
      ? database.select({ id: projectTickets.ticketId }).from(projectTickets).where(eq(projectTickets.ownerId, owner.id)).all().map((row) => row.id)
      : database.select({ id: milestoneTickets.ticketId }).from(milestoneTickets).where(eq(milestoneTickets.ownerId, owner.id)).all().map((row) => row.id);
  if (owner.type === "project") {
    const milestoneIds = attachmentProjectMilestoneIds(database, owner.id);
    const milestoneLinked =
      milestoneIds.length === 0
        ? []
        : database.select({ id: milestoneTickets.ticketId }).from(milestoneTickets).where(inArray(milestoneTickets.ownerId, milestoneIds)).all().map((row) => row.id);
    return [...new Set([...direct, ...milestoneLinked])];
  }
  return [...new Set(direct)];
}

function mapRecentAttachmentRow(row: Omit<RecentAttachmentRow, "entityType">, entityType: JournalObjectType): RecentAttachmentRow {
  return { ...row, entityType };
}

function recentProjectAttachmentRows(database: DbClient, ids: number[], mineUserId?: number): RecentAttachmentRow[] {
  if (ids.length === 0) {
    return [];
  }
  return database
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
    .orderBy(desc(attachments.createdAt), desc(attachments.id))
    .all()
    .map((row) => mapRecentAttachmentRow(row, "project"));
}

function recentMilestoneAttachmentRows(database: DbClient, ids: number[], mineUserId?: number): RecentAttachmentRow[] {
  if (ids.length === 0) {
    return [];
  }
  return database
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
    .orderBy(desc(attachments.createdAt), desc(attachments.id))
    .all()
    .map((row) => mapRecentAttachmentRow(row, "milestone"));
}

function recentTaskAttachmentRows(database: DbClient, ids: number[], mineUserId?: number): RecentAttachmentRow[] {
  if (ids.length === 0) {
    return [];
  }
  return database
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
    .orderBy(desc(attachments.createdAt), desc(attachments.id))
    .all()
    .map((row) => mapRecentAttachmentRow(row, "task"));
}

function recentTicketAttachmentRows(database: DbClient, ids: number[], mineUserId?: number): RecentAttachmentRow[] {
  if (ids.length === 0) {
    return [];
  }
  return database
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
    .orderBy(desc(attachments.createdAt), desc(attachments.id))
    .all()
    .map((row) => mapRecentAttachmentRow(row, "ticket"));
}

function recentAttachmentRowsForOwner(database: DbClient, owner: RecentAttachmentOwner): RecentAttachmentRow[] {
  if (owner.type === "project") {
    const milestoneIds = attachmentProjectMilestoneIds(database, owner.id);
    return [
      ...recentProjectAttachmentRows(database, [owner.id]),
      ...recentMilestoneAttachmentRows(database, milestoneIds),
      ...recentTaskAttachmentRows(database, attachmentTaskIdsForOwner(database, owner)),
      ...recentTicketAttachmentRows(database, attachmentTicketIdsForOwner(database, owner))
    ];
  }
  if (owner.type === "milestone") {
    return [
      ...recentMilestoneAttachmentRows(database, [owner.id]),
      ...recentTaskAttachmentRows(database, attachmentTaskIdsForOwner(database, owner)),
      ...recentTicketAttachmentRows(database, attachmentTicketIdsForOwner(database, owner))
    ];
  }
  return recentTaskAttachmentRows(database, [owner.id]);
}

function recentOwnAttachmentRows(database: DbClient, userId: number): RecentAttachmentRow[] {
  return [
    ...recentProjectAttachmentRows(database, database.select({ id: projects.id }).from(projects).all().map((row) => row.id), userId),
    ...recentMilestoneAttachmentRows(database, database.select({ id: milestones.id }).from(milestones).all().map((row) => row.id), userId),
    ...recentTaskAttachmentRows(database, database.select({ id: tasks.id }).from(tasks).all().map((row) => row.id), userId),
    ...recentTicketAttachmentRows(database, database.select({ id: tickets.id }).from(tickets).all().map((row) => row.id), userId)
  ];
}

export function listRecentAttachments(database: DbClient, options: { owner?: RecentAttachmentOwner; currentUserId: number; limit?: number }): RecentAttachment[] {
  const limit = Math.max(1, Math.min(options.limit ?? 10, 50));
  const rows = options.owner ? recentAttachmentRowsForOwner(database, options.owner) : recentOwnAttachmentRows(database, options.currentUserId);
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

function listOwnerAttachments(database: DbClient, owner: AttachmentOwner): Attachment[] {
  ensureOwnerExists(database, owner);
  return selectOwnerAttachments(database, owner).map((attachment) => mapAttachment(database, attachment));
}

export function listProjectAttachments(database: DbClient, projectId: number): Attachment[] {
  return listOwnerAttachments(database, { type: "project", id: projectId });
}

export function listTaskAttachments(database: DbClient, taskId: number): Attachment[] {
  return listOwnerAttachments(database, { type: "task", id: taskId });
}

export function listMilestoneAttachments(database: DbClient, milestoneId: number): Attachment[] {
  return listOwnerAttachments(database, { type: "milestone", id: milestoneId });
}

export function listFeatureAttachments(database: DbClient, featureId: number): Attachment[] {
  return listOwnerAttachments(database, { type: "feature", id: featureId });
}

export function listTicketAttachments(database: DbClient, ticketId: number): Attachment[] {
  return listOwnerAttachments(database, { type: "ticket", id: ticketId });
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

export async function createProjectAttachment(database: DbClient, projectId: number, upload: AttachmentUpload, actor?: JournalActor | null): Promise<Attachment> {
  const owner = { type: "project" as const, id: projectId };
  ensureOwnerExists(database, owner);
  return persistAttachment({ database, owner, upload, actor });
}

export async function createTaskAttachment(database: DbClient, taskId: number, upload: AttachmentUpload, actor?: JournalActor | null): Promise<Attachment> {
  const owner = { type: "task" as const, id: taskId };
  ensureOwnerExists(database, owner);
  return persistAttachment({ database, owner, upload, actor });
}

export async function createMilestoneAttachment(database: DbClient, milestoneId: number, upload: AttachmentUpload, actor?: JournalActor | null): Promise<Attachment> {
  const owner = { type: "milestone" as const, id: milestoneId };
  ensureOwnerExists(database, owner);
  return persistAttachment({ database, owner, upload, actor });
}

export async function createFeatureAttachment(database: DbClient, featureId: number, upload: AttachmentUpload, actor?: JournalActor | null): Promise<Attachment> {
  const owner = { type: "feature" as const, id: featureId };
  ensureOwnerExists(database, owner);
  return persistAttachment({ database, owner, upload, actor });
}

export async function createTicketAttachment(database: DbClient, ticketId: number, upload: AttachmentUpload, actor?: JournalActor | null): Promise<Attachment> {
  const owner = { type: "ticket" as const, id: ticketId };
  ensureOwnerExists(database, owner);
  return persistAttachment({ database, owner, upload, actor });
}

export async function linkAttachment(database: DbClient, owner: AttachmentOwner, attachmentId: number, actor?: JournalActor | null): Promise<Attachment> {
  ensureOwnerExists(database, owner);
  const attachment = attachmentRepository.findById(database, attachmentId);
  if (!attachment) {
    throw notFound(`Attachment with id ${attachmentId} not found`);
  }
  const ownerObject = getOwnerJournalObject(database, owner);
  const attachmentObject = attachmentJournalObject(attachment);
  const alreadyLinked = listAttachmentOwners(database, attachmentId).some((currentOwner) => currentOwner.type === owner.type && currentOwner.id === owner.id);
  database.transaction((tx) => {
    insertAttachmentLink(tx, owner, attachmentId);
    if (!alreadyLinked) {
      recordJournalEntry(tx, {
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

export async function deleteAttachment(database: DbClient, id: number, actor?: JournalActor | null): Promise<void> {
  const record = attachmentRepository.findById(database, id);
  if (!record) {
    throw notFound(`Attachment with id ${id} not found`);
  }

  const ownerContexts = listAttachmentOwners(database, id).map((owner) => makeJournalContext(getOwnerJournalObject(database, owner), "owner"));
  database.transaction((tx) => {
    const journalObject = attachmentJournalObject(record);
    recordJournalEntry(tx, {
      operation: "delete",
      object: journalObject,
      summary: buildDeleteSummary(journalObject),
      actor,
      contexts: ownerContexts
    });
    attachmentRepository.deleteByIds(tx, [id]);
  });
  await removeAttachmentFiles([record]);
}

export async function openAttachment(database: DbClient, id: number, fileOpener: FileOpener): Promise<void> {
  const record = attachmentRepository.findById(database, id);
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
}
