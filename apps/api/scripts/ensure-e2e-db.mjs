import mysql from "mysql2/promise";

const host = process.env.DB_HOST ?? "127.0.0.1";
const port = Number(process.env.DB_PORT ?? 3306);
const user = process.env.DB_USER ?? "taskmanager";
const password = process.env.DB_PASSWORD ?? "";
const dbName = process.env.DB_NAME ?? "taskmanager_e2e";

const conn = await mysql.createConnection({ host, port, user, password });
await conn.execute(
  `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
);
await conn.end();
console.log(`[e2e] Database \`${dbName}\` ready`);
