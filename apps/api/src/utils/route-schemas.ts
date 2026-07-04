export const idParamSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "integer", minimum: 1 }
  }
} as const;

export const projectIdParamSchema = {
  type: "object",
  required: ["projectId"],
  properties: {
    projectId: { type: "integer", minimum: 1 }
  }
} as const;

export const taskIdParamSchema = {
  type: "object",
  required: ["taskId"],
  properties: {
    taskId: { type: "integer", minimum: 1 }
  }
} as const;

export const idAndProjectIdParamSchema = {
  type: "object",
  required: ["id", "projectId"],
  properties: {
    id: { type: "integer", minimum: 1 },
    projectId: { type: "integer", minimum: 1 }
  }
} as const;

export const tagIdsBodySchema = {
  type: "object",
  required: ["tagIds"],
  additionalProperties: false,
  properties: {
    tagIds: {
      type: "array",
      items: { type: "integer", minimum: 1 }
    }
  }
} as const;

export const expectedVersionPropertySchema = {
  expectedVersion: { type: "integer", minimum: 1 }
} as const;

export const expectedVersionBodySchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: true,
  properties: expectedVersionPropertySchema
} as const;

export const emptyResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ok: { type: "boolean" }
  }
} as const;

export const objectResponseSchema = {
  type: "object",
  additionalProperties: true
} as const;

export const arrayResponseSchema = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: true
  }
} as const;

// Seitenbasierte Pagination (MS-75 Fundament): opt-in über `page`. `pageSize` 1..100,
// Default 25. Diese Felder werden je Liste in deren bestehendes Query-Schema gemischt.
export const paginationQuerySchema = {
  page: { type: "integer", minimum: 1 },
  pageSize: { type: "integer", minimum: 1, maximum: 100, default: 25 }
} as const;

// Antwort-Hülle für den paginierten Pfad (Paginated<T>): `data` ist die Seite,
// `total` die Gesamtzahl nach Filter/Suche.
export const paginatedResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["data", "total", "page", "pageSize"],
  properties: {
    data: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true
      }
    },
    total: { type: "integer", minimum: 0 },
    page: { type: "integer", minimum: 1 },
    pageSize: { type: "integer", minimum: 1 }
  }
} as const;
