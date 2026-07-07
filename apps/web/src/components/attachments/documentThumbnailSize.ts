// Kachelgröße der Dokumente-Grid-Ansicht (MS-75). Drei feste Stufen; die Wahl steuert die
// minimale Spaltenbreite des CSS-Grids (repeat(auto-fill, minmax(minPx, 1fr))) und wird lokal
// gespeichert, damit sie über Sitzungen erhalten bleibt — analog zu den Panel-Zuständen.

export type ThumbnailSize = "s" | "m" | "l";

export const THUMBNAIL_SIZES: ReadonlyArray<{
  value: ThumbnailSize;
  label: string;
  minPx: number;
}> = [
  { value: "s", label: "S", minPx: 120 },
  { value: "m", label: "M", minPx: 168 },
  { value: "l", label: "L", minPx: 232 },
];

const STORAGE_KEY = "ui.documents.thumbnailSize";
const DEFAULT_SIZE: ThumbnailSize = "m";

function isThumbnailSize(value: string | null): value is ThumbnailSize {
  return value === "s" || value === "m" || value === "l";
}

export function loadThumbnailSize(): ThumbnailSize {
  if (typeof localStorage === "undefined") {
    return DEFAULT_SIZE;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  return isThumbnailSize(stored) ? stored : DEFAULT_SIZE;
}

export function saveThumbnailSize(size: ThumbnailSize): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, size);
}

export function thumbnailMinPx(size: ThumbnailSize): number {
  return THUMBNAIL_SIZES.find((entry) => entry.value === size)?.minPx ?? 168;
}
