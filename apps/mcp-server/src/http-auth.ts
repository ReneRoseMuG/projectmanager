import { timingSafeEqual } from "node:crypto";

function extractBearerToken(header: string | string[] | undefined): string | null {
  if (typeof header !== "string") {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

function constantTimeEquals(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function isAuthorizedBearer(header: string | string[] | undefined, expectedToken: string): boolean {
  const actualToken = extractBearerToken(header);
  return Boolean(actualToken && constantTimeEquals(actualToken, expectedToken));
}

export function mcpErrorResponse(code: number, message: string): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code,
      message
    },
    id: null
  });
}
