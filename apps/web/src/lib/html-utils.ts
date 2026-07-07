/**
 * Checks whether an HTML string contains visible text.
 * Empty tags, non-breaking spaces and whitespace-only strings count as empty.
 */
export function hasVisibleHtmlContent(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  if (/<(?:img|video|audio|iframe|canvas|svg)\b/i.test(value) || /<div\b[^>]*\bdata-tldraw\b/i.test(value)) {
    return true;
  }

  const normalized = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized.length > 0;
}
