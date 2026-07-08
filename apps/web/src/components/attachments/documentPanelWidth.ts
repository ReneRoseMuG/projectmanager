import { measureTextWidth } from "../../utils/textMeasure";

// Inhaltsgesteuerte Breite der Verwaltungsspalte (Sammlungen + Kategorien) auf der Dokumente-Seite.
// Die Spalte wird so breit, dass der längste Eintragsname vollständig ausgeschrieben bleibt, aber
// nur innerhalb eines Korridors — ein extrem langer Name darf die Bibliothek daneben nicht
// erdrücken. Jenseits der Maximalbreite bricht der Name um, statt abgeschnitten zu werden.
// Mechanik übernommen aus dem Wiki-Baum (WikiTree).

export const PANEL_MIN_WIDTH = 280;
export const PANEL_MAX_WIDTH = 460;

// Fester Platz je Zeile neben dem Text: Panel-Padding (p-3 → 12+12), Blockrahmen-Padding
// (p-2 → 8+8), Button-Padding (px-3 → 12+12), Icon bzw. Farbpunkt (16) + Abstand (8), Puffer (16).
const ROW_OVERHEAD = 104;
// Umbenennen- und Löschen-Knopf stehen nur mit Schreibrecht in der Zeile (je 26 px).
const ROW_ACTION_OVERHEAD = 52;

export const PANEL_ROW_FONT = "400 14px Inter, ui-sans-serif, system-ui, sans-serif";

export interface PanelRow {
  label: string;
  /** Einrückung der Zeile in Pixeln (Unter-Sammlungen). */
  indent?: number;
}

/**
 * Ermittelt die Panelbreite aus dem längsten Eintrag. `measure` ist injizierbar, weil die
 * Canvas-Messung unter jsdom kein Ergebnis liefert und ein Test sonst nichts beweisen würde.
 */
export function computePanelWidth(
  rows: PanelRow[],
  canWrite: boolean,
  measure: (text: string, font: string) => number = measureTextWidth,
): number {
  let widest = 0;
  for (const row of rows) {
    const width =
      Math.ceil(measure(row.label, PANEL_ROW_FONT)) +
      (row.indent ?? 0) +
      ROW_OVERHEAD +
      (canWrite ? ROW_ACTION_OVERHEAD : 0);
    if (width > widest) {
      widest = width;
    }
  }
  return Math.max(PANEL_MIN_WIDTH, Math.min(PANEL_MAX_WIDTH, widest));
}
