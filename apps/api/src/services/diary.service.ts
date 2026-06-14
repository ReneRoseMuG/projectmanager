import type { DiaryEntry, DiaryEntryInput, DiaryEntryUpdate } from "@taskmanager/shared-types";
import type { DbClient } from "../db/client.js";
import { diaryEntryRepository, type DiaryEntryRecord, type DiaryEntryUpdateData } from "../repositories/diary-entry.repository.js";
import { projectRepository } from "../repositories/project.repository.js";
import { conflict, notFound } from "../utils/errors.js";
import { requireNonEmpty } from "./helpers.js";

function mapDiaryEntry(record: DiaryEntryRecord): DiaryEntry {
  return {
    id: record.id,
    projectId: record.projectId,
    title: record.title,
    content: record.content ?? undefined,
    coveredUntil: record.coveredUntil,
    sourceCount: record.sourceCount,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

async function ensureProjectExists(database: DbClient, projectId: number): Promise<void> {
  const project = await projectRepository.findById(database, projectId);
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
}

export async function getProjectDiary(database: DbClient, projectId: number): Promise<DiaryEntry | null> {
  await ensureProjectExists(database, projectId);
  const record = await diaryEntryRepository.findByProjectId(database, projectId);
  return record ? mapDiaryEntry(record) : null;
}

// Direktzugriff per Eintrags-id; nötig, damit der versionsgeschützte Update-Pfad
// (GET+PATCH auf /diary/:id) symmetrisch ist.
export async function getDiaryEntryById(database: DbClient, id: number): Promise<DiaryEntry> {
  const record = await diaryEntryRepository.findById(database, id);
  if (!record) {
    throw notFound(`Diary entry with id ${id} not found`);
  }
  return mapDiaryEntry(record);
}

export async function createProjectDiary(database: DbClient, projectId: number, input: DiaryEntryInput, userId?: number): Promise<DiaryEntry> {
  await ensureProjectExists(database, projectId);
  const title = requireNonEmpty(input.title, "title");
  // Genau ein lebender Eintrag pro Projekt: ein zweiter POST ist ein Konflikt (409),
  // zusätzlich abgesichert durch den Unique-Index auf project_id.
  const existing = await diaryEntryRepository.findByProjectId(database, projectId);
  if (existing) {
    throw conflict(`Project ${projectId} already has a diary entry`);
  }
  // Bewusst KEIN Journal-Eintrag fürs Tagebuch: Das Tagebuch ist eine reine Erzaehlschicht
  // ueber dem Journal. Ein eigener Journal-Eintrag wuerde eine Rueckkopplung erzeugen
  // (Tagebuch-Aenderung -> Journal-Ereignis -> fliesst wieder ins Tagebuch). FT(16)/MS-70.
  const created = await diaryEntryRepository.create(
    database,
    {
      projectId,
      title,
      content: input.content ?? null,
      coveredUntil: input.coveredUntil ?? null,
      sourceCount: input.sourceCount ?? 0
    },
    userId
  );
  return mapDiaryEntry(created);
}

export async function updateDiaryEntry(database: DbClient, id: number, input: DiaryEntryUpdate, userId?: number): Promise<DiaryEntry> {
  const data: DiaryEntryUpdateData = {};
  if (input.title !== undefined) {
    data.title = requireNonEmpty(input.title, "title");
  }
  if (input.content !== undefined) {
    data.content = input.content;
  }
  if (input.coveredUntil !== undefined) {
    data.coveredUntil = input.coveredUntil;
  }
  if (input.sourceCount !== undefined) {
    data.sourceCount = input.sourceCount;
  }
  const updated = await diaryEntryRepository.update(database, id, input.expectedVersion, data, userId);
  if (!updated) {
    throw notFound(`Diary entry with id ${id} not found`);
  }
  return mapDiaryEntry(updated);
}
