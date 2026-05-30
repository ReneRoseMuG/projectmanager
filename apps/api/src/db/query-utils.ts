import type { ResultSetHeader } from "mysql2/promise";

export function firstRow<T>(rows: T[]): T | undefined {
  return rows[0];
}

export function mutationAffectedRows(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  if (typeof header === "object" && header !== null && "affectedRows" in header) {
    return Number((header as ResultSetHeader).affectedRows);
  }
  return 0;
}

export function insertId(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  if (typeof header === "object" && header !== null && "insertId" in header) {
    return Number((header as ResultSetHeader).insertId);
  }
  return 0;
}
