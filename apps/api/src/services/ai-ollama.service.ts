import type { AiModelInfo } from "@taskmanager/shared-types";
import type { AppConfig } from "../config.js";

export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiLocalModelClient {
  listModels(): Promise<AiModelInfo[]>;
  chatText(model: string, messages: AiChatMessage[]): Promise<string>;
  chatJson(model: string, messages: AiChatMessage[]): Promise<unknown>;
}

interface OllamaModelResponse {
  models?: unknown;
}

interface OllamaChatResponse {
  message?: {
    content?: unknown;
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseModelInfo(value: unknown): AiModelInfo | null {
  if (!isObject(value)) {
    return null;
  }

  const name = readString(value.name);
  if (!name) {
    return null;
  }

  return {
    name,
    sizeBytes: readNumber(value.size),
    modifiedAt: readString(value.modified_at),
    digest: readString(value.digest)
  };
}

function extractJsonFromText(text: string): unknown {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  return JSON.parse(candidate) as unknown;
}

export class OllamaLocalModelClient implements AiLocalModelClient {
  private readonly baseUrl: string;

  public constructor(private readonly appConfig: Pick<AppConfig, "aiBaseUrl" | "aiTimeoutMs">) {
    this.baseUrl = normalizeBaseUrl(appConfig.aiBaseUrl);
  }

  public async listModels(): Promise<AiModelInfo[]> {
    const response = await this.request<OllamaModelResponse>("/tags", { method: "GET" });
    const models = Array.isArray(response.models) ? response.models : [];
    return models.map(parseModelInfo).filter((model): model is AiModelInfo => model !== null);
  }

  public async chatText(model: string, messages: AiChatMessage[]): Promise<string> {
    const response = await this.request<OllamaChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({
        model,
        messages,
        stream: false
      })
    });

    const content = response.message?.content;
    if (typeof content !== "string") {
      throw new Error("Ollama returned an empty response");
    }
    return content;
  }

  public async chatJson(model: string, messages: AiChatMessage[]): Promise<unknown> {
    const response = await this.request<OllamaChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        format: "json"
      })
    });

    const content = response.message?.content;
    if (typeof content !== "string") {
      throw new Error("Ollama returned an empty JSON response");
    }
    return extractJsonFromText(content);
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.appConfig.aiTimeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: { "content-type": "application/json" }
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed with HTTP ${response.status}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createOllamaLocalModelClient(appConfig: Pick<AppConfig, "aiBaseUrl" | "aiTimeoutMs">): AiLocalModelClient {
  return new OllamaLocalModelClient(appConfig);
}
