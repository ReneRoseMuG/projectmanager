import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { ProjectManagerApiClient } from "./api-client.js";
import type { McpConfig } from "./config.js";
import { createToolDefinitions } from "./tools.js";
import { errorResult, jsonResult } from "./tool-result.js";

const readOnlyHint: ToolAnnotations = {
  readOnlyHint: true
};

const writeHint: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false
};

function annotationsForTool(name: string): ToolAnnotations {
  return name.startsWith("list_") || name.startsWith("get_") ? readOnlyHint : writeHint;
}

export function createProjectManagerMcpServer(config: Pick<McpConfig, "apiBaseUrl" | "apiKey">): McpServer {
  const client = new ProjectManagerApiClient({ baseUrl: config.apiBaseUrl, apiKey: config.apiKey });
  const server = new McpServer({
    name: "projekt-manager-mcp",
    version: "0.1.0"
  });

  for (const tool of createToolDefinitions(client)) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: annotationsForTool(tool.name)
      },
      async (input) => {
        try {
          return jsonResult(await tool.execute(input));
        } catch (error) {
          return errorResult(error);
        }
      }
    );
  }

  return server;
}
