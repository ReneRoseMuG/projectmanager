import type { JsonObject, JsonValue } from "@taskmanager/shared-types";
import { escapeHtml as escapeRichTextHtml, richTextToHtml, richTextToPreviewText } from "../../utils/richText";

export type NoteContentFormat = "html" | "markdown";

export interface NoteEditorContent {
  value: string;
  format: NoteContentFormat;
}

function isJsonRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function escapeHtml(value: string) {
  return escapeRichTextHtml(value);
}

function collectText(value: JsonValue): string[] {
  if (!isJsonRecord(value)) {
    return [];
  }

  if (typeof value.text === "string") {
    return [value.text];
  }

  if (Array.isArray(value.content)) {
    return value.content.flatMap(collectText);
  }

  return [];
}

export function noteContentToEditorContent(value: JsonObject): NoteEditorContent {
  if (typeof value.html === "string") {
    return { value: value.html, format: "html" };
  }

  if (typeof value.markdown === "string") {
    return { value: richTextToHtml(value.markdown), format: "html" };
  }

  const legacyText = collectText(value).join("").trim();
  return legacyText
    ? { value: richTextToHtml(legacyText), format: "html" }
    : { value: "", format: "html" };
}

export function noteContentToPreviewText(value: JsonObject): string {
  const content = noteContentToEditorContent(value);
  return richTextToPreviewText(content.value);
}

export function htmlToNoteContent(html: string): JsonObject {
  return { html };
}

export function noteContentToExportHtml(content: string, format: NoteContentFormat): string {
  return format === "html" ? content : `<pre>${escapeHtml(content)}</pre>`;
}
