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
