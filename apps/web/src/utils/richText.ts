function normalizeWhitespace(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function decodeHtmlEntities(value: string) {
  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }

  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function isHtmlContent(value: string | null | undefined) {
  return Boolean(value?.trim().match(/^<([a-z][\w:-]*)(?:\s[^>]*)?>[\s\S]*<\/\1>|^<(?:p|div|ul|ol|li|h[1-6]|blockquote|pre|table|section|article|br)\b/i));
}

function inlineMarkdownToHtml(value: string) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

export function richTextToHtml(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return "";
  }
  if (isHtmlContent(trimmed)) {
    return trimmed;
  }

  const blocks = trimmed.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return blocks.map((block) => {
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
  }).join("");
}

export function richTextToPlainText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const html = richTextToHtml(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(?:p|div|h[1-6]|li|ul|ol|blockquote|pre|tr|table|section|article)>/gi, " ");

  if (typeof DOMParser !== "undefined") {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    return normalizeWhitespace(parsed.body.textContent ?? "");
  }

  return normalizeWhitespace(decodeHtmlEntities(html.replace(/<[^>]*>/g, " ")));
}

export function richTextToPreviewText(value: string | null | undefined) {
  return richTextToPlainText(value);
}
