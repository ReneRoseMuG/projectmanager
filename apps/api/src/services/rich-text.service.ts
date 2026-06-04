import type { JsonObject, JsonValue } from "@taskmanager/shared-types";

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function isHtmlContent(value: string | null | undefined): boolean {
  return Boolean(value?.trim().match(/^<([a-z][\w:-]*)(?:\s[^>]*)?>[\s\S]*<\/\1>|^<(?:p|div|ul|ol|li|h[1-6]|blockquote|pre|table|section|article|br)\b/i));
}

function inlineMarkdownToHtml(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

export function textToHtml(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return "";
  }
  if (isHtmlContent(trimmed)) {
    return trimmed;
  }

  return trimmed
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const heading = block.match(/^(#{1,4})\s+(.+)$/);
      if (heading) {
        const level = Math.min(heading[1]?.length ?? 2, 4);
        return `<h${level}>${inlineMarkdownToHtml(heading[2] ?? "")}</h${level}>`;
      }

      const lines = block.split(/\n/).map((line) => line.trim()).filter(Boolean);
      if (lines.length > 0 && lines.every((line) => /^[-*]\s+/.test(line))) {
        return `<ul>${lines.map((line) => `<li>${inlineMarkdownToHtml(line.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
      }
      if (lines.length > 0 && lines.every((line) => /^\d+[.)]\s+/.test(line))) {
        return `<ol>${lines.map((line) => `<li>${inlineMarkdownToHtml(line.replace(/^\d+[.)]\s+/, ""))}</li>`).join("")}</ol>`;
      }

      return `<p>${inlineMarkdownToHtml(lines.join(" "))}</p>`;
    })
    .join("");
}

function isJsonRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectProseMirrorText(value: JsonValue): string[] {
  if (!isJsonRecord(value)) {
    return [];
  }
  if (typeof value.text === "string") {
    return [value.text];
  }
  if (Array.isArray(value.content)) {
    return value.content.flatMap(collectProseMirrorText);
  }
  return [];
}

export function normalizeNoteContentJson(contentJson: JsonObject | undefined): JsonObject {
  if (!contentJson) {
    return { html: "" };
  }
  if (typeof contentJson.html === "string") {
    return { ...contentJson, html: textToHtml(contentJson.html) };
  }
  if (typeof contentJson.markdown === "string") {
    return { html: textToHtml(contentJson.markdown) };
  }

  const legacyText = collectProseMirrorText(contentJson).join("").trim();
  return legacyText ? { html: textToHtml(legacyText) } : contentJson;
}
