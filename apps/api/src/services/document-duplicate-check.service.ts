import type {
  AttachmentFolder,
  DocumentDuplicateCheck,
  DocumentDuplicateCheckDocument,
  DocumentDuplicateCheckIssue,
  DocumentDuplicateCheckIssueKind,
  DocumentDuplicateGroup
} from "@taskmanager/shared-types";
import { and, asc, count, eq, gt, inArray, lte, max, sql } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import type { DbClient } from "../db/client.js";
import { attachmentFolders, attachments, folderAttachments } from "../db/schema.js";
import { assertSafeTestDirectoryPath } from "../runtime-safety.js";
import { conflict } from "../utils/errors.js";
import { listAttachmentOwnersForIds } from "./attachments.service.js";

const PAGE_SIZE = 100;
const FILE_CONCURRENCY = 4;

type DuplicateCheckRecord = Pick<
  typeof attachments.$inferSelect,
  "id" | "originalName" | "displayName" | "filename" | "size" | "createdAt"
>;

type MutableDuplicateCheck = DocumentDuplicateCheck;

interface InspectedDocument {
  hash: string;
  document: DocumentDuplicateCheckDocument;
}

const checks = new WeakMap<object, MutableDuplicateCheck>();

function emptyCheck(): DocumentDuplicateCheck {
  return {
    id: null,
    status: "idle",
    total: 0,
    processed: 0,
    startedAt: null,
    completedAt: null,
    groups: [],
    issues: [],
    error: null
  };
}

function snapshot(check: MutableDuplicateCheck | undefined): DocumentDuplicateCheck {
  if (!check) {
    return emptyCheck();
  }
  return {
    ...check,
    groups: check.groups.map((group) => ({ ...group, documents: [...group.documents] })),
    issues: [...check.issues]
  };
}

export function classifyDuplicateCheckFileError(error: unknown): DocumentDuplicateCheckIssueKind {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === "ENOENT" ? "missing" : "unreadable";
}

export function groupDuplicateCandidates(candidates: InspectedDocument[]): DocumentDuplicateGroup[] {
  const byHash = new Map<string, DocumentDuplicateCheckDocument[]>();
  for (const candidate of candidates) {
    const documents = byHash.get(candidate.hash);
    if (documents) {
      documents.push(candidate.document);
    } else {
      byHash.set(candidate.hash, [candidate.document]);
    }
  }

  return [...byHash.entries()]
    .filter(([, documents]) => documents.length > 1)
    .map(([hash, documents]) => ({ hash, documents: [...documents].sort((left, right) => left.id - right.id) }))
    .sort((left, right) => (left.documents[0]?.id ?? 0) - (right.documents[0]?.id ?? 0));
}

async function mapWithConcurrency<T, R>(items: T[], worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index]!);
    }
  }

  const workerCount = Math.min(FILE_CONCURRENCY, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

async function loadFoldersForIds(database: DbClient, attachmentIds: number[]): Promise<Map<number, AttachmentFolder>> {
  const result = new Map<number, AttachmentFolder>();
  if (attachmentIds.length === 0) {
    return result;
  }
  const rows = await database
    .select({
      attachmentId: folderAttachments.attachmentId,
      id: attachmentFolders.id,
      parentId: attachmentFolders.parentId,
      name: attachmentFolders.name,
      childCount: sql<number>`0`,
      directDocumentCount: sql<number>`0`,
      version: attachmentFolders.version
    })
    .from(folderAttachments)
    .innerJoin(attachmentFolders, eq(folderAttachments.folderId, attachmentFolders.id))
    .where(inArray(folderAttachments.attachmentId, attachmentIds));

  for (const { attachmentId, ...folder } of rows) {
    result.set(attachmentId, folder);
  }
  return result;
}

async function inspectDocument(
  record: DuplicateCheckRecord,
  folder: AttachmentFolder | null,
  owners: DocumentDuplicateCheckDocument["owners"]
): Promise<{ candidate?: InspectedDocument; issue?: DocumentDuplicateCheckIssue }> {
  const diskPath = path.join(config.uploadDir, record.filename);
  try {
    const before = await fs.stat(diskPath);
    const buffer = await fs.readFile(diskPath);
    const after = await fs.stat(diskPath);
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || after.size !== record.size) {
      return {
        issue: {
          attachmentId: record.id,
          originalName: record.originalName,
          kind: "changed",
          message: "Die Datei wurde während oder außerhalb des Prüflaufs verändert."
        }
      };
    }
    return {
      candidate: {
        hash: createHash("sha256").update(buffer).digest("hex"),
        document: {
          id: record.id,
          originalName: record.originalName,
          displayName: record.displayName,
          size: record.size,
          createdAt: record.createdAt,
          folder,
          owners
        }
      }
    };
  } catch (error) {
    const kind = classifyDuplicateCheckFileError(error);
    return {
      issue: {
        attachmentId: record.id,
        originalName: record.originalName,
        kind,
        message: kind === "missing" ? "Die Datei wurde nicht gefunden." : "Die Datei konnte nicht gelesen werden."
      }
    };
  }
}

