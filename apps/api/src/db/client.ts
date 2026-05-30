import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config } from "../config.js";

export const mysqlPool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  ssl: config.db.ssl ? { rejectUnauthorized: true } : undefined,
  waitForConnections: true,
  connectionLimit: 10
});

export const db = drizzle({ client: mysqlPool });

export type DbClient = Omit<typeof db, "$client">;
type DbTransaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0];
export type DbSession = DbClient | DbTransaction;

export async function closeDatabase(): Promise<void> {
  await mysqlPool.end();
}
