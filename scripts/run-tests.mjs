#!/usr/bin/env node
import { spawn } from "node:child_process";

const npmCliPath = process.env.npm_execpath;
const workspaces = ["apps/api", "apps/mcp-server", "apps/windows-importer", "apps/web"];
const failedTargets = [];

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

console.log("[tests] Starte Deployment-Skripte");
const scriptTest = spawn(process.execPath, ["--test", "tests/integration/scripts/stop-script.test.mjs"], {
  stdio: "inherit",
  shell: false
});
const scriptTestExitCode = await new Promise((resolve) => {
  scriptTest.once("error", (error) => {
    console.error(`[tests] Deployment-Skripte konnten nicht getestet werden: ${error.message}`);
    resolve(1);
  });
  scriptTest.once("exit", (code) => resolve(code ?? 1));
});
if (scriptTestExitCode !== 0) {
  failedTargets.push("Deployment-Skripte");
  console.error(`[tests] Deployment-Skripte fehlgeschlagen (Exit ${scriptTestExitCode})`);
} else {
  console.log("[tests] Deployment-Skripte erfolgreich");
}

for (const workspace of workspaces) {
  console.log(`[tests] Starte ${workspace}`);
  const exitCode = await runWorkspaceTests(workspace);
  if (exitCode !== 0) {
    failedTargets.push(workspace);
    console.error(`[tests] ${workspace} fehlgeschlagen (Exit ${exitCode})`);
  } else {
    console.log(`[tests] ${workspace} erfolgreich`);
  }
}

if (failedTargets.length > 0) {
  console.error(`[tests] Fehlgeschlagene Testziele: ${failedTargets.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("[tests] Alle Testziele erfolgreich");
}
