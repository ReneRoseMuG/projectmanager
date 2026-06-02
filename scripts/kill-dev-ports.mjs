#!/usr/bin/env node
// Frees the dev ports before starting so a second `npm run dev` never fails
// because the previous session is still running.
import { execSync } from "node:child_process";

const ports = [3001, 5173, 3010];

for (const port of ports) {
  try {
    if (process.platform === "win32") {
      // netstat -aon | findstr ":PORT " — last column is PID
      const out = execSync(`netstat -aon | findstr ":${port} "`, {
        encoding: "utf8",
        shell: true,
      });
      const seen = new Set();
      for (const line of out.split("\n")) {
        const parts = line.trim().split(/\s+/);
        // parts: [Proto, LocalAddr, ForeignAddr, State, PID]
        if (parts.length < 5) continue;
        const localAddr = parts[1] ?? "";
        if (!localAddr.endsWith(`:${port}`)) continue; // only local port, not remote
        const pid = parts[4];
        if (!pid || pid === "0" || seen.has(pid)) continue;
        seen.add(pid);
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore", shell: true });
        console.log(`Port ${port}: Prozess ${pid} beendet.`);
      }
    } else {
      execSync(`lsof -ti :${port} | xargs -r kill -9`, { shell: true, stdio: "ignore" });
      console.log(`Port ${port}: freigeräumt.`);
    }
  } catch {
    // Kein Prozess auf diesem Port — alles gut.
  }
}
