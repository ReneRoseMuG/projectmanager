/**
 * Resolve the header color for task calendar tiles from PM design tokens.
 */
export function resolveTaskStatusColor(status: string): string {
  switch (status) {
    case "todo":
      return "var(--color-steel-400)";
    case "open":
      return "var(--color-steel-500)";
    case "active":
    case "in_progress":
      return "var(--color-teal)";
    case "pending":
    case "in_review":
      return "var(--color-tangerine)";
    case "done":
    case "resolved":
    case "completed":
      return "var(--color-fern)";
    case "closed":
    case "rejected":
      return "var(--color-steel-300)";
    default:
      return "var(--color-steel-400)";
  }
}
