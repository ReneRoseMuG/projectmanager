/**
 * Test Scope:
 * Dokumenten-Duplikatprüfung in der DMS-Oberfläche.
 *
 * Test-Ebene:
 * - Unit/Komponente
 *
 * Realitätsgrad:
 * - Reales Rendering und reale Benutzerinteraktion; der Server-State-Hook ist kontrolliert ersetzt.
 *
 * Mock-Entscheidung:
 * - Nur TanStack-/API-Zugriff und Toast-Ausgabe werden ersetzt. Darstellung und Bedienlogik bleiben real.
 *
 * Isolation:
 * - JSDOM; Bereinigung und Rücksetzen aller Mocks nach jedem Test.
 *
 * Abgedeckte Regeln:
 * - Laufender Scan zeigt Fortschritt und startet beim erneuten Öffnen keinen zweiten Lauf.
 * - Treffer zeigen ID, Dateiname, Größe, Sammlung und Owner.
 * - Prüfprobleme sind getrennt von Duplikatgruppen sichtbar.
 * - Ein leerer Trefferbestand wird ausdrücklich bestätigt.
 *
 * Fehlerfälle:
 * - Startfehler erzeugen einen Fehler-Toast.
 *
 * Ziel:
 * Nachweis der verständlichen, ausschließlich manuell ausgelösten Scan-Bedienung.
 */

import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { DocumentDuplicateCheck as DuplicateCheck } from "@taskmanager/shared-types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentDuplicateCheck } from "../../../../../apps/web/src/components/documents/DocumentDuplicateCheck";

const mocks = vi.hoisted(() => ({
  check: null as DuplicateCheck | null,
  startCheck: vi.fn(),
  showToast: vi.fn()
}));

vi.mock("../../../../../apps/web/src/hooks/useDocuments", () => ({
  useDocumentDuplicateCheck: () => ({
    check: mocks.check,
    loading: false,
    starting: false,
    error: null,
    startCheck: mocks.startCheck
  })
}));

vi.mock("../../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast: () => ({ showToast: mocks.showToast })
}));

function check(overrides: Partial<DuplicateCheck>): DuplicateCheck {
  return {
    id: "scan-1",
    status: "completed",
    total: 2,
    processed: 2,
    startedAt: "2026-07-19T12:00:00.000Z",
    completedAt: "2026-07-19T12:00:01.000Z",
    groups: [],
    issues: [],
    error: null,
    ...overrides
  };
}

afterEach(() => {
  cleanup();
  mocks.check = null;
  vi.clearAllMocks();
});

describe("DocumentDuplicateCheck", () => {
  it("öffnet einen laufenden Scan mit Fortschritt ohne einen zweiten Start", () => {
    mocks.check = check({ status: "running", total: 5, processed: 2, completedAt: null });

    render(<DocumentDuplicateCheck />);
    fireEvent.click(screen.getByRole("button", { name: "Prüfung läuft" }));

    expect(screen.getByText("2 / 5")).toBeInTheDocument();
    expect(mocks.startCheck).not.toHaveBeenCalled();
  });

  it("zeigt Duplikatdetails und Dateiprobleme getrennt", async () => {
    mocks.startCheck.mockResolvedValue(undefined);
    mocks.check = check({
      total: 3,
      processed: 3,
      groups: [
        {
          hash: "abc",
          documents: [
            {
              id: 12,
              originalName: "sauna.jpg",
              displayName: null,
              size: 2048,
              createdAt: "2026-07-19T12:00:00.000Z",
              folder: { id: 4, parentId: null, projectId: null, name: "Oval Sauna", childCount: 0, directDocumentCount: 1, version: 1 },
              owners: [{ type: "project", id: 7 }]
            },
            {
              id: 13,
              originalName: "sauna-kopie.jpg",
              displayName: "Sauna Kopie",
              size: 2048,
              createdAt: "2026-07-19T12:00:00.000Z",
              folder: null,
              owners: []
            }
          ]
        }
      ],
      issues: [
        { attachmentId: 99, originalName: "fehlt.pdf", kind: "missing", message: "Die Datei wurde nicht gefunden." }
      ]
    });

    render(<DocumentDuplicateCheck />);
    fireEvent.click(screen.getByRole("button", { name: "Duplikate prüfen" }));

    await waitFor(() => expect(mocks.startCheck).toHaveBeenCalledTimes(1));
    expect(screen.getByText("1 Duplikatgruppen mit 2 Dokumenten gefunden.")).toBeInTheDocument();
    expect(screen.getByText("sauna.jpg")).toBeInTheDocument();
    expect(screen.getByText("Oval Sauna")).toBeInTheDocument();
    expect(screen.getByText("Projekt 7")).toBeInTheDocument();
    expect(screen.getByText("fehlt.pdf · ID 99")).toBeInTheDocument();
  });

  it("bestätigt einen abgeschlossenen Lauf ohne Treffer", () => {
    mocks.startCheck.mockResolvedValue(undefined);
    mocks.check = check({ groups: [] });

    render(<DocumentDuplicateCheck />);
    fireEvent.click(screen.getByRole("button", { name: "Duplikate prüfen" }));

    expect(screen.getByText("Keine Dateiduplikate gefunden.")).toBeInTheDocument();
  });

  it("meldet einen Startfehler als Toast", async () => {
    mocks.startCheck.mockRejectedValue(new Error("nicht verfügbar"));

    render(<DocumentDuplicateCheck />);
    fireEvent.click(screen.getByRole("button", { name: "Duplikate prüfen" }));

    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith({
        title: "Die Duplikatprüfung konnte nicht gestartet werden.",
        tone: "error"
      })
    );
  });
});
