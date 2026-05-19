import type { Attachment, AttachmentOwner } from "@taskmanager/shared-types";
import { desc, eq, inArray } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import type { DbClient } from "../db/client.js";
import { attachments, featureAttachments, features, projectAttachments, projects, taskAttachments, tasks, ticketAttachments, tickets } from "../db/schema.js";
import { attachmentRepository, type AttachmentRecord } from "../repositories/attachment.repository.js";
import { assertSafeTestDirectoryPath } from "../runtime-safety.js";
import { notFound } from "../utils/errors.js";
import { removeAttachmentPreviews } from "./attachment-preview.service.js";

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
  if (owner.type === "feature") {
    ensureFeatureExists(database, owner.id);
    return;
  }
  ensureTicketExists(database, owner.id);
}

function makeFilename(originalName: string): string {
  const extension = path.extname(originalName);
  return `${randomUUID()}${extension}`;
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

function insertAttachmentLink(database: DbClient, owner: AttachmentOwner, attachmentId: number): void {
  if (owner.type === "project") {
    database.insert(projectAttachments).values({ projectId: owner.id, attachmentId }).onConflictDoNothing().run();
    return;
  }
  if (owner.type === "task") {
    database.insert(taskAttachments).values({ taskId: owner.id, attachmentId }).onConflictDoNothing().run();
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
}): Promise<Attachment> {
  assertSafeTestDirectoryPath(config.uploadDir, "UPLOAD_DIR");
  await fs.mkdir(config.uploadDir, { recursive: true });

  const filename = makeFilename(values.upload.originalName);
  const diskPath = path.join(config.uploadDir, filename);
  await fs.writeFile(diskPath, values.upload.buffer);

  const created = values.database.transaction((tx) => {
    const attachment = attachmentRepository.create(tx as unknown as DbClient, {
      originalName: values.upload.originalName,
      filename,
      mimetype: values.upload.mimetype,
      size: values.upload.buffer.byteLength
    });
    insertAttachmentLink(tx, values.owner, attachment.id);
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

export async function deleteFeatureAttachmentsForIds(database: DbClient, featureIds: number[]): Promise<void> {
  await deleteAttachmentsOwnedOnlyBy(database, "feature", featureIds);
}

export async function deleteTicketAttachmentsForIds(database: DbClient, ticketIds: number[]): Promise<void> {
  await deleteAttachmentsOwnedOnlyBy(database, "ticket", ticketIds);
}

export async function createProjectAttachment(database: DbClient, projectId: number, upload: AttachmentUpload): Promise<Attachment> {
  const owner = { type: "project" as const, id: projectId };
  ensureOwnerExists(database, owner);
  return persistAttachment({ database, owner, upload });
}

export async function createTaskAttachment(database: DbClient, taskId: number, upload: AttachmentUpload): Promise<Attachment> {
  const owner = { type: "task" as const, id: taskId };
  ensureOwnerExists(database, owner);
  return persistAttachment({ database, owner, upload });
}

export async function createFeatureAttachment(database: DbClient, featureId: number, upload: AttachmentUpload): Promise<Attachment> {
  const owner = { type: "feature" as const, id: featureId };
  ensureOwnerExists(database, owner);
  return persistAttachment({ database, owner, upload });
}

export async function createTicketAttachment(database: DbClient, ticketId: number, upload: AttachmentUpload): Promise<Attachment> {
  const owner = { type: "ticket" as const, id: ticketId };
  ensureOwnerExists(database, owner);
  return persistAttachment({ database, owner, upload });
}

export async function linkAttachment(database: DbClient, owner: AttachmentOwner, attachmentId: number): Promise<Attachment> {
  ensureOwnerExists(database, owner);
  const attachment = attachmentRepository.findById(database, attachmentId);
  if (!attachment) {
    throw notFound(`Attachment with id ${attachmentId} not found`);
  }
  insertAttachmentLink(database, owner, attachmentId);
  return mapAttachment(database, attachment);
}

export async function deleteAttachment(database: DbClient, id: number): Promise<void> {
  const record = attachmentRepository.findById(database, id);
  if (!record) {
    throw notFound(`Attachment with id ${id} not found`);
  }

  await deleteAttachmentRecords(database, [record]);
}
