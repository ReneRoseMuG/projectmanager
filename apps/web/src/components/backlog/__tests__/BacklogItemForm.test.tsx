// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - BacklogItemForm bindet das RichTextInlineField an den Formular-State.
 *
 * Fehlerfälle:
 * - Aktualisierte Beschreibung muss im Submit-Payload landen.
 *
 * Ziel:
 * Die Rich-Text-Integration im Backlog-Formular absichern.
 */
import "@testing-library/jest-dom/vitest";
import type { BacklogItem } from "@taskmanager/shared-types";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BacklogItemForm } from "../BacklogItemForm";

vi.mock("../../ui/rich-text-inline-field", () => ({
  RichTextInlineField({ value, onChange, placeholder, testIdPrefix }: { value: string | null | undefined; onChange: (value: string) => void; placeholder?: string; testIdPrefix?: string }) {
    return <textarea aria-label={placeholder ?? "Rich Text"} data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined} value={value ?? ""} onChange={(event) => onChange(event.currentTarget.value)} />;
  }
}));

vi.mock("../../../hooks/useEntityComments", () => ({
  useEntityComments() {
    return {
      comments: [],
      error: null,
      createComment: vi.fn(),
      removeComment: vi.fn()
    };
  }
}));

const backlogItem: BacklogItem = {
  id: 1,
  projectId: 10,
  featureId: null,
  useCaseId: null,
  title: "Backlog Alpha",
  description: "<p>Backlog Beschreibung</p>",
  status: "open",
  importKey: null,
  sortOrder: 0,
  version: 2,
  createdAt: "2026-05-19T08:00:00.000Z",
  updatedAt: "2026-05-19T09:00:00.000Z"
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BacklogItemForm", () => {
  it("bindet RichTextInlineField an die Beschreibung", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<BacklogItemForm open item={backlogItem} features={[]} onSubmit={onSubmit} onClose={vi.fn()} variant="page" />);

    expect(screen.getByTestId("backlog-item-description-view")).toHaveValue(backlogItem.description);
    fireEvent.change(screen.getByTestId("backlog-item-description-view"), { target: { value: "<p>Backlog aktualisiert</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ description: "<p>Backlog aktualisiert</p>" })));
  });
});
