/**
 * Checks whether an HTML string contains visible text.
 * Empty tags, non-breaking spaces and whitespace-only strings count as empty.
 */
export function hasVisibleHtmlContent(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized.length > 0;
}
