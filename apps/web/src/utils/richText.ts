function normalizeWhitespace(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
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

export function richTextToPlainText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const html = value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(?:p|div|h[1-6]|li|ul|ol|blockquote|pre|tr|table|section|article)>/gi, " ");

  if (typeof DOMParser !== "undefined") {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    return normalizeWhitespace(parsed.body.textContent ?? "");
  }

  return normalizeWhitespace(decodeHtmlEntities(html.replace(/<[^>]*>/g, " ")));
}
