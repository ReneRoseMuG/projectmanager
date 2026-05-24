import { loadConfig } from "./config.js";
import { createMcpHttpServer } from "./http-server.js";

const config = loadConfig();
const httpServer = createMcpHttpServer(config);

if (config.httpAuthMode === "none") {
  process.stderr.write("WARNING: MCP HTTP auth is disabled. Use this only for local ChatGPT tunnel tests.\n");
}

httpServer.listen(config.httpPort, config.httpHost, () => {
  process.stderr.write(`Projekt Manager MCP HTTP listening on http://${config.httpHost}:${config.httpPort}${config.httpPath} (${config.httpAuthMode} auth)\n`);
});
