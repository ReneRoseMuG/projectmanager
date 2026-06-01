import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { join } from "path";
import { config } from "../config.js";

export const mysqlPool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  ssl: config.db.ssl ? {
    rejectUnauthorized: true,
    ca: readFileSync(join(process.cwd(), "../../docs/Zertifikate/ca.pem"), "utf8"),
  } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 10000,
  maxIdle: 5,
  idleTimeout: 60000,
  queueLimit: 50
});

export const db = drizzle({ client: mysqlPool, logger: process.env.NODE_ENV === "development" });

export type DbClient = Omit<typeof db, "$client">;
type DbTransaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0];
export type DbSession = DbClient | DbTransaction;

export async function closeDatabase(): Promise<void> {
  await mysqlPool.end();
}
