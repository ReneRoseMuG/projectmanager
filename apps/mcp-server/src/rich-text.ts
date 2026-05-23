import type { JsonObject } from "@taskmanager/shared-types";

export function plainTextDocument(text: string): JsonObject {
  return {
    type: "doc",
    content: text
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => ({
        type: "paragraph",
        content: [{ type: "text", text: paragraph }]
      }))
  };
}
