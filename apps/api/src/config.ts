import "dotenv/config";
import path from "node:path";

export interface AppConfig {
  databasePath: string;
  port: number;
  corsOrigin: string;
  uploadDir: string;
}

function resolveFromApiRoot(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

export const config: AppConfig = {
  databasePath: resolveFromApiRoot(process.env.DATABASE_PATH ?? "./data/taskmanager.sqlite"),
  port: Number(process.env.PORT ?? 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  uploadDir: resolveFromApiRoot(process.env.UPLOAD_DIR ?? "./uploads")
};
