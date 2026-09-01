import type { AttachmentOwner } from "@taskmanager/shared-types";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import {
  featureAttachmentFolders,
  featureAttachments,
  featureDocumentLinks,
  milestoneAttachmentFolders,
  milestoneAttachments,
  milestoneDocumentLinks,
  projectAttachmentFolders,
  projectAttachments,
  projectDocumentLinks,
  taskAttachmentFolders,
  taskAttachments,
  taskDocumentLinks,
  ticketAttachmentFolders,
  ticketAttachments,
  ticketDocumentLinks,
  wikiPageAttachmentFolders,
  wikiPageAttachments,
  wikiPageDocumentLinks
} from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export interface ParentFolderRecord {
  id: number;
  ownerId: number;
  parentId: number | null;
  name: string;
  version: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParentDocumentLinkRecord {
  id: number;
  ownerId: number;
  documentId: number;
  folderId: number | null;
  version: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParentAttachmentFolderAssignment {
  attachmentId: number;
  folderId: number | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function listFolders(database: DbSession, owner: AttachmentOwner): Promise<ParentFolderRecord[]> {
  if (owner.type === "project") return database.select().from(projectAttachmentFolders).where(eq(projectAttachmentFolders.ownerId, owner.id)).orderBy(projectAttachmentFolders.name);
  if (owner.type === "milestone") return database.select().from(milestoneAttachmentFolders).where(eq(milestoneAttachmentFolders.ownerId, owner.id)).orderBy(milestoneAttachmentFolders.name);
  if (owner.type === "task") return database.select().from(taskAttachmentFolders).where(eq(taskAttachmentFolders.ownerId, owner.id)).orderBy(taskAttachmentFolders.name);
  if (owner.type === "feature") return database.select().from(featureAttachmentFolders).where(eq(featureAttachmentFolders.ownerId, owner.id)).orderBy(featureAttachmentFolders.name);
  if (owner.type === "wikiPage") return database.select().from(wikiPageAttachmentFolders).where(eq(wikiPageAttachmentFolders.ownerId, owner.id)).orderBy(wikiPageAttachmentFolders.name);
  return database.select().from(ticketAttachmentFolders).where(eq(ticketAttachmentFolders.ownerId, owner.id)).orderBy(ticketAttachmentFolders.name);
}

async function findFolder(database: DbSession, owner: AttachmentOwner, id: number): Promise<ParentFolderRecord | undefined> {
  if (owner.type === "project") return firstRow(await database.select().from(projectAttachmentFolders).where(and(eq(projectAttachmentFolders.id, id), eq(projectAttachmentFolders.ownerId, owner.id))));
  if (owner.type === "milestone") return firstRow(await database.select().from(milestoneAttachmentFolders).where(and(eq(milestoneAttachmentFolders.id, id), eq(milestoneAttachmentFolders.ownerId, owner.id))));
  if (owner.type === "task") return firstRow(await database.select().from(taskAttachmentFolders).where(and(eq(taskAttachmentFolders.id, id), eq(taskAttachmentFolders.ownerId, owner.id))));
  if (owner.type === "feature") return firstRow(await database.select().from(featureAttachmentFolders).where(and(eq(featureAttachmentFolders.id, id), eq(featureAttachmentFolders.ownerId, owner.id))));
  if (owner.type === "wikiPage") return firstRow(await database.select().from(wikiPageAttachmentFolders).where(and(eq(wikiPageAttachmentFolders.id, id), eq(wikiPageAttachmentFolders.ownerId, owner.id))));
  return firstRow(await database.select().from(ticketAttachmentFolders).where(and(eq(ticketAttachmentFolders.id, id), eq(ticketAttachmentFolders.ownerId, owner.id))));
}

async function findFolderSibling(database: DbSession, owner: AttachmentOwner, parentId: number | null, name: string): Promise<ParentFolderRecord | undefined> {
  const parentCondition = <TColumn>(column: TColumn) => parentId === null ? isNull(column as never) : eq(column as never, parentId);
  if (owner.type === "project") return firstRow(await database.select().from(projectAttachmentFolders).where(and(eq(projectAttachmentFolders.ownerId, owner.id), parentCondition(projectAttachmentFolders.parentId), eq(projectAttachmentFolders.name, name))));
  if (owner.type === "milestone") return firstRow(await database.select().from(milestoneAttachmentFolders).where(and(eq(milestoneAttachmentFolders.ownerId, owner.id), parentCondition(milestoneAttachmentFolders.parentId), eq(milestoneAttachmentFolders.name, name))));
  if (owner.type === "task") return firstRow(await database.select().from(taskAttachmentFolders).where(and(eq(taskAttachmentFolders.ownerId, owner.id), parentCondition(taskAttachmentFolders.parentId), eq(taskAttachmentFolders.name, name))));
  if (owner.type === "feature") return firstRow(await database.select().from(featureAttachmentFolders).where(and(eq(featureAttachmentFolders.ownerId, owner.id), parentCondition(featureAttachmentFolders.parentId), eq(featureAttachmentFolders.name, name))));
  if (owner.type === "wikiPage") return firstRow(await database.select().from(wikiPageAttachmentFolders).where(and(eq(wikiPageAttachmentFolders.ownerId, owner.id), parentCondition(wikiPageAttachmentFolders.parentId), eq(wikiPageAttachmentFolders.name, name))));
  return firstRow(await database.select().from(ticketAttachmentFolders).where(and(eq(ticketAttachmentFolders.ownerId, owner.id), parentCondition(ticketAttachmentFolders.parentId), eq(ticketAttachmentFolders.name, name))));
}

async function createFolder(database: DbSession, owner: AttachmentOwner, data: { name: string; parentId: number | null }, userId?: number): Promise<ParentFolderRecord> {
  const now = nowIso();
  const values = { ownerId: owner.id, name: data.name, parentId: data.parentId, version: 1, createdBy: userId ?? null, updatedBy: userId ?? null, createdAt: now, updatedAt: now };
  let id: number;
  if (owner.type === "project") id = insertId(await database.insert(projectAttachmentFolders).values(values));
  else if (owner.type === "milestone") id = insertId(await database.insert(milestoneAttachmentFolders).values(values));
  else if (owner.type === "task") id = insertId(await database.insert(taskAttachmentFolders).values(values));
  else if (owner.type === "feature") id = insertId(await database.insert(featureAttachmentFolders).values(values));
  else if (owner.type === "wikiPage") id = insertId(await database.insert(wikiPageAttachmentFolders).values(values));
  else id = insertId(await database.insert(ticketAttachmentFolders).values(values));
  const created = await findFolder(database, owner, id);
  if (!created) throw new Error("Created parent attachment folder could not be loaded");
  return created;
}

async function updateFolder(database: DbSession, owner: AttachmentOwner, id: number, expectedVersion: number, data: { name?: string; parentId?: number | null }, userId?: number): Promise<ParentFolderRecord | undefined> {
  const current = await findFolder(database, owner, id);
  if (!current) return undefined;
  assertVersion(current.version, expectedVersion);
  const values = { ...data, version: current.version + 1, updatedBy: userId ?? null, updatedAt: nowIso() };
  let changed: number;
  if (owner.type === "project") changed = mutationAffectedRows(await database.update(projectAttachmentFolders).set(values).where(and(eq(projectAttachmentFolders.id, id), eq(projectAttachmentFolders.ownerId, owner.id), eq(projectAttachmentFolders.version, expectedVersion))));
  else if (owner.type === "milestone") changed = mutationAffectedRows(await database.update(milestoneAttachmentFolders).set(values).where(and(eq(milestoneAttachmentFolders.id, id), eq(milestoneAttachmentFolders.ownerId, owner.id), eq(milestoneAttachmentFolders.version, expectedVersion))));
  else if (owner.type === "task") changed = mutationAffectedRows(await database.update(taskAttachmentFolders).set(values).where(and(eq(taskAttachmentFolders.id, id), eq(taskAttachmentFolders.ownerId, owner.id), eq(taskAttachmentFolders.version, expectedVersion))));
  else if (owner.type === "feature") changed = mutationAffectedRows(await database.update(featureAttachmentFolders).set(values).where(and(eq(featureAttachmentFolders.id, id), eq(featureAttachmentFolders.ownerId, owner.id), eq(featureAttachmentFolders.version, expectedVersion))));
  else if (owner.type === "wikiPage") changed = mutationAffectedRows(await database.update(wikiPageAttachmentFolders).set(values).where(and(eq(wikiPageAttachmentFolders.id, id), eq(wikiPageAttachmentFolders.ownerId, owner.id), eq(wikiPageAttachmentFolders.version, expectedVersion))));
  else changed = mutationAffectedRows(await database.update(ticketAttachmentFolders).set(values).where(and(eq(ticketAttachmentFolders.id, id), eq(ticketAttachmentFolders.ownerId, owner.id), eq(ticketAttachmentFolders.version, expectedVersion))));
  return changed === 0 ? undefined : findFolder(database, owner, id);
}

async function deleteFolder(database: DbSession, owner: AttachmentOwner, id: number, expectedVersion: number): Promise<number> {
  if (owner.type === "project") return mutationAffectedRows(await database.delete(projectAttachmentFolders).where(and(eq(projectAttachmentFolders.id, id), eq(projectAttachmentFolders.ownerId, owner.id), eq(projectAttachmentFolders.version, expectedVersion))));
  if (owner.type === "milestone") return mutationAffectedRows(await database.delete(milestoneAttachmentFolders).where(and(eq(milestoneAttachmentFolders.id, id), eq(milestoneAttachmentFolders.ownerId, owner.id), eq(milestoneAttachmentFolders.version, expectedVersion))));
  if (owner.type === "task") return mutationAffectedRows(await database.delete(taskAttachmentFolders).where(and(eq(taskAttachmentFolders.id, id), eq(taskAttachmentFolders.ownerId, owner.id), eq(taskAttachmentFolders.version, expectedVersion))));
  if (owner.type === "feature") return mutationAffectedRows(await database.delete(featureAttachmentFolders).where(and(eq(featureAttachmentFolders.id, id), eq(featureAttachmentFolders.ownerId, owner.id), eq(featureAttachmentFolders.version, expectedVersion))));
  if (owner.type === "wikiPage") return mutationAffectedRows(await database.delete(wikiPageAttachmentFolders).where(and(eq(wikiPageAttachmentFolders.id, id), eq(wikiPageAttachmentFolders.ownerId, owner.id), eq(wikiPageAttachmentFolders.version, expectedVersion))));
  return mutationAffectedRows(await database.delete(ticketAttachmentFolders).where(and(eq(ticketAttachmentFolders.id, id), eq(ticketAttachmentFolders.ownerId, owner.id), eq(ticketAttachmentFolders.version, expectedVersion))));
}

async function listAttachmentFolderAssignments(database: DbSession, owner: AttachmentOwner): Promise<ParentAttachmentFolderAssignment[]> {
  if (owner.type === "project") return database.select({ attachmentId: projectAttachments.attachmentId, folderId: projectAttachments.folderId }).from(projectAttachments).where(eq(projectAttachments.projectId, owner.id));
  if (owner.type === "milestone") return database.select({ attachmentId: milestoneAttachments.attachmentId, folderId: milestoneAttachments.folderId }).from(milestoneAttachments).where(eq(milestoneAttachments.milestoneId, owner.id));
  if (owner.type === "task") return database.select({ attachmentId: taskAttachments.attachmentId, folderId: taskAttachments.folderId }).from(taskAttachments).where(eq(taskAttachments.taskId, owner.id));
  if (owner.type === "feature") return database.select({ attachmentId: featureAttachments.attachmentId, folderId: featureAttachments.folderId }).from(featureAttachments).where(eq(featureAttachments.featureId, owner.id));
  if (owner.type === "wikiPage") return database.select({ attachmentId: wikiPageAttachments.attachmentId, folderId: wikiPageAttachments.folderId }).from(wikiPageAttachments).where(eq(wikiPageAttachments.wikiPageId, owner.id));
  return database.select({ attachmentId: ticketAttachments.attachmentId, folderId: ticketAttachments.folderId }).from(ticketAttachments).where(eq(ticketAttachments.ticketId, owner.id));
}

async function setAttachmentFolder(database: DbSession, owner: AttachmentOwner, attachmentId: number, folderId: number | null): Promise<number> {
  if (owner.type === "project") return mutationAffectedRows(await database.update(projectAttachments).set({ folderId }).where(and(eq(projectAttachments.projectId, owner.id), eq(projectAttachments.attachmentId, attachmentId))));
  if (owner.type === "milestone") return mutationAffectedRows(await database.update(milestoneAttachments).set({ folderId }).where(and(eq(milestoneAttachments.milestoneId, owner.id), eq(milestoneAttachments.attachmentId, attachmentId))));
  if (owner.type === "task") return mutationAffectedRows(await database.update(taskAttachments).set({ folderId }).where(and(eq(taskAttachments.taskId, owner.id), eq(taskAttachments.attachmentId, attachmentId))));
  if (owner.type === "feature") return mutationAffectedRows(await database.update(featureAttachments).set({ folderId }).where(and(eq(featureAttachments.featureId, owner.id), eq(featureAttachments.attachmentId, attachmentId))));
  if (owner.type === "wikiPage") return mutationAffectedRows(await database.update(wikiPageAttachments).set({ folderId }).where(and(eq(wikiPageAttachments.wikiPageId, owner.id), eq(wikiPageAttachments.attachmentId, attachmentId))));
  return mutationAffectedRows(await database.update(ticketAttachments).set({ folderId }).where(and(eq(ticketAttachments.ticketId, owner.id), eq(ticketAttachments.attachmentId, attachmentId))));
}

async function listDocumentLinks(database: DbSession, owner: AttachmentOwner): Promise<ParentDocumentLinkRecord[]> {
  if (owner.type === "project") return database.select().from(projectDocumentLinks).where(eq(projectDocumentLinks.ownerId, owner.id)).orderBy(desc(projectDocumentLinks.createdAt));
  if (owner.type === "milestone") return database.select().from(milestoneDocumentLinks).where(eq(milestoneDocumentLinks.ownerId, owner.id)).orderBy(desc(milestoneDocumentLinks.createdAt));
  if (owner.type === "task") return database.select().from(taskDocumentLinks).where(eq(taskDocumentLinks.ownerId, owner.id)).orderBy(desc(taskDocumentLinks.createdAt));
  if (owner.type === "feature") return database.select().from(featureDocumentLinks).where(eq(featureDocumentLinks.ownerId, owner.id)).orderBy(desc(featureDocumentLinks.createdAt));
  if (owner.type === "wikiPage") return database.select().from(wikiPageDocumentLinks).where(eq(wikiPageDocumentLinks.ownerId, owner.id)).orderBy(desc(wikiPageDocumentLinks.createdAt));
  return database.select().from(ticketDocumentLinks).where(eq(ticketDocumentLinks.ownerId, owner.id)).orderBy(desc(ticketDocumentLinks.createdAt));
}

async function findDocumentLink(database: DbSession, owner: AttachmentOwner, id: number): Promise<ParentDocumentLinkRecord | undefined> {
  if (owner.type === "project") return firstRow(await database.select().from(projectDocumentLinks).where(and(eq(projectDocumentLinks.id, id), eq(projectDocumentLinks.ownerId, owner.id))));
  if (owner.type === "milestone") return firstRow(await database.select().from(milestoneDocumentLinks).where(and(eq(milestoneDocumentLinks.id, id), eq(milestoneDocumentLinks.ownerId, owner.id))));
  if (owner.type === "task") return firstRow(await database.select().from(taskDocumentLinks).where(and(eq(taskDocumentLinks.id, id), eq(taskDocumentLinks.ownerId, owner.id))));
  if (owner.type === "feature") return firstRow(await database.select().from(featureDocumentLinks).where(and(eq(featureDocumentLinks.id, id), eq(featureDocumentLinks.ownerId, owner.id))));
  if (owner.type === "wikiPage") return firstRow(await database.select().from(wikiPageDocumentLinks).where(and(eq(wikiPageDocumentLinks.id, id), eq(wikiPageDocumentLinks.ownerId, owner.id))));
  return firstRow(await database.select().from(ticketDocumentLinks).where(and(eq(ticketDocumentLinks.id, id), eq(ticketDocumentLinks.ownerId, owner.id))));
}

async function findDocumentLinkByDocument(database: DbSession, owner: AttachmentOwner, documentId: number): Promise<ParentDocumentLinkRecord | undefined> {
  if (owner.type === "project") return firstRow(await database.select().from(projectDocumentLinks).where(and(eq(projectDocumentLinks.ownerId, owner.id), eq(projectDocumentLinks.documentId, documentId))));
  if (owner.type === "milestone") return firstRow(await database.select().from(milestoneDocumentLinks).where(and(eq(milestoneDocumentLinks.ownerId, owner.id), eq(milestoneDocumentLinks.documentId, documentId))));
  if (owner.type === "task") return firstRow(await database.select().from(taskDocumentLinks).where(and(eq(taskDocumentLinks.ownerId, owner.id), eq(taskDocumentLinks.documentId, documentId))));
  if (owner.type === "feature") return firstRow(await database.select().from(featureDocumentLinks).where(and(eq(featureDocumentLinks.ownerId, owner.id), eq(featureDocumentLinks.documentId, documentId))));
  if (owner.type === "wikiPage") return firstRow(await database.select().from(wikiPageDocumentLinks).where(and(eq(wikiPageDocumentLinks.ownerId, owner.id), eq(wikiPageDocumentLinks.documentId, documentId))));
  return firstRow(await database.select().from(ticketDocumentLinks).where(and(eq(ticketDocumentLinks.ownerId, owner.id), eq(ticketDocumentLinks.documentId, documentId))));
}

async function createDocumentLink(database: DbSession, owner: AttachmentOwner, documentId: number, folderId: number | null, userId?: number): Promise<ParentDocumentLinkRecord> {
  const now = nowIso();
  const values = { ownerId: owner.id, documentId, folderId, version: 1, createdBy: userId ?? null, updatedBy: userId ?? null, createdAt: now, updatedAt: now };
  let id: number;
  if (owner.type === "project") id = insertId(await database.insert(projectDocumentLinks).values(values));
  else if (owner.type === "milestone") id = insertId(await database.insert(milestoneDocumentLinks).values(values));
  else if (owner.type === "task") id = insertId(await database.insert(taskDocumentLinks).values(values));
  else if (owner.type === "feature") id = insertId(await database.insert(featureDocumentLinks).values(values));
  else if (owner.type === "wikiPage") id = insertId(await database.insert(wikiPageDocumentLinks).values(values));
  else id = insertId(await database.insert(ticketDocumentLinks).values(values));
  const created = await findDocumentLink(database, owner, id);
  if (!created) throw new Error("Created parent document link could not be loaded");
  return created;
}

async function updateDocumentLinkFolder(database: DbSession, owner: AttachmentOwner, id: number, expectedVersion: number, folderId: number | null, userId?: number): Promise<ParentDocumentLinkRecord | undefined> {
  const current = await findDocumentLink(database, owner, id);
  if (!current) return undefined;
  assertVersion(current.version, expectedVersion);
  const values = { folderId, version: current.version + 1, updatedBy: userId ?? null, updatedAt: nowIso() };
  let changed: number;
  if (owner.type === "project") changed = mutationAffectedRows(await database.update(projectDocumentLinks).set(values).where(and(eq(projectDocumentLinks.id, id), eq(projectDocumentLinks.ownerId, owner.id), eq(projectDocumentLinks.version, expectedVersion))));
  else if (owner.type === "milestone") changed = mutationAffectedRows(await database.update(milestoneDocumentLinks).set(values).where(and(eq(milestoneDocumentLinks.id, id), eq(milestoneDocumentLinks.ownerId, owner.id), eq(milestoneDocumentLinks.version, expectedVersion))));
  else if (owner.type === "task") changed = mutationAffectedRows(await database.update(taskDocumentLinks).set(values).where(and(eq(taskDocumentLinks.id, id), eq(taskDocumentLinks.ownerId, owner.id), eq(taskDocumentLinks.version, expectedVersion))));
  else if (owner.type === "feature") changed = mutationAffectedRows(await database.update(featureDocumentLinks).set(values).where(and(eq(featureDocumentLinks.id, id), eq(featureDocumentLinks.ownerId, owner.id), eq(featureDocumentLinks.version, expectedVersion))));
  else if (owner.type === "wikiPage") changed = mutationAffectedRows(await database.update(wikiPageDocumentLinks).set(values).where(and(eq(wikiPageDocumentLinks.id, id), eq(wikiPageDocumentLinks.ownerId, owner.id), eq(wikiPageDocumentLinks.version, expectedVersion))));
  else changed = mutationAffectedRows(await database.update(ticketDocumentLinks).set(values).where(and(eq(ticketDocumentLinks.id, id), eq(ticketDocumentLinks.ownerId, owner.id), eq(ticketDocumentLinks.version, expectedVersion))));
  return changed === 0 ? undefined : findDocumentLink(database, owner, id);
}

async function deleteDocumentLink(database: DbSession, owner: AttachmentOwner, id: number, expectedVersion: number): Promise<number> {
  if (owner.type === "project") return mutationAffectedRows(await database.delete(projectDocumentLinks).where(and(eq(projectDocumentLinks.id, id), eq(projectDocumentLinks.ownerId, owner.id), eq(projectDocumentLinks.version, expectedVersion))));
  if (owner.type === "milestone") return mutationAffectedRows(await database.delete(milestoneDocumentLinks).where(and(eq(milestoneDocumentLinks.id, id), eq(milestoneDocumentLinks.ownerId, owner.id), eq(milestoneDocumentLinks.version, expectedVersion))));
  if (owner.type === "task") return mutationAffectedRows(await database.delete(taskDocumentLinks).where(and(eq(taskDocumentLinks.id, id), eq(taskDocumentLinks.ownerId, owner.id), eq(taskDocumentLinks.version, expectedVersion))));
  if (owner.type === "feature") return mutationAffectedRows(await database.delete(featureDocumentLinks).where(and(eq(featureDocumentLinks.id, id), eq(featureDocumentLinks.ownerId, owner.id), eq(featureDocumentLinks.version, expectedVersion))));
  if (owner.type === "wikiPage") return mutationAffectedRows(await database.delete(wikiPageDocumentLinks).where(and(eq(wikiPageDocumentLinks.id, id), eq(wikiPageDocumentLinks.ownerId, owner.id), eq(wikiPageDocumentLinks.version, expectedVersion))));
  return mutationAffectedRows(await database.delete(ticketDocumentLinks).where(and(eq(ticketDocumentLinks.id, id), eq(ticketDocumentLinks.ownerId, owner.id), eq(ticketDocumentLinks.version, expectedVersion))));
}

export const parentFileRepository = {
  listFolders,
  findFolder,
  findFolderSibling,
  createFolder,
  updateFolder,
  deleteFolder,
  listAttachmentFolderAssignments,
  setAttachmentFolder,
  listDocumentLinks,
  findDocumentLink,
  findDocumentLinkByDocument,
  createDocumentLink,
  updateDocumentLinkFolder,
  deleteDocumentLink
};
