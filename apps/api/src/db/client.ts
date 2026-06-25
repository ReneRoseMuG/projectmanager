import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { join } from "path";
import { config } from "../config.js";
import { assertSafeTestDatabaseTarget } from "../runtime-safety.js";

// In test mode this refuses to connect to anything but an approved temporary test
// database. Outside test mode it is a no-op, so production startup is unaffected.
assertSafeTestDatabaseTarget(config.db.host, config.db.name);

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

// The mysql2 promise pool does not forward the underlying pool's "error" event
// (it only forwards acquire/connection/enqueue/release). Without a listener on the
// core pool, a dropped connection — e.g. the remote database closing an idle
// connection — surfaces as an unhandled "error" event and terminates the process.
// Listening here keeps the process alive; mysql2 discards the broken connection and
// the next query transparently opens a fresh one.
mysqlPool.pool.on("error", (err: unknown) => {
  console.error(
    "[db] MySQL pool connection error; connection was dropped and will be re-established on the next query:",
    err
  );
});

export const db = drizzle({ client: mysqlPool, logger: process.env.NODE_ENV === "development" });

export type DbClient = Omit<typeof db, "$client">;
type DbTransaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0];
export type DbSession = DbClient | DbTransaction;

export async function closeDatabase(): Promise<void> {
  await mysqlPool.end();
}
