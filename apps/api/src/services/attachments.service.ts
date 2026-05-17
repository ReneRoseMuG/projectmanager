import type { Attachment } from "@taskmanager/shared-types";
import { desc, eq, inArray } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import type { DbClient } from "../db/client.js";
import { attachments, features, projects, tasks, tickets } from "../db/schema.js";
import { assertSafeTestDirectoryPath } from "../runtime-safety.js";
import { notFound } from "../utils/errors.js";
import { removeAttachmentPreviews } from "./attachment-preview.service.js";

type AttachmentRecord = typeof attachments.$inferSelect;
type AttachmentCleanupRecord = Pick<AttachmentRecord, "id" | "filename">;

export interface AttachmentUpload {
  originalName: string;
  mimetype: string;
  buffer: Buffer;
}

function mapAttachment(record: AttachmentRecord): Attachment {
  return {
    id: record.id,
    projectId: record.projectId,
    taskId: record.taskId,
    featureId: record.featureId,
    ticketId: record.ticketId,
    originalName: record.originalName,
    filename: record.filename,
    mimetype: record.mimetype,
    size: record.size,
    url: `/uploads/${record.filename}`,
    createdAt: record.createdAt
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

function makeFilename(originalName: string): string {
  const extension = path.extname(originalName);
  return `${randomUUID()}${extension}`;
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

  database.delete(attachments).where(inArray(attachments.id, records.map((record) => record.id))).run();
  await removeAttachmentFiles(records);
}

async function persistAttachment(values: {
  database: DbClient;
  projectId?: number;
  taskId?: number;
  featureId?: number;
  ticketId?: number;
  upload: AttachmentUpload;
}): Promise<Attachment> {
  assertSafeTestDirectoryPath(config.uploadDir, "UPLOAD_DIR");
  await fs.mkdir(config.uploadDir, { recursive: true });

  const filename = makeFilename(values.upload.originalName);
  const diskPath = path.join(config.uploadDir, filename);
  await fs.writeFile(diskPath, values.upload.buffer);

  const created = values.database
    .insert(attachments)
    .values({
      projectId: values.projectId ?? null,
      taskId: values.taskId ?? null,
      featureId: values.featureId ?? null,
      ticketId: values.ticketId ?? null,
      originalName: values.upload.originalName,
      filename,
      mimetype: values.upload.mimetype,
      size: values.upload.buffer.byteLength
    })
    .returning()
    .get();

  return mapAttachment(created);
}

export function listProjectAttachments(database: DbClient, projectId: number): Attachment[] {
  ensureProjectExists(database, projectId);
  return database
    .select()
    .from(attachments)
    .where(eq(attachments.projectId, projectId))
    .orderBy(desc(attachments.createdAt))
    .all()
    .map(mapAttachment);
}

export function listTaskAttachments(database: DbClient, taskId: number): Attachment[] {
  ensureTaskExists(database, taskId);
  return database
    .select()
    .from(attachments)
    .where(eq(attachments.taskId, taskId))
    .orderBy(desc(attachments.createdAt))
    .all()
    .map(mapAttachment);
}

export function listFeatureAttachments(database: DbClient, featureId: number): Attachment[] {
  ensureFeatureExists(database, featureId);
  return database
    .select()
    .from(attachments)
    .where(eq(attachments.featureId, featureId))
    .orderBy(desc(attachments.createdAt))
    .all()
    .map(mapAttachment);
}

export function listTicketAttachments(database: DbClient, ticketId: number): Attachment[] {
  ensureTicketExists(database, ticketId);
  return database
    .select()
    .from(attachments)
    .where(eq(attachments.ticketId, ticketId))
    .orderBy(desc(attachments.createdAt))
    .all()
    .map(mapAttachment);
}

export async function deleteProjectAttachmentsForIds(database: DbClient, projectIds: number[]): Promise<void> {
  const uniqueIds = [...new Set(projectIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  const records = database.select({ id: attachments.id, filename: attachments.filename }).from(attachments).where(inArray(attachments.projectId, uniqueIds)).all();
  await deleteAttachmentRecords(database, records);
}

export async function deleteTaskAttachmentsForIds(database: DbClient, taskIds: number[]): Promise<void> {
  const uniqueIds = [...new Set(taskIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  const records = database.select({ id: attachments.id, filename: attachments.filename }).from(attachments).where(inArray(attachments.taskId, uniqueIds)).all();
  await deleteAttachmentRecords(database, records);
}

export async function deleteFeatureAttachmentsForIds(database: DbClient, featureIds: number[]): Promise<void> {
  const uniqueIds = [...new Set(featureIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  const records = database.select({ id: attachments.id, filename: attachments.filename }).from(attachments).where(inArray(attachments.featureId, uniqueIds)).all();
  await deleteAttachmentRecords(database, records);
}

export async function deleteTicketAttachmentsForIds(database: DbClient, ticketIds: number[]): Promise<void> {
  const uniqueIds = [...new Set(ticketIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  const records = database.select({ id: attachments.id, filename: attachments.filename }).from(attachments).where(inArray(attachments.ticketId, uniqueIds)).all();
  await deleteAttachmentRecords(database, records);
}

export async function createProjectAttachment(database: DbClient, projectId: number, upload: AttachmentUpload): Promise<Attachment> {
  ensureProjectExists(database, projectId);
  return persistAttachment({ database, projectId, upload });
}

export async function createTaskAttachment(database: DbClient, taskId: number, upload: AttachmentUpload): Promise<Attachment> {
  ensureTaskExists(database, taskId);
  return persistAttachment({ database, taskId, upload });
}

export async function createFeatureAttachment(database: DbClient, featureId: number, upload: AttachmentUpload): Promise<Attachment> {
  ensureFeatureExists(database, featureId);
  return persistAttachment({ database, featureId, upload });
}

export async function createTicketAttachment(database: DbClient, ticketId: number, upload: AttachmentUpload): Promise<Attachment> {
  ensureTicketExists(database, ticketId);
  return persistAttachment({ database, ticketId, upload });
}

export async function deleteAttachment(database: DbClient, id: number): Promise<void> {
  const record = database.select().from(attachments).where(eq(attachments.id, id)).get();
  if (!record) {
    throw notFound(`Attachment with id ${id} not found`);
  }

  await deleteAttachmentRecords(database, [record]);
}
