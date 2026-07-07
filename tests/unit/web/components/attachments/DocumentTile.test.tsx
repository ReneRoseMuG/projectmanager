/**
 * Test Scope:
 * DocumentTile — Kachel der Dokumente-Grid-Ansicht (MS-75).
 *
 * Abgedeckte Regeln:
 * - Bilder zeigen ein Thumbnail (Asset-URL), andere Typen ein Typ-Icon mit Badge.
 * - Die Auswahl-Checkbox togglet die Mehrfachauswahl.
 * - Einfachklick auf die Kachel togglet die Auswahl, Doppelklick öffnet die Datei.
 * - Der Löschen-Button löscht, ohne zu öffnen oder auszuwählen (stopPropagation).
 *
 * Fehlerfälle:
 * - Ohne Löschrecht wird kein Löschen-Button angeboten.
 *
 * Ziel:
 * Absichern, dass Darstellung, Auswahl, Öffnen und Löschen sauber getrennt auslösen sowie die
 * Dateiendung (Basis des Endungsfilters) robust extrahiert wird.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { Attachment } from "@taskmanager/shared-types";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DocumentTile,
  fileExtension,
} from "../../../../../apps/web/src/components/attachments/DocumentTile";

vi.mock("../../../../../apps/web/src/api/client", () => ({
  assetUrl: (path: string) => `http://assets.test${path}`,
}));

function doc(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: 1,
    owners: [],
    originalName: "Rechnung.pdf",
    displayName: null,
    description: null,
    filename: "stored-1.pdf",
    mimetype: "application/pdf",
    size: 2048,
    url: "/uploads/stored-1.pdf",
    categories: [],
    tags: [],
    folders: [],
    createdAt: "2026-07-07T08:00:00.000Z",
    updatedAt: "2026-07-07T08:00:00.000Z",
    version: 1,
    ...overrides,
  };
}

function renderTile(props: Partial<ComponentProps<typeof DocumentTile>> = {}) {
  const merged: ComponentProps<typeof DocumentTile> = {
    document: doc(),
    isSelected: false,
    onToggleSelect: vi.fn(),
    onOpen: vi.fn(),
    canDelete: true,
    onDelete: vi.fn(),
    ...props,
  };
  render(<DocumentTile {...merged} />);
  return merged;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DocumentTile", () => {
  it("zeigt bei Bildern ein Thumbnail mit Asset-URL", () => {
    renderTile({
      document: doc({ originalName: "foto.png", mimetype: "image/png", url: "/uploads/foto.png" }),
    });
    expect(screen.getByRole("img")).toHaveAttribute("src", "http://assets.test/uploads/foto.png");
  });

  it("zeigt bei Nicht-Bildern ein Typ-Icon mit Badge statt eines Bildes", () => {
    renderTile({ document: doc({ originalName: "bericht.pdf", mimetype: "application/pdf" }) });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  it("togglet die Auswahl über die Checkbox", () => {
    const props = renderTile();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(props.onToggleSelect).toHaveBeenCalledTimes(1);
  });

  it("togglet die Auswahl bei Einfachklick auf die Kachel", () => {
    const props = renderTile();
    fireEvent.click(screen.getByText("Rechnung"));
    expect(props.onToggleSelect).toHaveBeenCalledTimes(1);
  });

  it("öffnet die Datei bei Doppelklick", () => {
    const props = renderTile();
    fireEvent.doubleClick(screen.getByText("Rechnung"));
    expect(props.onOpen).toHaveBeenCalledTimes(1);
  });

  it("löscht über den Button, ohne zu öffnen oder auszuwählen", () => {
    const props = renderTile();
    fireEvent.click(screen.getByRole("button", { name: "Endgültig löschen" }));
    expect(props.onDelete).toHaveBeenCalledTimes(1);
    expect(props.onOpen).not.toHaveBeenCalled();
    expect(props.onToggleSelect).not.toHaveBeenCalled();
  });

  it("bietet ohne Löschrecht keinen Löschen-Button", () => {
    renderTile({ canDelete: false });
    expect(screen.queryByRole("button", { name: "Endgültig löschen" })).not.toBeInTheDocument();
  });
});

describe("fileExtension", () => {
  it("liefert die kleingeschriebene Endung", () => {
    expect(fileExtension("Rechnung.PDF")).toBe("pdf");
    expect(fileExtension("Tabelle.xlsx")).toBe("xlsx");
  });

  it("nimmt bei mehreren Punkten die letzte Endung", () => {
    expect(fileExtension("archiv.tar.gz")).toBe("gz");
  });

  it("liefert leer bei fehlender Endung oder Dotfile", () => {
    expect(fileExtension("README")).toBe("");
    expect(fileExtension(".gitignore")).toBe("");
  });
});
