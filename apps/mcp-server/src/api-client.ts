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

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}/${path.replace(/^\/+/, "")}`, {
      method,
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey
      },
      body: body === undefined ? undefined : JSON.stringify(body)
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
