#!/usr/bin/env node
/**
 * SSH-Tunnel: Lokaler Port 3307 → MySQL auf dem Server
 * Wird beim Dev-Start automatisch aufgebaut.
 *
 * Umgebungsvariablen (aus .env oder Defaults):
 *   TUNNEL_SSH_HOST    – SSH-Server
 *   TUNNEL_SSH_USER    – SSH-Benutzer
 *   TUNNEL_SSH_PASS    – SSH-Passwort
 *   TUNNEL_DB_HOST     – MySQL-Host (vom SSH-Server aus erreichbar)
 *   TUNNEL_DB_PORT     – MySQL-Port (Standard: 3306)
 *   TUNNEL_LOCAL_PORT  – Lokaler Port (Standard: 3307)
 */

import { createServer } from "node:net";
import { Client } from "ssh2";
import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

// .env aus dem API-Verzeichnis laden
const scriptDir = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(scriptDir, "../apps/api/.env") });

const SSH_HOST = process.env.TUNNEL_SSH_HOST ?? "ssh.gestringen.project.host";
const SSH_USER = process.env.TUNNEL_SSH_USER ?? "ssh-ys2jb5@a-kq0gvh";
const SSH_PASS = process.env.TUNNEL_SSH_PASS ?? "";
const DB_HOST  = process.env.TUNNEL_DB_HOST  ?? "mysql-rvtagh.pg-s-h7zc2s.db.project.host";
const DB_PORT  = parseInt(process.env.TUNNEL_DB_PORT  ?? "3306", 10);
const LOCAL_PORT = parseInt(process.env.TUNNEL_LOCAL_PORT ?? "3307", 10);

function openTunnel(sshClient) {
  return new Promise((resolve, reject) => {
    const server = createServer((localSocket) => {
      sshClient.forwardOut(
        "127.0.0.1", LOCAL_PORT,
        DB_HOST, DB_PORT,
        (err, stream) => {
          if (err) {
            console.error("[tunnel] forwardOut error:", err.message);
            localSocket.destroy();
            return;
          }
          localSocket.pipe(stream).pipe(localSocket);
          stream.on("close", () => localSocket.destroy());
          localSocket.on("close", () => stream.destroy());
        }
      );
    });

    server.listen(LOCAL_PORT, "127.0.0.1", () => {
      console.log(`[tunnel] MySQL-Tunnel bereit: 127.0.0.1:${LOCAL_PORT} → ${DB_HOST}:${DB_PORT}`);
      resolve(server);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.log(`[tunnel] Port ${LOCAL_PORT} bereits belegt – Tunnel läuft bereits.`);
        resolve(null);
      } else {
        reject(err);
      }
    });
  });
}

async function connect() {
  const ssh = new Client();

  await new Promise((resolve, reject) => {
    ssh
      .on("ready", resolve)
      .on("error", reject)
      .connect({
        host: SSH_HOST,
        port: 22,
        username: SSH_USER,
        password: SSH_PASS,
        readyTimeout: 15000,
      });
  });

  console.log("[tunnel] SSH verbunden mit", SSH_HOST);
  await openTunnel(ssh);

  // Tunnel offen halten
  process.on("SIGINT",  () => { ssh.end(); process.exit(0); });
  process.on("SIGTERM", () => { ssh.end(); process.exit(0); });
}

connect().catch((err) => {
  console.error("[tunnel] Fehler:", err.message);
  process.exit(1);
});
