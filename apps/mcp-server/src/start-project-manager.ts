import { spawn } from "node:child_process";
import { createProjectManagerStartPlan, loadLocalEnv, type ProjectManagerStartMode } from "./startup.js";

const mode = parseMode(process.argv);
const localEnv = loadLocalEnv(process.cwd());
const mergedEnv = { ...process.env, ...localEnv };
const plan = createProjectManagerStartPlan(mode, mergedEnv);

for (const warning of plan.warnings) {
  process.stderr.write(`WARNING: ${warning}\n`);
}

if (plan.publicUrl) {
  process.stderr.write(`Projekt Manager MCP public URL: ${plan.publicUrl}\n`);
}

const child = spawn("npx", [
  "concurrently",
  "--names",
  plan.names.join(","),
  "--prefix",
  "[{name}]",
  "--kill-others-on-fail",
  ...plan.commands
], {
  env: { ...process.env, ...localEnv, ...plan.env },
  shell: process.platform === "win32",
  stdio: "inherit"
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  process.stderr.write(`Failed to start Projekt Manager: ${error.message}\n`);
  process.exit(1);
});

function parseMode(args: string[]): ProjectManagerStartMode {
  if (args.includes("--production")) {
    return "production";
  }
  return "dev";
}
