import { and, eq } from "drizzle-orm";
import type { AttachmentOwner } from "@taskmanager/shared-types";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import { attachmentLocalFolders } from "../db/schema.js";

export type AttachmentLocalFolderRecord = typeof attachmentLocalFolders.$inferSelect;

interface AttachmentLocalFolderCreateData {
  owner: AttachmentOwner;
  name: string;
  rootPath: string;
  rootPathHash: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

export const attachmentLocalFolderRepository = {
  async findById(database: DbSession, id: number): Promise<AttachmentLocalFolderRecord | undefined> {
    return firstRow(
      await database.select().from(attachmentLocalFolders).where(eq(attachmentLocalFolders.id, id))
    );
  },

  async findByOwner(database: DbSession, owner: AttachmentOwner): Promise<AttachmentLocalFolderRecord[]> {
    return database
      .select()
      .from(attachmentLocalFolders)
      .where(
        and(
          eq(attachmentLocalFolders.ownerType, owner.type),
          eq(attachmentLocalFolders.ownerId, owner.id)
        )
      )
      .orderBy(attachmentLocalFolders.name);
  },

  async findByOwnerAndPathHash(
    database: DbSession,
    owner: AttachmentOwner,
    rootPathHash: string
  ): Promise<AttachmentLocalFolderRecord | undefined> {
    return firstRow(
      await database
        .select()
        .from(attachmentLocalFolders)
        .where(
          and(
            eq(attachmentLocalFolders.ownerType, owner.type),
            eq(attachmentLocalFolders.ownerId, owner.id),
            eq(attachmentLocalFolders.rootPathHash, rootPathHash)
          )
        )
    );
  },

  async create(
    database: DbSession,
    data: AttachmentLocalFolderCreateData,
    userId?: number
  ): Promise<AttachmentLocalFolderRecord> {
    const now = nowIso();
    const result = await database.insert(attachmentLocalFolders).values({
      ownerType: data.owner.type,
      ownerId: data.owner.id,
      name: data.name,
      rootPath: data.rootPath,
      rootPathHash: data.rootPathHash,
      version: 1,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
      createdAt: now,
      updatedAt: now
    });
    const created = await this.findById(database, insertId(result));
    if (!created) {
      throw new Error("Created local attachment folder could not be loaded");
    }
    return created;
  },

  async deleteVersioned(database: DbSession, id: number, expectedVersion: number): Promise<number> {
    return mutationAffectedRows(
      await database
        .delete(attachmentLocalFolders)
        .where(
          and(
            eq(attachmentLocalFolders.id, id),
            eq(attachmentLocalFolders.version, expectedVersion)
          )
        )
    );
  }
};
