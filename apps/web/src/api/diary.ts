import type { DiaryEntry } from "@taskmanager/shared-types";
import { api } from "./client";

// Liefert den einen Tagebuch-Eintrag des Projekts oder null, wenn noch keiner existiert.
export async function getProjectDiary(projectId: number): Promise<DiaryEntry | null> {
  return api.get(`projects/${projectId}/diary`).json<DiaryEntry | null>();
}

// Alle Tagebuch-Einträge projektübergreifend (Startseiten-Widget „Alle Projekte").
export async function getAllDiaries(): Promise<DiaryEntry[]> {
  return api.get("diary").json<DiaryEntry[]>();
}