async function executeDuplicateCheck(database: DbClient, check: MutableDuplicateCheck, maxAttachmentId: number): Promise<void> {
  const candidates: InspectedDocument[] = [];
  let cursor = 0;

  try {
    while (cursor < maxAttachmentId) {
      const records = await database
        .select({
          id: attachments.id,
          originalName: attachments.originalName,
          displayName: attachments.displayName,
          filename: attachments.filename,
          size: attachments.size,
          createdAt: attachments.createdAt
        })
        .from(attachments)
        .where(
          and(
            eq(attachments.kind, "document"),
            gt(attachments.id, cursor),
            lte(attachments.id, maxAttachmentId)
          )
        )
        .orderBy(asc(attachments.id))
        .limit(PAGE_SIZE);

      if (records.length === 0) {
        break;
      }

      const attachmentIds = records.map((record) => record.id);
      const [foldersByAttachment, ownersByAttachment] = await Promise.all([
        loadFoldersForIds(database, attachmentIds),
        listAttachmentOwnersForIds(database, attachmentIds)
      ]);
      const results = await mapWithConcurrency(records, async (record) => {
        const result = await inspectDocument(
          record,
          foldersByAttachment.get(record.id) ?? null,
          ownersByAttachment.get(record.id) ?? []
        );
        check.processed += 1;
        return result;
      });

      for (const result of results) {
        if (result.candidate) {
          candidates.push(result.candidate);
        }
        if (result.issue) {
          check.issues.push(result.issue);
        }
      }
      cursor = records.at(-1)!.id;
    }

    check.groups = groupDuplicateCandidates(candidates);
    check.issues.sort((left, right) => left.attachmentId - right.attachmentId);
    check.status = "completed";
    check.completedAt = new Date().toISOString();
  } catch {
    check.status = "failed";
    check.completedAt = new Date().toISOString();
    check.error = "Die Duplikatprüfung ist fehlgeschlagen.";
  }
}

export function getDocumentDuplicateCheck(database: DbClient): DocumentDuplicateCheck {
  return snapshot(checks.get(database));
}

export async function startDocumentDuplicateCheck(database: DbClient): Promise<DocumentDuplicateCheck> {
  const existing = checks.get(database);
  if (existing?.status === "running") {
    throw conflict("Eine Duplikatprüfung läuft bereits.");
  }

  assertSafeTestDirectoryPath(config.uploadDir, "UPLOAD_DIR");
  const [scope] = await database
    .select({ total: count(), maxAttachmentId: max(attachments.id) })
    .from(attachments)
    .where(eq(attachments.kind, "document"));
  const check: MutableDuplicateCheck = {
    id: randomUUID(),
    status: "running",
    total: Number(scope?.total ?? 0),
    processed: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
    groups: [],
    issues: [],
    error: null
  };
  checks.set(database, check);

  const maxAttachmentId = Number(scope?.maxAttachmentId ?? 0);
  if (maxAttachmentId === 0) {
    check.status = "completed";
    check.completedAt = new Date().toISOString();
  } else {
    void executeDuplicateCheck(database, check, maxAttachmentId);
  }
  return snapshot(check);
}
