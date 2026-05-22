// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - WikiPageForm bindet RichTextInlineField an den Formular-State.
 *
 * Fehlerfälle:
 * - Aktualisierter Inhalt muss im Submit-Payload landen.
 *
 * Ziel:
 * Die Rich-Text-Integration im Wiki-Formular absichern.
 */
import "@testing-library/jest-dom/vitest";
import type { WikiPage } from "@taskmanager/shared-types";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialogProvider } from "../../../../../apps/web/src/components/ui/ConfirmDialogProvider";
import { WikiPageForm } from "../../../../../apps/web/src/components/wiki/WikiPageForm";

vi.mock("../../../../../apps/web/src/components/ui/rich-text-inline-field", () => ({
  RichTextInlineField({ value, onChange, placeholder, testIdPrefix }: { value: string | null | undefined; onChange: (value: string) => void; placeholder?: string; testIdPrefix?: string }) {
    return <textarea aria-label={placeholder ?? "Rich Text"} data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined} value={value ?? ""} onChange={(event) => onChange(event.currentTarget.value)} />;
  }
}));

const wikiPage: WikiPage = {
  id: 5,
  projectId: null,
  parentId: null,
  title: "Wiki Alpha",
  content: "<p>Wiki Inhalt</p>",
  contentPath: null,
  sortOrder: 0,
  childCount: 0,
  version: 1,
  createdAt: "2026-05-19T08:00:00.000Z",
  updatedAt: "2026-05-19T09:00:00.000Z"
};

function renderWithProviders(ui: ReactElement) {
  return render(<ConfirmDialogProvider>{ui}</ConfirmDialogProvider>);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("WikiPageForm", () => {
  it("bindet RichTextInlineField an den Inhalt", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<WikiPageForm open page={wikiPage} tree={[]} onSubmit={onSubmit} onClose={vi.fn()} />);

    expect(screen.getByTestId("wiki-page-form-content-view")).toHaveValue(wikiPage.content);
    fireEvent.change(screen.getByTestId("wiki-page-form-content-view"), { target: { value: "<p>Wiki aktualisiert</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Veröffentlichen" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ content: "<p>Wiki aktualisiert</p>" })));
  });

  it("zeigt im Edit-Modus den 'In neuem Tab öffnen'-Button, wenn onOpenInTab übergeben wird", () => {
    renderWithProviders(<WikiPageForm open page={wikiPage} tree={[]} onSubmit={vi.fn()} onClose={vi.fn()} onOpenInTab={vi.fn()} />);

    expect(screen.getByRole("button", { name: "In neuem Tab öffnen" })).toBeInTheDocument();
  });

  it("zeigt im Edit-Modus keinen 'In neuem Tab öffnen'-Button, wenn onOpenInTab fehlt", () => {
    renderWithProviders(<WikiPageForm open page={wikiPage} tree={[]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "In neuem Tab öffnen" })).not.toBeInTheDocument();
  });
});
