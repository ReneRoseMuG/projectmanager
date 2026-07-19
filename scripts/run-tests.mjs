#!/usr/bin/env node
import { spawn } from "node:child_process";

const npmCliPath = process.env.npm_execpath;
const workspaces = ["apps/api", "apps/mcp-server", "apps/windows-importer", "apps/web"];
const failedWorkspaces = [];

if (!npmCliPath) {
  throw new Error("npm_execpath ist nicht gesetzt. Bitte den Testlauf mit 'npm test' starten.");
}

function runWorkspaceTests(workspace) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [npmCliPath, "run", "test", "-w", workspace], {
      stdio: "inherit",
      shell: false
    });

    child.once("error", (error) => {
      console.error(`[tests] ${workspace} konnte nicht gestartet werden: ${error.message}`);
      resolve(1);
    });
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

for (const workspace of workspaces) {
  console.log(`[tests] Starte ${workspace}`);
  const exitCode = await runWorkspaceTests(workspace);
  if (exitCode !== 0) {
    failedWorkspaces.push(workspace);
    console.error(`[tests] ${workspace} fehlgeschlagen (Exit ${exitCode})`);
  } else {
    console.log(`[tests] ${workspace} erfolgreich`);
  }
}

if (failedWorkspaces.length > 0) {
  console.error(`[tests] Fehlgeschlagene Workspaces: ${failedWorkspaces.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("[tests] Alle Workspace-Tests erfolgreich");
}
