// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - WikiPageDetail bindet RichTextInlineField an den Inhalts-State.
 *
 * Fehlerfälle:
 * - Aktualisierter Inhalt muss mit expectedVersion gespeichert werden.
 *
 * Ziel:
 * Die Rich-Text-Integration in der Wiki-Detailansicht absichern.
 */
import "@testing-library/jest-dom/vitest";
import type { WikiPage } from "@taskmanager/shared-types";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WikiPageDetail } from "../../../../../apps/web/src/components/wiki/WikiPageDetail";

vi.mock("../../../../../apps/web/src/components/ui/rich-text-inline-field", () => ({
  RichTextInlineField({ value, onChange, placeholder, testIdPrefix }: { value: string | null | undefined; onChange: (value: string) => void; placeholder?: string; testIdPrefix?: string }) {
    return <textarea aria-label={placeholder ?? "Rich Text"} data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined} value={value ?? ""} onChange={(event) => onChange(event.currentTarget.value)} />;
  }
}));

vi.mock("../../../../../apps/web/src/hooks/usePermissions", () => ({
  hasPermission: () => false,
  useHasPermission: () => false
}));

vi.mock("../../../../../apps/web/src/hooks/useEntityComments", () => ({
  useEntityComments() {
    return {
      comments: [],
      error: null,
      createComment: vi.fn(),
      removeComment: vi.fn()
    };
  }
}));

const wikiPage: WikiPage = {
  id: 6,
  projectId: null,
  parentId: null,
  title: "Wiki Detail",
  content: "<p>Wiki Detail Inhalt</p>",
  contentPath: null,
  sortOrder: 0,
  childCount: 0,
  version: 4,
  createdAt: "2026-05-19T08:00:00.000Z",
  updatedAt: "2026-05-19T09:00:00.000Z"
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("WikiPageDetail", () => {
  it("bindet RichTextInlineField an den Inhalt", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<WikiPageDetail page={wikiPage} onSave={onSave} onDelete={vi.fn()} onEditMetadata={vi.fn()} />);

    expect(screen.getByTestId("wiki-page-detail-content-view")).toHaveValue(wikiPage.content);
    fireEvent.change(screen.getByTestId("wiki-page-detail-content-view"), { target: { value: "<p>Wiki Detail aktualisiert</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(wikiPage.id, expect.objectContaining({ content: "<p>Wiki Detail aktualisiert</p>", expectedVersion: wikiPage.version })));
  });
});
