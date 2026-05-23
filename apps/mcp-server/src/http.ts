import { createServer } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig, requireHttpBearerToken } from "./config.js";
import { isAuthorizedBearer, mcpErrorResponse } from "./http-auth.js";
import { createProjectManagerMcpServer } from "./server.js";

const config = loadConfig();
const expectedBearerToken = requireHttpBearerToken(config);

const httpServer = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${config.httpHost}:${config.httpPort}`}`);
  if (url.pathname !== config.httpPath) {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(mcpErrorResponse(-32004, "MCP endpoint not found"));
    return;
  }

  if (!isAuthorizedBearer(request.headers.authorization, expectedBearerToken)) {
    response.writeHead(401, { "content-type": "application/json", "www-authenticate": "Bearer" });
    response.end(mcpErrorResponse(-32001, "Unauthorized"));
    return;
  }

  const server = createProjectManagerMcpServer(config);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  response.on("close", () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(request, response);
  } catch (error) {
    process.stderr.write(`MCP HTTP request failed: ${error instanceof Error ? error.message : "Unknown error"}\n`);
    if (!response.headersSent) {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(mcpErrorResponse(-32603, "Internal server error"));
    }
    await transport.close();
    await server.close();
  }
});

httpServer.listen(config.httpPort, config.httpHost, () => {
  process.stderr.write(`Projekt Manager MCP HTTP listening on http://${config.httpHost}:${config.httpPort}${config.httpPath}\n`);
});
