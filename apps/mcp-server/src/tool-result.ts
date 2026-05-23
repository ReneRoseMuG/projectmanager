import { ProjectManagerApiError } from "./api-client.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export interface ToolTextResult extends CallToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export function jsonResult(value: unknown): ToolTextResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }]
  };
}

export function errorResult(error: unknown): ToolTextResult {
  if (error instanceof ProjectManagerApiError) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: error.code,
              message: error.message,
              statusCode: error.statusCode
            },
            null,
            2
          )
        }
      ]
    };
  }

  return {
    isError: true,
    content: [{ type: "text", text: error instanceof Error ? error.message : "Unknown MCP tool error" }]
  };
}
