import type { Attachment } from "@taskmanager/shared-types";
import { describeAttachmentType } from "./attachmentTypes";

// Detail-Panel-Breite (MS-75): Startbreite beim Öffnen eines Dokuments.
// - Bilder öffnen auf Maximalbreite; die Seite verfeinert danach per Bild-Probe auf die
//   natürliche Bildbreite.
// - Typen MIT Vorschau (PDF, Text, Office, Video) bekommen die breite Vorschaufläche.
// - Typen OHNE Vorschau (Archiv/Zip, unbekannte Dateien) öffnen auf Mindestbreite — sonst
//   reserviert das Panel die volle Vorschaubreite, obwohl es nur die "keine Vorschau"-Meldung
//   zeigt und der Platz verschenkt ist.
export const MIN_DETAIL_WIDTH = 320;
export const NON_IMAGE_MAX_WIDTH = 1000;

export function clampDetailWidth(value: number, max: number): number {
  return Math.max(MIN_DETAIL_WIDTH, Math.min(value, max));
}

// Reine Entscheidung: welche Breite bekommt das Detail-Panel initial für dieses Dokument,
// bei gegebener verfügbarer Maximalbreite. Ohne DOM-Zugriff, damit testbar.
export function initialDetailWidth(document: Attachment, max: number): number {
  const meta = describeAttachmentType(document);
  if (meta.family === "image") {
    return clampDetailWidth(max, max);
  }
  if (!meta.previewEnabled) {
    return clampDetailWidth(MIN_DETAIL_WIDTH, max);
  }
  return clampDetailWidth(NON_IMAGE_MAX_WIDTH, max);
}
