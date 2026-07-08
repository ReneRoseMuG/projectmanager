// Drag & Drop der Dokumentenbibliothek (MS-75): Dokumentkacheln werden auf eine Sammlungs- oder
// Kategoriezeile gezogen, um sie dort einzusortieren bzw. zuzuweisen. Ein Klick auf dieselbe Zeile
// filtert dagegen immer — Zuweisen und Filtern sind zwei verschiedene Gesten, kein versteckter Modus.
//
// Die Ablageziel-ID trägt ihren Typ im Präfix. Der Drop-Handler entscheidet dadurch ohne
// zusätzlichen Zustand, welche Zuweisung gemeint war.

const FOLDER_DROP_PREFIX = "dms-folder-";
const CATEGORY_DROP_PREFIX = "dms-category-";
const DOCUMENT_DRAG_PREFIX = "dms-doc-";

export function folderDropId(folderId: number): string {
  return `${FOLDER_DROP_PREFIX}${folderId}`;
}

export function categoryDropId(categoryId: number): string {
  return `${CATEGORY_DROP_PREFIX}${categoryId}`;
}

export function documentDragId(documentId: number): string {
  return `${DOCUMENT_DRAG_PREFIX}${documentId}`;
}

export type DropTarget =
  | { kind: "folder"; id: number }
  | { kind: "category"; id: number };

/**
 * Löst eine Ablageziel-ID auf. „Alle Dokumente" und „Nicht einsortiert" sind Filter und keine
 * Sammlungen — sie tragen keine Drop-ID und ergeben deshalb `null`, ebenso ein Drop ins Leere.
 */
export function parseDropTarget(dropId: unknown): DropTarget | null {
  if (typeof dropId !== "string") {
    return null;
  }
  if (dropId.startsWith(FOLDER_DROP_PREFIX)) {
    const id = Number(dropId.slice(FOLDER_DROP_PREFIX.length));
    return Number.isInteger(id) && id > 0 ? { kind: "folder", id } : null;
  }
  if (dropId.startsWith(CATEGORY_DROP_PREFIX)) {
    const id = Number(dropId.slice(CATEGORY_DROP_PREFIX.length));
    return Number.isInteger(id) && id > 0 ? { kind: "category", id } : null;
  }
  return null;
}

/**
 * Ziehe ich eine markierte Kachel, wandert die gesamte Auswahl mit; ziehe ich eine unmarkierte,
 * nur diese eine. Übliche Konvention und der Grund, warum kein separater „Auswahl ziehen"-Griff
 * nötig ist.
 */
export function dragDocumentIds(documentId: number, selectedIds: Set<number>): number[] {
  return selectedIds.has(documentId) ? [...selectedIds] : [documentId];
}

/** Liest die Dokument-IDs aus der Drag-Nutzlast, ohne `any` und ohne auf dnd-kit-Typen zu bauen. */
export function dragIdsFromData(data: unknown): number[] {
  if (!data || typeof data !== "object" || !("ids" in data)) {
    return [];
  }
  const ids = (data as { ids: unknown }).ids;
  if (!Array.isArray(ids)) {
    return [];
  }
  return ids.filter((value): value is number => typeof value === "number");
}
