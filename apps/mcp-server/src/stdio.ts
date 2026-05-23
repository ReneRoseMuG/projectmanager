import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createProjectManagerMcpServer } from "./server.js";

const config = loadConfig();
const server = createProjectManagerMcpServer(config);
await server.connect(new StdioServerTransport());
