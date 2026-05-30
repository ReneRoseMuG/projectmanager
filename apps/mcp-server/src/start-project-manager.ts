import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import readline from "node:readline";
import { createProjectManagerStartPlan, loadLocalEnv, type ProjectManagerStartMode } from "./startup.js";

interface RunningCommand {
  child: ChildProcessWithoutNullStreams;
  name: string;
}

const mode = parseMode(process.argv);
const localEnv = loadLocalEnv(process.cwd());
const mergedEnv = { ...process.env, ...localEnv };
const plan = createProjectManagerStartPlan(mode, mergedEnv);
const commandEnv = { ...process.env, ...localEnv, ...plan.env };

for (const warning of plan.warnings) {
  process.stderr.write(`WARNING: ${warning}\n`);
}

if (plan.publicUrl) {
  process.stderr.write(`Projekt Manager MCP public URL: ${plan.publicUrl}\n`);
}

const runningCommands = plan.commands.map((command, index) => startCommand(
  plan.names[index] ?? `command-${index + 1}`,
  command,
  commandEnv
));

let remainingCommands = runningCommands.length;
let isTerminating = false;
let finalExitCode = 0;

for (const runningCommand of runningCommands) {
  runningCommand.child.once("error", (error) => {
    process.stderr.write(`[${runningCommand.name}] Failed to start: ${error.message}\n`);
    finalExitCode = 1;
    terminateOtherCommands(runningCommands, runningCommand.child);
  });

  runningCommand.child.once("exit", (code, signal) => {
    remainingCommands -= 1;

    if (!isTerminating && (code !== 0 || signal)) {
      finalExitCode = typeof code === "number" && code !== 0 ? code : 1;
      terminateOtherCommands(runningCommands, runningCommand.child);
    }

    if (remainingCommands === 0) {
      process.exitCode = finalExitCode;
    }
  });
}

process.once("SIGINT", () => terminateFromSignal());
process.once("SIGTERM", () => terminateFromSignal());

function parseMode(args: string[]): ProjectManagerStartMode {
  if (args.includes("--production")) {
    return "production";
  }
  return "dev";
}

function startCommand(name: string, command: string, env: NodeJS.ProcessEnv): RunningCommand {
  const child = spawn(command, {
    cwd: process.cwd(),
    env,
    shell: true
  });

  prefixStream(name, child.stdout, process.stdout);
  prefixStream(name, child.stderr, process.stderr);

  return { child, name };
}

function prefixStream(name: string, stream: NodeJS.ReadableStream, output: NodeJS.WritableStream): void {
  const lines = readline.createInterface({ input: stream });
  lines.on("line", (line) => {
    output.write(`[${name}] ${line}\n`);
  });
}

function terminateFromSignal(): void {
  finalExitCode = 1;
  terminateOtherCommands(runningCommands);
}

function terminateOtherCommands(commands: RunningCommand[], currentChild?: ChildProcessWithoutNullStreams): void {
  if (isTerminating) {
    return;
  }

  isTerminating = true;
  for (const runningCommand of commands) {
    if (runningCommand.child === currentChild || runningCommand.child.exitCode !== null) {
      continue;
    }
    terminateProcessTree(runningCommand.child);
  }
}

function terminateProcessTree(child: ChildProcessWithoutNullStreams): void {
  if (!child.pid) {
    return;
  }

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }

  child.kill("SIGTERM");
}
