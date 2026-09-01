/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Windows-Prozesse, echte TCP-Listener und echtes Dateisystem.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Eindeutiger Temp-Root pro Test und dynamisch reservierte lokale Ports.
 *
 * Abgedeckte Regeln:
 * - Nur eindeutig zum Projekt Manager gehörende Prozesse werden beendet.
 * - Wiederverwendete und veraltete PIDs werden ignoriert.
 * - Fremde Port-Eigentümer werden nicht beendet.
 *
 * Fehlerfälle:
 * - Legacy-PID-Datei, falsche Prozessidentität und fremd belegter Port.
 *
 * Ziel:
 * Die Stop-Routine darf fremde Windows-Prozesse niemals aufgrund einer PID-Wiederverwendung
 * oder einer Portbelegung beenden.
 */

import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const sourceStopScript = path.join(repoRoot, "scripts", "stop.ps1");
const powershellExecutable =
  process.platform === "win32"
    ? path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
    : "powershell";
const windowsTest = process.platform === "win32" ? test : test.skip;

async function createTestRoot() {
  const testRoot = await mkdtemp(path.join(os.tmpdir(), "projekt-manager-stop-"));
  const stopScript = path.join(testRoot, "Stop.ps1");
  await copyFile(sourceStopScript, stopScript);
  return { testRoot, stopScript, pidFile: path.join(testRoot, "pm-pids.txt") };
}

function runStopScript(stopScript, ports = []) {
  return spawnSync(
    powershellExecutable,
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "& $env:STOP_SCRIPT -Ports @($env:TEST_PORTS -split ',' | Where-Object { $_ } | ForEach-Object { [int]$_ })"
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        STOP_SCRIPT: stopScript,
        TEST_PORTS: ports.join(",")
      },
      windowsHide: true
    }
  );
}

function getStartTicks(processId) {
  return execFileSync(
    powershellExecutable,
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "(Get-Process -Id ([int]$env:TARGET_PID)).StartTime.ToUniversalTime().Ticks"
    ],
    {
      encoding: "utf8",
      env: { ...process.env, TARGET_PID: String(processId) },
      windowsHide: true
    }
  ).trim();
}

function isRunning(child) {
  if (!child.pid || child.exitCode !== null) {
    return false;
  }
  try {
    process.kill(child.pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function stopChild(child) {
  if (!isRunning(child)) {
    return;
  }
  child.kill();
  for (let attempt = 0; attempt < 40 && isRunning(child); attempt += 1) {
    await delay(50);
  }
}

async function waitForPort(port) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const connected = await new Promise((resolve) => {
      const socket = net.createConnection({ host: "127.0.0.1", port });
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
    });
    if (connected) {
      return;
    }
    await delay(50);
  }
  throw new Error(`Test-Listener auf Port ${port} wurde nicht erreichbar.`);
}

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const port = address.port;
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  return port;
}

windowsTest("beendet einen gespeicherten Projekt-Manager-Prozess mit passendem Fingerabdruck", async () => {
  const paths = await createTestRoot();
  const managedProcess = spawn(
    process.execPath,
    ["-e", "setInterval(() => {}, 1000)", "--", "--project-manager-runtime=api"],
    { stdio: "ignore", windowsHide: true }
  );

  try {
    await new Promise((resolve, reject) => {
      managedProcess.once("spawn", resolve);
      managedProcess.once("error", reject);
    });
    const startTicks = getStartTicks(managedProcess.pid);
    await writeFile(paths.pidFile, `api|${managedProcess.pid}|${startTicks}\n`, "utf8");

    const result = runStopScript(paths.stopScript);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    for (let attempt = 0; attempt < 40 && isRunning(managedProcess); attempt += 1) {
      await delay(50);
    }
    assert.equal(isRunning(managedProcess), false);
  } finally {
    await stopChild(managedProcess);
    await rm(paths.testRoot, { recursive: true, force: true });
  }
});

windowsTest("ignoriert einen fremden Prozess trotz passender PID und Startzeit", async () => {
  const paths = await createTestRoot();
  const foreignProcess = spawn(
    process.execPath,
    ["-e", "setInterval(() => {}, 1000)", "dist\\index.js"],
    { stdio: "ignore", windowsHide: true }
  );

  try {
    await new Promise((resolve, reject) => {
      foreignProcess.once("spawn", resolve);
      foreignProcess.once("error", reject);
    });
    const startTicks = getStartTicks(foreignProcess.pid);
    await writeFile(paths.pidFile, `api|${foreignProcess.pid}|${startTicks}\n`, "utf8");

    const result = runStopScript(paths.stopScript);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(isRunning(foreignProcess), true);
  } finally {
    await stopChild(foreignProcess);
    await rm(paths.testRoot, { recursive: true, force: true });
  }
});

windowsTest("ignoriert eine Legacy-PID-Datei mit wiederverwendbarer Prozess-ID", async () => {
  const paths = await createTestRoot();
  const foreignProcess = spawn(
    powershellExecutable,
    ["-NoProfile", "-NonInteractive", "-Command", "Start-Sleep -Seconds 120"],
    { stdio: "ignore", windowsHide: true }
  );

  try {
    await new Promise((resolve, reject) => {
      foreignProcess.once("spawn", resolve);
      foreignProcess.once("error", reject);
    });
    await writeFile(paths.pidFile, `${foreignProcess.pid}\n`, "utf8");

    const result = runStopScript(paths.stopScript);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(isRunning(foreignProcess), true);
  } finally {
    await stopChild(foreignProcess);
    await rm(paths.testRoot, { recursive: true, force: true });
  }
});

windowsTest("meldet einen fremd belegten Port, ohne dessen Prozess zu beenden", async () => {
  const paths = await createTestRoot();
  const port = await reservePort();
  const foreignListener = spawn(
    process.execPath,
    [
      "-e",
      "require('node:net').createServer().listen(Number(process.env.TEST_LISTENER_PORT), '127.0.0.1'); setInterval(() => {}, 1000)"
    ],
    {
      env: { ...process.env, TEST_LISTENER_PORT: String(port) },
      stdio: "ignore",
      windowsHide: true
    }
  );

  try {
    await waitForPort(port);

    const result = runStopScript(paths.stopScript, [port]);

    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /Fremde Prozesse belegen Projekt-Manager-Ports/);
    assert.equal(isRunning(foreignListener), true);
  } finally {
    await stopChild(foreignListener);
    await rm(paths.testRoot, { recursive: true, force: true });
  }
});
