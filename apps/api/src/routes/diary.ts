import type { DiaryEntryInput, DiaryEntryUpdate } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import { createProjectDiary, getDiaryEntryById, getProjectDiary, listAllDiaries, updateDiaryEntry } from "../services/diary.service.js";
import { arrayResponseSchema, expectedVersionPropertySchema, idParamSchema, objectResponseSchema, projectIdParamSchema } from "../utils/route-schemas.js";

const diaryBodySchema = {
  type: "object",
  required: ["title"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    content: { type: "string" },
    coveredUntil: { type: ["string", "null"] },
    sourceCount: { type: "integer", minimum: 0 }
  }
} as const;

const diaryPatchSchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    content: { type: "string" },
    coveredUntil: { type: ["string", "null"] },
    sourceCount: { type: "integer", minimum: 0 },
    ...expectedVersionPropertySchema
  }
} as const;

// Genau ein lebender Eintrag pro Projekt; GET liefert ihn oder null (kein 404, wenn das
// Projekt existiert aber noch kein Tagebuch hat).
const diaryGetResponseSchema = {
  type: ["object", "null"],
  additionalProperties: true
} as const;

export async function registerDiaryRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { projectId: number } }>(
    "/projects/:projectId/diary",
    {
      config: { auth: { resource: "diary", action: "read" } },
      schema: { params: projectIdParamSchema, response: { 200: diaryGetResponseSchema } }
    },
    async (request) => getProjectDiary(app.db, request.params.projectId)
  );

  app.post<{ Params: { projectId: number }; Body: DiaryEntryInput }>(
    "/projects/:projectId/diary",
    {
      config: { auth: { resource: "diary", action: "write" } },
      schema: { params: projectIdParamSchema, body: diaryBodySchema, response: { 201: objectResponseSchema } }
    },
    async (request, reply) => reply.status(201).send(await createProjectDiary(app.db, request.params.projectId, request.body, request.currentUser?.id))
  );

  app.get(
    "/diary",
    {
      config: { auth: { resource: "diary", action: "read" } },
      schema: { response: { 200: arrayResponseSchema } }
    },
    async () => listAllDiaries(app.db)
  );

  app.get<{ Params: { id: number } }>(
    "/diary/:id",
    {
      config: { auth: { resource: "diary", action: "read" } },
      schema: { params: idParamSchema, response: { 200: objectResponseSchema } }
    },
    async (request) => getDiaryEntryById(app.db, request.params.id)
  );

  app.patch<{ Params: { id: number }; Body: DiaryEntryUpdate }>(
    "/diary/:id",
    {
      config: { auth: { resource: "diary", action: "write" } },
      schema: { params: idParamSchema, body: diaryPatchSchema, response: { 200: objectResponseSchema } }
    },
    async (request) => updateDiaryEntry(app.db, request.params.id, request.body, request.currentUser?.id)
  );
}
