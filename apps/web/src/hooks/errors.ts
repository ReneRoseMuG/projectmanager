export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Aktion fehlgeschlagen";
}

interface ErrorResponseLike {
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
}

interface ErrorWithResponse extends Error {
  response?: ErrorResponseLike;
}

function isErrorWithResponse(error: unknown): error is ErrorWithResponse {
  return error instanceof Error && "response" in error;
}

function messageFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const message = "message" in payload ? payload.message : null;
  if (typeof message === "string" && message.trim()) {
    return message;
  }

  const error = "error" in payload ? payload.error : null;
  return typeof error === "string" && error.trim() ? error : null;
}

export async function errorMessageAsync(error: unknown): Promise<string> {
  if (isErrorWithResponse(error) && error.response) {
    if (typeof error.response.json === "function") {
      try {
        const message = messageFromPayload(await error.response.json());
        if (message) {
          return message;
        }
      } catch {
        // Fall through to text/Error.message.
      }
    }

    if (typeof error.response.text === "function") {
      try {
        const text = await error.response.text();
        if (text.trim()) {
          return text;
        }
      } catch {
        // Fall through to Error.message.
      }
    }
  }

  return errorMessage(error);
}
