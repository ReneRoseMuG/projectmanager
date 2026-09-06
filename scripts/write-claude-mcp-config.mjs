#!/usr/bin/env node
// Writes the projekt-manager MCP server entry into a Claude Desktop config file.
//
// Node instead of PowerShell: ConvertFrom-Json/ConvertTo-Json in Windows
// PowerShell 5.1 turns single-element arrays into scalars and truncates deeply
// nested objects, which would silently corrupt the existing preferences block.
import fs from "node:fs";
import path from "node:path";

const SERVER_NAME = "projekt-manager";

const [configPath, deployDir, apiBaseUrl] = process.argv.slice(2);
// The API key travels through the environment so it never shows up in the
// process list of the machine.
const apiKey = process.env.PROJECT_MANAGER_API_KEY;

if (!configPath || !deployDir || !apiBaseUrl || !apiKey) {
  console.error("Usage: PROJECT_MANAGER_API_KEY=<key> write-claude-mcp-config.mjs <configPath> <deployDir> <apiBaseUrl>");
  process.exit(1);
}

const stdioEntry = path.join(deployDir, "apps", "mcp-server", "dist", "stdio.js");
if (!fs.existsSync(stdioEntry)) {
  console.error(`MCP-Einstiegspunkt nicht gefunden: ${stdioEntry}`);
  console.error("Bitte zuerst scripts/deploy.ps1 ausführen.");
  process.exit(1);
}

let config = {};
if (fs.existsSync(configPath)) {
  const raw = fs.readFileSync(configPath, "utf8").replace(/^﻿/, "");
  if (raw.trim()) {
    try {
      config = JSON.parse(raw);
    } catch (error) {
      console.error(`Bestehende Konfiguration ist kein gültiges JSON: ${configPath}`);
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
  fs.copyFileSync(configPath, `${configPath}.bak`);
  console.log(`  Sicherungskopie: ${configPath}.bak`);
} else {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  console.log(`  Neue Konfiguration wird angelegt: ${configPath}`);
}

if (typeof config.mcpServers !== "object" || config.mcpServers === null || Array.isArray(config.mcpServers)) {
  config.mcpServers = {};
}

config.mcpServers[SERVER_NAME] = {
  command: "node",
  args: [stdioEntry],
  env: {
    PROJECT_MANAGER_API_BASE_URL: apiBaseUrl,
    PROJECT_MANAGER_API_KEY: apiKey
  }
};

fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
console.log(`  Eintrag "${SERVER_NAME}" geschrieben: ${configPath}`);
