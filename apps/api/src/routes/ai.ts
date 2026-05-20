import {
  AI_AGENT_ACTION_TYPES,
  AI_TEXT_OPERATIONS,
  type AiAgentExecuteRequest,
  type AiAgentPlanRequest,
  type AiTextAssistRequest
} from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { assistText, executeAgentActions, planAgentActions } from "../services/ai.service.js";
import { objectResponseSchema } from "../utils/route-schemas.js";

const jsonObjectSchema = {
  type: "object",
  additionalProperties: true
} as const;

const aiTextAssistBodySchema = {
  type: "object",
  required: ["html", "operation"],
  additionalProperties: false,
  properties: {
    model: { type: ["string", "null"] },
    html: { type: "string" },
    operation: { type: "string", enum: AI_TEXT_OPERATIONS },
    instruction: { type: ["string", "null"] }
  }
} as const;

const aiAgentPlanBodySchema = {
  type: "object",
  required: ["prompt"],
  additionalProperties: false,
  properties: {
    model: { type: ["string", "null"] },
    prompt: { type: "string", minLength: 1 }
  }
} as const;

const aiAgentActionSchema = {
  type: "object",
  required: ["type", "label", "description", "payload", "requiresConfirmation"],
  additionalProperties: false,
  properties: {
    type: { type: "string", enum: AI_AGENT_ACTION_TYPES },
    label: { type: "string", minLength: 1 },
    description: { type: "string" },
    payload: jsonObjectSchema,
    requiresConfirmation: { type: "boolean", const: true }
  }
} as const;

const aiAgentExecuteBodySchema = {
  type: "object",
  required: ["actions"],
  additionalProperties: false,
  properties: {
    actions: {
      type: "array",
      minItems: 1,
      items: aiAgentActionSchema
    }
  }
} as const;

export async function registerAiRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/ai/models",
    {
      schema: {
        response: { 200: objectResponseSchema }
      }
    },
    async () => {
      try {
        const models = await app.aiClient.listModels();
        return {
          provider: "ollama",
          baseUrl: config.aiBaseUrl,
          defaultModel: config.aiDefaultModel,
          available: true,
          models
        };
      } catch {
        return {
          provider: "ollama",
          baseUrl: config.aiBaseUrl,
          defaultModel: config.aiDefaultModel,
          available: false,
          models: [],
          message: "Ollama ist lokal nicht erreichbar."
        };
      }
    }
  );

  app.post<{ Body: AiTextAssistRequest }>(
    "/ai/text",
    {
      schema: {
        body: aiTextAssistBodySchema,
        response: { 200: objectResponseSchema }
      }
    },
    async (request) => assistText(app.aiClient, config, request.body)
  );

  app.post<{ Body: AiAgentPlanRequest }>(
    "/ai/agent/plan",
    {
      schema: {
        body: aiAgentPlanBodySchema,
        response: { 200: objectResponseSchema }
      }
    },
    async (request) => planAgentActions(app.db, app.aiClient, config, request.body)
  );

  app.post<{ Body: AiAgentExecuteRequest }>(
    "/ai/agent/execute",
    {
      schema: {
        body: aiAgentExecuteBodySchema,
        response: { 200: objectResponseSchema }
      }
    },
    async (request) => executeAgentActions(app.db, request.body)
  );
}
