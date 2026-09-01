/**
 * Test Scope:
 * DocumentTile — Kachel der Dokumente-Grid-Ansicht (MS-75).
 *
 * Abgedeckte Regeln:
 * - Bilder zeigen das Asset direkt, Typen ohne Seitenlayout ein Typ-Icon mit Badge.
 * - PDF, Office, ODF und ausschließlich `.af` fordern ein serverseitiges Vorschaubild an; das
 *   Typ-Icon bleibt darunter liegen und ist damit Platzhalter wie Rückfall.
 * - Die Auswahl-Checkbox togglet die Mehrfachauswahl.
 * - Einfach- und Doppelklick auf die Kachel öffnen die Datei, ohne die Mehrfachauswahl zu verändern.
 * - Der Löschen-Button löscht, ohne zu öffnen oder auszuwählen (stopPropagation).
 *
 * Fehlerfälle:
 * - Ohne Löschrecht wird kein Löschen-Button angeboten.
 * - Schlägt das Laden des Vorschaubilds fehl (404, Erzeugung gescheitert), bleibt das Typ-Icon stehen.
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

vi.mock("../../../../../apps/web/src/api/documents", () => ({
  documentThumbnailUrl: (id: number) => `http://api.test/api/documents/${id}/thumbnail`,
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
    contentHash: null,
    isInDocumentLibrary: true,
    tags: [],
    folder: null,
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
    isActive: false,
    isSelected: false,
    onToggleSelect: vi.fn(),
    onOpen: vi.fn(),
    onDownload: vi.fn(),
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

  it("zeigt bei Typen ohne Seitenlayout ein Typ-Icon mit Badge statt eines Bildes", () => {
    renderTile({ document: doc({ originalName: "backup.zip", mimetype: "application/zip" }) });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("ZIP")).toBeInTheDocument();
  });

  it("fordert für Video kein Vorschaubild an", () => {
    renderTile({ document: doc({ originalName: "film.mp4", mimetype: "video/mp4" }) });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("zeigt für PDF ein Vorschaubild der ersten Seite über dem Typ-Icon", () => {
    renderTile();
    const preview = screen.getByRole("img", { name: "Vorschau von Rechnung" });
    expect(preview).toHaveAttribute("src", "http://api.test/api/documents/1/thumbnail");
    expect(preview).toHaveAttribute("loading", "lazy");
    // Das Typ-Icon liegt darunter: Platzhalter beim Laden, Rückfall bei Fehlern.
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  it("zeigt auch für ODF-Dokumente ein Vorschaubild", () => {
    renderTile({
      document: doc({
        id: 9,
        originalName: "notiz.odt",
        mimetype: "application/vnd.oasis.opendocument.text",
      }),
    });
    expect(screen.getByRole("img", { name: "Vorschau von notiz" })).toHaveAttribute(
      "src",
      "http://api.test/api/documents/9/thumbnail",
    );
  });

  it("fällt bei fehlendem Vorschaubild auf das Typ-Icon zurück", () => {
    renderTile();
    fireEvent.error(screen.getByRole("img", { name: "Vorschau von Rechnung" }));

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  it("togglet die Auswahl über die Checkbox", () => {
    const props = renderTile();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(props.onToggleSelect).toHaveBeenCalledTimes(1);
    expect(props.onOpen).not.toHaveBeenCalled();
  });

  it("fordert für .af ein Vorschaubild an und fällt bei Fehler auf das AF-Icon zurück", () => {
    renderTile({
      document: doc({
        id: 12,
        originalName: "entwurf.af",
        mimetype: "application/octet-stream",
      }),
    });

    const preview = screen.getByRole("img", { name: "Vorschau von entwurf" });
    expect(preview).toHaveAttribute("src", "http://api.test/api/documents/12/thumbnail");
    fireEvent.error(preview);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("AF")).toBeInTheDocument();
  });

  it("öffnet bei Einfachklick die Details ohne die Mehrfachauswahl zu ändern", () => {
    const props = renderTile();
    fireEvent.click(screen.getByText("Rechnung"));
    expect(props.onOpen).toHaveBeenCalledTimes(1);
    expect(props.onToggleSelect).not.toHaveBeenCalled();
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

  it("lÃ¤dt Ã¼ber den Button herunter, ohne zu Ã¶ffnen oder auszuwÃ¤hlen", () => {
    const props = renderTile();
    fireEvent.click(screen.getByRole("button", { name: "Herunterladen" }));
    expect(props.onDownload).toHaveBeenCalledTimes(1);
    expect(props.onOpen).not.toHaveBeenCalled();
    expect(props.onToggleSelect).not.toHaveBeenCalled();
  });

  it("bietet ohne Löschrecht keinen Löschen-Button", () => {
    renderTile({ canDelete: false });
    expect(screen.queryByRole("button", { name: "Endgültig löschen" })).not.toBeInTheDocument();
  });

  it("zeigt MS-80-Tags und trennt Bibliotheksentfernung vom endgültigen Löschen", () => {
    const onRemoveFromLibrary = vi.fn();
    renderTile({
      canRemoveFromLibrary: true,
      onRemoveFromLibrary,
      pills: <span>Wichtig</span>,
    });

    expect(screen.getByText("Wichtig")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aus der Dokumentenbibliothek entfernen" }));
    expect(onRemoveFromLibrary).toHaveBeenCalledTimes(1);
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
