import { desc, type Column, type SQL } from "drizzle-orm";
import type { ResultSetHeader } from "mysql2/promise";

export function firstRow<T>(rows: T[]): T | undefined {
  return rows[0];
}

type RecencyColumns = { id: Column; createdAt: Column; updatedAt: Column };

/**
 * Kanonische "Aktualitäts"-Reihenfolge für Listen (TKT-113):
 * zuletzt geändert zuerst, dann zuletzt erstellt, stabiler Tiebreak über id.
 * Bei statusgruppierten Listen wird die Statusspalte dieser Klausel vorangestellt,
 * z. B. `orderBy(tasks.status, ...recencyOrder(tasks))`.
 */
export function recencyOrder(table: RecencyColumns): SQL[] {
  return [desc(table.updatedAt), desc(table.createdAt), desc(table.id)];
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
