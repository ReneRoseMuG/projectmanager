import type {
  AiAgentExecuteRequest,
  AiAgentExecuteResponse,
  AiAgentPlanRequest,
  AiAgentPlanResponse,
  AiModelsResponse,
  AiTextAssistRequest,
  AiTextAssistResponse
} from "@taskmanager/shared-types";
import { api } from "./client";

export async function getAiModels(): Promise<AiModelsResponse> {
  return api.get("ai/models").json<AiModelsResponse>();
}

export async function assistAiText(input: AiTextAssistRequest): Promise<AiTextAssistResponse> {
  return api.post("ai/text", { json: input }).json<AiTextAssistResponse>();
}

export async function planAiAgentActions(input: AiAgentPlanRequest): Promise<AiAgentPlanResponse> {
  return api.post("ai/agent/plan", { json: input }).json<AiAgentPlanResponse>();
}

export async function executeAiAgentActions(input: AiAgentExecuteRequest): Promise<AiAgentExecuteResponse> {
  return api.post("ai/agent/execute", { json: input }).json<AiAgentExecuteResponse>();
}
