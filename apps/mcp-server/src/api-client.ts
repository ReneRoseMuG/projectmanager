import type { ApiErrorPayload } from "@taskmanager/shared-types";

export class ProjectManagerApiError extends Error {
  readonly statusCode: number;
  readonly code: ApiErrorPayload["error"];

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ProjectManagerApiError";
    this.statusCode = payload.statusCode;
    this.code = payload.error;
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export class ProjectManagerApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async postForm<T>(path: string, formData: FormData): Promise<T> {
    return this.request<T>("POST", path, formData, "form");
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  private async request<T>(method: string, path: string, body?: unknown, bodyType: "json" | "form" = "json"): Promise<T> {
    const headers: Record<string, string> = {
      "x-api-key": this.apiKey
    };
    let requestBody: BodyInit | undefined;
    if (body !== undefined) {
      if (bodyType === "form") {
        requestBody = body as FormData;
      } else {
        headers["content-type"] = "application/json";
        requestBody = JSON.stringify(body);
      }
    }

    const response = await this.fetchImpl(`${this.baseUrl}/${path.replace(/^\/+/, "")}`, {
      method,
      headers,
      body: requestBody
    });

    if (!response.ok) {
      throw new ProjectManagerApiError(await this.readError(response));
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  private async readError(response: Response): Promise<ApiErrorPayload> {
    try {
      return (await response.json()) as ApiErrorPayload;
    } catch {
      return {
        error: "INTERNAL_ERROR",
        message: `API request failed with status ${response.status}`,
        statusCode: response.status
      };
    }
  }
}
