import "dotenv/config";
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    database: process.env.DB_NAME ?? "taskmanager",
    user: process.env.DB_USER ?? "taskmanager",
    password: process.env.DB_PASSWORD ?? "",
    ssl: process.env.DB_SSL === "true" || process.env.DB_SSL === "1" ? "true" : undefined
  }
} satisfies Config;
