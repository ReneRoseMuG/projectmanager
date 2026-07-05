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
 * - Der Standalone-Inline-Modus bietet die WIKI-Kopieraktion im Hero; embedded überlässt den Kopf der Seite.
 * - Inline-Speichern einer bestehenden Seite lässt die Seite geöffnet.
 * - Bei aktivem Auto-Save schließt das Formular nach erfolgreichem Save ohne Verwerfen-Dialog (TKT-95).
 * - Autosave sendet baseVersion (Version des geladenen Inhalts) als expectedVersion, nicht die Cache-Version.
 * - Bei 409-Konflikt erscheint Konflikt-Banner; kein stiller Retry; Nutzerinhalt bleibt erhalten (TKT-129).
 * - Konflikt-Banner verschwindet nach „Trotzdem speichern"; Autosave wird mit aktualisierter baseVersion erneut ausgelöst.
 * - Der Wiki-Seitentitel wird als Exporttitel an die Editor-Toolbar übergeben.
 *
 * Fehlerfälle:
 * - Aktualisierter Inhalt muss im Submit-Payload landen.
 * - Die WIKI-Referenz der Seite muss in die Zwischenablage kopiert werden.
 * - Unberechtigte Nutzer dürfen den Journal-Tab nicht sehen.
 * - Inline-Save darf nicht versehentlich schließen.
 * - Auch bei fehlgeschlagenem Save schließt das Formular ohne Verwerfen-Dialog (Fehler via SaveStatus).
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
    fill,
    editable,
    exportTitle,
  }: {
    value: string | null | undefined;
    onChange: (value: string) => void;
    placeholder?: string;
    testIdPrefix?: string;
    className?: string;
    fill?: boolean;
    editable?: boolean;
    exportTitle?: string;
  }) {
    return (
      <textarea
        aria-label={placeholder ?? "Rich Text"}
        className={className}
        data-fill={fill ? "true" : undefined}
        data-editable={editable === false ? "false" : "true"}
        data-export-title={exportTitle}
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

function makeConflictError(): Error & { response: { status: number } } {
  const err = new Error("Conflict") as Error & { response: { status: number } };
  err.response = { status: 409 };
  return err;
}

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
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ content: "<p>Wiki aktualisiert</p>" }), []));
  });

  it("reicht den Seitentitel als Exporttitel an die Editor-Toolbar weiter", () => {
    renderWithProviders(<WikiPageForm open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByTestId("wiki-page-form-content-view")).toHaveAttribute("data-export-title", "Wiki Alpha");
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

  it("zeigt im Edit-Kopfbereich keine Vorschau- und Versions-Buttons", () => {
    renderWithProviders(<WikiPageForm open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Vorschau" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Versionen" })).not.toBeInTheDocument();
  });

  it("zeigt im Edit-Modus keinen 'In neuem Tab öffnen'-Button, wenn onOpenInTab fehlt", () => {
    renderWithProviders(<WikiPageForm open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "In neuem Tab öffnen" })).not.toBeInTheDocument();
  });

  it("rendert den eingebetteten Inline-Modus ohne redundanten PageHero", () => {
    const { container } = renderWithProviders(<WikiPageForm inline inlineChrome="embedded" open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(container.querySelector('[data-testid="page-hero"][data-variant="detail"]')).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Schließen" })).not.toBeInTheDocument();
    expect(screen.getByTestId("wiki-page-form-content-view")).toHaveClass("min-h-[400px]");
    expect(screen.getByTestId("wiki-page-form-content-view")).toHaveAttribute("data-fill", "true");
  });

  it("rendert den Standalone-Inline-Modus weiterhin mit PageHero", () => {
    const { container } = renderWithProviders(<WikiPageForm inline inlineChrome="standalone" open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(container.querySelector('[data-testid="page-hero"][data-variant="detail"]')).toBeInTheDocument();
  });

  it("zeigt im Standalone-Modus die WIKI-Kopieraktion im Hero", () => {
    renderWithProviders(<WikiPageForm inline inlineChrome="standalone" open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "ID WIKI-5 kopieren" })).toBeInTheDocument();
  });

  it("rendert im eingebetteten Modus keine Kopieraktion (Kopf liegt in der Seite)", () => {
    renderWithProviders(<WikiPageForm inline inlineChrome="embedded" open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "ID WIKI-5 kopieren" })).not.toBeInTheDocument();
  });

  it("kopiert die WIKI-Referenz im Standalone-Modus in die Zwischenablage", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderWithProviders(<WikiPageForm inline inlineChrome="standalone" open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "ID WIKI-5 kopieren" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("WIKI-5"));
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
    renderWithProviders(<WikiPageForm inline editable open page={wikiPage} tree={[]} projects={[]} onSubmit={onSubmit} onClose={onClose} />);

    fireEvent.change(screen.getByTestId("wiki-page-form-content-view"), { target: { value: "<p>Inline aktualisiert</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ content: "<p>Inline aktualisiert</p>" }), []));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("T-RM1 öffnet Inline-Seite standardmäßig im Lesemodus (kein Footer, kein Speichern)", () => {
    renderWithProviders(<WikiPageForm inline open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Speichern" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Abbrechen" })).not.toBeInTheDocument();
  });

  it("T-RM2 zeigt Bearbeiten-Button im Lesemodus des Standalone-Inline-Modus", () => {
    const onEdit = vi.fn();
    renderWithProviders(<WikiPageForm inline inlineChrome="standalone" open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} onEdit={onEdit} />);

    const editButton = screen.getByRole("button", { name: "Bearbeiten" });
    expect(editButton).toBeInTheDocument();
    fireEvent.click(editButton);
    expect(onEdit).toHaveBeenCalled();
  });

  it("T-RM3 zeigt Bearbeiten-Button im Lesemodus des Embedded-Inline-Modus", () => {
    const onEdit = vi.fn();
    renderWithProviders(<WikiPageForm inline inlineChrome="embedded" open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} onEdit={onEdit} />);

    const editButton = screen.getByRole("button", { name: "Bearbeiten" });
    expect(editButton).toBeInTheDocument();
    fireEvent.click(editButton);
    expect(onEdit).toHaveBeenCalled();
  });

  it("T-RM4 zeigt Footer mit Speichern/Abbrechen im Bearbeitungsmodus", () => {
    renderWithProviders(<WikiPageForm inline editable open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Speichern" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeInTheDocument();
  });

  it("T-RM5 übergibt editable=false an RichTextInlineField im Lesemodus", () => {
    renderWithProviders(<WikiPageForm inline open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByTestId("wiki-page-form-content-view")).toHaveAttribute("data-editable", "false");
  });

  it("T-RM6 übergibt editable=true an RichTextInlineField im Bearbeitungsmodus", () => {
    renderWithProviders(<WikiPageForm inline editable open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByTestId("wiki-page-form-content-view")).toHaveAttribute("data-editable", "true");
  });

  it("speichert vor dem Schließen statt einen Verwerfen-Dialog zu zeigen (TKT-95)", async () => {
    const onAutoSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderWithProviders(
      <WikiPageForm open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onAutoSave={onAutoSave} onClose={onClose} />,
    );

    fireEvent.change(screen.getByTestId("wiki-page-form-content-view"), { target: { value: "<p>geändert</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Schließen" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onAutoSave).toHaveBeenCalled();
    expect(screen.queryByText("Änderungen verwerfen?")).not.toBeInTheDocument();
    expect(screen.queryByText("Speichern fehlgeschlagen")).not.toBeInTheDocument();
  });

  it("schließt auch bei fehlgeschlagenem Save ohne Verwerfen-Dialog (TKT-95)", async () => {
    const onAutoSave = vi.fn().mockRejectedValue(new Error("Konflikt"));
    const onClose = vi.fn();
    renderWithProviders(
      <WikiPageForm open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onAutoSave={onAutoSave} onClose={onClose} />,
    );

    fireEvent.change(screen.getByTestId("wiki-page-form-content-view"), { target: { value: "<p>geändert</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Schließen" }));

    // Kein Dirty-Guard mehr: das Formular schließt, der Fehler wird über SaveStatus angezeigt.
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onAutoSave).toHaveBeenCalled();
    expect(screen.queryByText("Änderungen verwerfen?")).not.toBeInTheDocument();
    expect(screen.queryByText("Speichern fehlgeschlagen")).not.toBeInTheDocument();
  });

  it("sendet baseVersion des Editor-Inhalts als expectedVersion beim Autosave (TKT-129)", async () => {
    const onAutoSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <WikiPageForm open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onAutoSave={onAutoSave} onClose={vi.fn()} />,
    );

    fireEvent.change(screen.getByTestId("wiki-page-form-content-view"), { target: { value: "<p>geändert</p>" } });

    await waitFor(() => expect(onAutoSave).toHaveBeenCalled());
    expect(onAutoSave).toHaveBeenCalledWith(
      expect.objectContaining({ content: "<p>geändert</p>" }),
      expect.any(Array),
      wikiPage.version,
    );
  });

  it("zeigt Konflikt-Banner wenn Autosave mit 409 scheitert und behält Nutzerinhalt (TKT-129)", async () => {
    const onAutoSave = vi.fn().mockRejectedValue(makeConflictError());
    renderWithProviders(
      <WikiPageForm open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onAutoSave={onAutoSave} onClose={vi.fn()} />,
    );

    fireEvent.change(screen.getByTestId("wiki-page-form-content-view"), { target: { value: "<p>Eigener Inhalt</p>" } });

    await waitFor(() =>
      expect(screen.getByText("Diese Seite wurde extern geändert. Deine Änderungen wurden noch nicht gespeichert.")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("wiki-page-form-content-view")).toHaveValue("<p>Eigener Inhalt</p>");
    expect(onAutoSave).toHaveBeenCalledTimes(1);
  });

  it("löscht Konflikt-Banner nach 'Trotzdem speichern' und sendet erneuten Autosave (TKT-129)", async () => {
    const onAutoSave = vi.fn()
      .mockRejectedValueOnce(makeConflictError())
      .mockResolvedValue(undefined);
    renderWithProviders(
      <WikiPageForm open page={wikiPage} tree={[]} projects={[]} onSubmit={vi.fn()} onAutoSave={onAutoSave} onClose={vi.fn()} />,
    );

    fireEvent.change(screen.getByTestId("wiki-page-form-content-view"), { target: { value: "<p>Eigener Inhalt</p>" } });
    await waitFor(() =>
      expect(screen.getByText("Diese Seite wurde extern geändert. Deine Änderungen wurden noch nicht gespeichert.")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Trotzdem speichern" }));

    await waitFor(() =>
      expect(screen.queryByText("Diese Seite wurde extern geändert. Deine Änderungen wurden noch nicht gespeichert.")).not.toBeInTheDocument(),
    );
    expect(onAutoSave).toHaveBeenCalledTimes(2);
  });
});
