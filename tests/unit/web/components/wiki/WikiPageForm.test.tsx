// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte React-Komponente mit gemockten Support-Hooks für Kommentare, Notizen, Dateien und Journal.
 *
 * Mock-Entscheidung:
 * - Hooks für externe Server-State-Daten werden als Unit-Grenze gemockt.
 *
 * Isolation:
 * - jsdom ohne echte API- oder Dateisystemzugriffe.
 *
 * Abgedeckte Regeln:
 * - WikiPageForm bindet RichTextInlineField an den Formular-State.
 * - Der Modal-Modus bietet die ID-Kopieraktion und den Open-in-Tab-Button weiterhin nur bei Prop-Übergabe.
 * - Der Inline-Modus rendert ohne Modal, mit PageHero, Delete-Aktion und Journal-Gating.
 * - Inline-Speichern einer bestehenden Seite lässt die Seite geöffnet.
 *
 * Fehlerfälle:
 * - Aktualisierter Inhalt muss im Submit-Payload landen.
 * - Die Wiki-Seiten-ID muss in die Zwischenablage kopiert werden.
 * - Unberechtigte Nutzer dürfen den Journal-Tab nicht sehen.
 * - Inline-Save darf nicht versehentlich schließen.
 *
 * Ziel:
 * Die Rich-Text-Integration, Support-Tabs und den neuen Inline-Modus des Wiki-Formulars absichern.
 */
import "@testing-library/jest-dom/vitest";
import type { WikiPage } from "@taskmanager/shared-types";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialogProvider } from "../../../../../apps/web/src/components/ui/ConfirmDialogProvider";
import { WikiPageForm } from "../../../../../apps/web/src/components/wiki/WikiPageForm";

const permissionState = vi.hoisted(() => ({
  canReadJournal: false,
}));

vi.mock("../../../../../apps/web/src/components/ui/rich-text-inline-field", () => ({
  RichTextInlineField({
    value,
    onChange,
    placeholder,
    testIdPrefix,
    className,
  }: {
    value: string | null | undefined;
    onChange: (value: string) => void;
    placeholder?: string;
    testIdPrefix?: string;
    className?: string;
  }) {
    return (
      <textarea
        aria-label={placeholder ?? "Rich Text"}
        className={className}
        data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined}
        value={value ?? ""}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    );
  },
}));

vi.mock("../../../../../apps/web/src/components/journal/JournalPanel", () => ({
  JournalPanel() {
    return <div data-testid="journal-panel">Journalinhalt</div>;
  },
}));

vi.mock("../../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission() {
    return permissionState.canReadJournal;
  },
}));

vi.mock("../../../../../apps/web/src/hooks/useEntityComments", () => ({
  useEntityComments() {
    return {
      comments: [],
      loading: false,
      error: null,
      reload: vi.fn(),
      createComment: vi.fn(),
      updateComment: vi.fn(),
      removeComment: vi.fn(),
    };
  },
}));

vi.mock("../../../../../apps/web/src/hooks/useNotes", () => ({
  useNotes() {
    return {
      notes: [],
      loading: false,
      error: null,
      reload: vi.fn(),
      createNote: vi.fn(),
      updateNote: vi.fn(),
      removeNote: vi.fn(),
    };
  },
}));

vi.mock("../../../../../apps/web/src/hooks/useAttachments", () => ({
  useAttachments() {
    return {
      attachments: [],
      loading: false,
      error: null,
      reload: vi.fn(),
      uploadAttachment: vi.fn(),
      removeAttachment: vi.fn(),
      openAttachment: vi.fn(),
      openingAttachmentId: null,
    };
  },
}));

vi.mock("../../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast() {
    return { showToast: vi.fn() };
  },
}));

const wikiPage: WikiPage = {
  id: 5,
  parentId: null,
  title: "Wiki Alpha",
  content: "<p>Wiki Inhalt</p>",
  sortOrder: 0,
  childCount: 0,
  attachmentCount: 0,
  taskCount: 0,
  ticketCount: 0,
  relatedPages: [],
  version: 1,
  createdAt: "2026-05-19T08:00:00.000Z",
  updatedAt: "2026-05-19T09:00:00.000Z",
};

function renderWithProviders(ui: ReactElement) {
  return render(<ConfirmDialogProvider>{ui}</ConfirmDialogProvider>);
}

beforeEach(() => {
  permissionState.canReadJournal = false;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("WikiPageForm", () => {
  it("bindet RichTextInlineField an den Inhalt", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<WikiPageForm open page={wikiPage} tree={[]} projects={[]} onSubmit={onSubmit} onClose={vi.fn()} />);

    expect(screen.getByTestId("wiki-page-form-content-view")).toHaveValue(wikiPage.content);
    fireEvent.change(screen.getByTestId("wiki-page-form-content-view"), { target: { value: "<p>Wiki aktualisiert</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Veröffentlichen" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ content: "<p>Wiki aktualisiert</p>" }), []));
  });

  it("zeigt im Modal-Edit-Modus den 'In neuem Tab öffnen'-Button, wenn onOpenInTab übergeben wird", () => {
    renderWithProviders(<WikiPageForm open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} onOpenInTab={vi.fn()} />);

    expect(screen.getByRole("button", { name: "In neuem Tab öffnen" })).toBeInTheDocument();
  });

  it("zeigt im Edit-Modus Support-Tabs für Kommentare, Notizen und Dateien", () => {
    renderWithProviders(<WikiPageForm open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kommentare" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notizen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dateien" })).toBeInTheDocument();
  });

  it("zeigt im Edit-Kopfbereich ID kopieren ohne Vorschau und Versionen", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    renderWithProviders(<WikiPageForm open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Vorschau" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Versionen" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "ID 5 kopieren" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("5"));
  });

  it("zeigt im Edit-Modus keinen 'In neuem Tab öffnen'-Button, wenn onOpenInTab fehlt", () => {
    renderWithProviders(<WikiPageForm open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "In neuem Tab öffnen" })).not.toBeInTheDocument();
  });

  it("rendert den Inline-Modus ohne Modal und mit PageHero", () => {
    const { container } = renderWithProviders(<WikiPageForm inline open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(container.querySelector('[data-testid="page-hero"][data-variant="detail"]')).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Schließen" })).not.toBeInTheDocument();
    expect(screen.getByTestId("wiki-page-form-content-view")).toHaveClass("min-h-[400px]");
  });

  it("zeigt den Journal-Tab im Inline-Modus nur mit Berechtigung", () => {
    const { rerender } = renderWithProviders(<WikiPageForm inline open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Journal" })).not.toBeInTheDocument();

    permissionState.canReadJournal = true;
    rerender(
      <ConfirmDialogProvider>
        <WikiPageForm inline open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} />
      </ConfirmDialogProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Journal" }));
    expect(screen.getByTestId("journal-panel")).toBeInTheDocument();
  });

  it("ruft die Inline-Löschaktion auf", () => {
    const onDelete = vi.fn();
    renderWithProviders(<WikiPageForm inline open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: "Seite löschen" }));

    expect(onDelete).toHaveBeenCalledWith(wikiPage);
  });

  it("lässt eine bestehende Inline-Seite nach dem Speichern geöffnet", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderWithProviders(<WikiPageForm inline open page={wikiPage} tree={[]} projects={[]} onSubmit={onSubmit} onClose={onClose} />);

    fireEvent.change(screen.getByTestId("wiki-page-form-content-view"), { target: { value: "<p>Inline aktualisiert</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Veröffentlichen" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ content: "<p>Inline aktualisiert</p>" }), []));
    expect(onClose).not.toHaveBeenCalled();
  });
});
