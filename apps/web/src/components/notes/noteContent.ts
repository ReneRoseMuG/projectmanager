import type { JsonObject, JsonValue } from "@taskmanager/shared-types";
import { richTextToPlainText } from "../../utils/richText";

export type NoteContentFormat = "html" | "markdown";

export interface NoteEditorContent {
  value: string;
  format: NoteContentFormat;
}

function isJsonRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
    return { value: value.markdown, format: "markdown" };
  }

  const legacyText = collectText(value).join(" ").trim();
  return legacyText
    ? { value: legacyText, format: "markdown" }
    : { value: "", format: "html" };
}

export function noteContentToPreviewText(value: JsonObject): string {
  const content = noteContentToEditorContent(value);
  const preview =
    content.format === "html"
      ? richTextToPlainText(content.value)
      : content.value.replace(/\s+/g, " ").trim();

  return preview;
}

export function htmlToNoteContent(html: string): JsonObject {
  return { html };
}

export function noteContentToExportHtml(content: string, format: NoteContentFormat): string {
  return format === "html" ? content : `<pre>${escapeHtml(content)}</pre>`;
}
