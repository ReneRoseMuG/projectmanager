// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitaetsgrad:
 * - Echte NoteDetailPage, echter useNoteDetail-Hook und echter NoteEditor mit kontrollierter API-Antwort.
 *
 * Mock-Entscheidung:
 * - API-Funktionen und RichTextInlineField als Unit-Grenze; Router, QueryClient und Page-Verdrahtung bleiben echt.
 *
 * Isolation:
 * - jsdom und QueryClient im Speicher, ohne DB- oder Dateisystemzugriff.
 *
 * Abgedeckte Regeln:
 * - /notes/:id laedt eine Notiz ueber den Detail-Query-Key.
 * - Die Notiz wird als Seiten-Editor gerendert.
 * - Schliessen navigiert zum returnTo-Ziel zurueck.
 *
 * Fehlerfaelle:
 * - Die Note-Detailseite darf nicht zur Owner-Detailseite statt zum Editor werden.
 *
 * Ziel:
 * Die neue eigenstaendige Note-Detailroute gegen Routing- und Editor-Verdrahtungsregressionen absichern.
 */
import "@testing-library/jest-dom/vitest";
import type { Note } from "@taskmanager/shared-types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as notesApi from "../../../../apps/web/src/api/notes";
import { NoteDetailPage } from "../../../../apps/web/src/pages/NoteDetailPage";
import { ConfirmDialogProvider } from "../../../../apps/web/src/components/ui/ConfirmDialogProvider";

vi.mock("../../../../apps/web/src/api/notes", () => ({
  getNote: vi.fn(),
  updateNote: vi.fn()
}));

vi.mock("../../../../apps/web/src/components/ui/rich-text-inline-field", () => ({
  RichTextInlineField({ value, onChange, testIdPrefix }: { value: string | null | undefined; onChange: (value: string) => void; testIdPrefix?: string }) {
    return <textarea aria-label="Notizinhalt" data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined} value={value ?? ""} onChange={(event) => onChange(event.currentTarget.value)} />;
  }
}));

const note: Note = {
  id: 7,
  title: "Standalone Note",
  contentJson: { html: "<p>Detailinhalt</p>" },
  version: 3,
  createdAt: "2026-05-19T08:00:00.000Z",
  updatedAt: "2026-05-19T09:00:00.000Z"
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderWithProviders(ui: ReactElement, initialEntry = "/notes/7?returnTo=%2Fprojects%2F10%3Ftab%3Dnotes") {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <ConfirmDialogProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <LocationProbe />
          {ui}
        </MemoryRouter>
      </ConfirmDialogProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("NoteDetailPage", () => {
  it("rendert die geladene Notiz als Seiten-Editor", async () => {
    vi.mocked(notesApi.getNote).mockResolvedValue(note);

    renderWithProviders(
      <Routes>
        <Route path="/notes/:id" element={<NoteDetailPage />} />
      </Routes>
    );

    expect(await screen.findByDisplayValue("Standalone Note")).toBeInTheDocument();
    expect(screen.getByTestId("form-page-body")).toBeInTheDocument();
    expect(screen.getByTestId("note-editor-content-view")).toHaveValue("<p>Detailinhalt</p>");
    expect(notesApi.getNote).toHaveBeenCalledWith(7);
  });

  it("navigiert beim Schliessen zum returnTo-Ziel zurueck", async () => {
    vi.mocked(notesApi.getNote).mockResolvedValue(note);

    renderWithProviders(
      <Routes>
        <Route path="/notes/:id" element={<NoteDetailPage />} />
        <Route path="/projects/:id" element={<div>Zurueck zum Projekt</div>} />
      </Routes>
    );

    await screen.findByDisplayValue("Standalone Note");
    fireEvent.click(screen.getAllByRole("button", { name: /^Schlie/ })[0]);

    expect(await screen.findByText("Zurueck zum Projekt")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/projects/10?tab=notes"));
  });
});
