// @vitest-environment jsdom

/**
 * Test Scope:
 * NotesPage
 *
 * Test-Ebene:
 * - Unit, jsdom mit echter Page- und ListBoardView-Darstellung.
 *
 * Realitätsgrad:
 * - Echte React-Komponenten, echte Router-Navigation und echte Notiz-Datenobjekte.
 *
 * Mock-Entscheidung:
 * - useAllNotes, Berechtigungen, Toasts und Confirm-Dialog werden als externe App-Zustände isoliert.
 *
 * Isolation:
 * - Kein API-, DB- oder Dateisystemzugriff; MemoryRouter isoliert die URL.
 *
 * Abgedeckte Regeln:
 * - Die Hauptansicht rendert globale Notizen als statuslose Karten-/Listen-Daten.
 * - Die Suche berücksichtigt den Notizinhalt.
 * - Die globale Ansicht bietet keinen ownerlosen Create-Button an.
 * - Doppelklick auf eine Notiz navigiert zur bestehenden Detailroute mit returnTo.
 *
 * Fehlerfälle:
 * - Notizen dürfen nicht in Statusspalten wie "Ohne Status" gruppiert werden.
 *
 * Ziel:
 * Die neue Notizen-Hauptnavigation gegen Darstellungs- und Navigationsregressionen absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { Note } from "@taskmanager/shared-types";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pageMocks = vi.hoisted(() => ({
  useAllNotes: vi.fn(),
  useHasPermission: vi.fn(),
  useStandaloneView: vi.fn(),
  confirm: vi.fn(),
  showToast: vi.fn()
}));

vi.mock("../../../../apps/web/src/hooks/useAllNotes", () => ({
  useAllNotes: pageMocks.useAllNotes
}));

vi.mock("../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission: pageMocks.useHasPermission
}));

vi.mock("../../../../apps/web/src/hooks/useStandaloneView", () => ({
  useStandaloneView: pageMocks.useStandaloneView
}));

vi.mock("../../../../apps/web/src/components/ui/ConfirmDialogProvider", () => ({
  useConfirm: () => ({ confirm: pageMocks.confirm })
}));

vi.mock("../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast: () => ({ showToast: pageMocks.showToast })
}));

import { NotesPage } from "../../../../apps/web/src/pages/NotesPage";

const notes: Note[] = [
  {
    id: 1,
    title: "Release-Entscheidung",
    contentJson: { html: "<p>Alpha Entscheidung dokumentiert.</p>" },
    version: 1,
    createdAt: "2026-06-30T10:00:00",
    updatedAt: "2026-06-30T11:00:00"
  },
  {
    id: 2,
    title: "Meeting-Notiz",
    contentJson: { html: "<p>Beta Abstimmung vorbereitet.</p>" },
    version: 1,
    createdAt: "2026-06-29T10:00:00",
    updatedAt: "2026-06-29T11:00:00"
  }
];

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderNotesPage() {
  return render(
    <MemoryRouter initialEntries={["/notes"]}>
      <NotesPage />
      <LocationProbe />
    </MemoryRouter>
  );
}

beforeEach(() => {
  pageMocks.useAllNotes.mockReturnValue({
    notes,
    total: notes.length,
    loadedCount: notes.length,
    loading: false,
    loadingMore: false,
    error: null,
    reload: vi.fn(),
    removeNote: vi.fn()
  });
  pageMocks.useHasPermission.mockReturnValue(true);
  pageMocks.useStandaloneView.mockReturnValue(false);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("NotesPage", () => {
  it("rendert globale Notizen statuslos und ohne ownerlosen Create-Button", () => {
    renderNotesPage();

    expect(screen.getByRole("heading", { name: "Notizen" })).toBeInTheDocument();
    expect(screen.getByText("Release-Entscheidung")).toBeInTheDocument();
    expect(screen.getByText("Meeting-Notiz")).toBeInTheDocument();
    expect(screen.getByText("2 Einträge")).toBeInTheDocument();
    expect(screen.queryByText("Ohne Status")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Neue Notiz")).not.toBeInTheDocument();
  });

  it("reicht die Suche serverseitig als q-Filter durch (Titel + Inhalt)", () => {
    // Die Suche läuft jetzt serverseitig über useAllNotes/getNotesPage. Das Backend durchsucht
    // Titel UND content_json (verifiziert in note.repository.ts), deckt also die frühere
    // clientseitige Vorschau-/Inhaltssuche 1:1 ab. Die Page filtert nicht mehr clientseitig,
    // sondern gibt den getrimmten Suchbegriff als Filter { q } an den Hook weiter.
    renderNotesPage();

    fireEvent.change(screen.getByPlaceholderText("Suchen"), {
      target: { value: "  Alpha  " }
    });

    expect(pageMocks.useAllNotes).toHaveBeenLastCalledWith({ q: "Alpha" });
  });

  it("übergibt bei leerer Suche einen Filter ohne q", () => {
    renderNotesPage();

    expect(pageMocks.useAllNotes).toHaveBeenLastCalledWith({});
  });

  it("öffnet die bestehende Notiz-Detailroute mit returnTo", async () => {
    renderNotesPage();

    const noteCard = screen.getByText("Release-Entscheidung").closest("article");
    expect(noteCard).not.toBeNull();

    fireEvent.doubleClick(noteCard as HTMLElement);

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/notes/1?returnTo=%2Fnotes");
    });
  });
});
