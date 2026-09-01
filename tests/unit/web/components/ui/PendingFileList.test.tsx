// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit/Komponente
 *
 * Realitätsgrad:
 * - Reales Rendering, echte File-Objekte und Eingabeereignisse; keine API.
 *
 * Mock-Entscheidung:
 * - Nur URL.createObjectURL wird als Browser-Ressource kontrolliert.
 *
 * Isolation:
 * - JSDOM mit Cleanup nach jedem Test.
 *
 * Abgedeckte Regeln:
 * - EmptyState wenn keine Dateien pending.
 * - Footer-Hinweis „Dateien werden nach dem Speichern hochgeladen." immer sichtbar.
 * - Vorgemerkte Dateien sind immer exklusive Parent-Anhänge; eine DMS-Auswahl existiert nicht.
 * - Datei auswählen (≤ 25 MB) → onAdd() mit korrekten DraftFiles aufgerufen.
 * - Datei > 25 MB → onAdd() nicht aufgerufen, Fehlermeldung sichtbar.
 * - Dateiname und formatierte Dateigröße sichtbar.
 * - Entfernen → onRemove(index) aufgerufen.
 * Ziel: PendingFileList-Rendering, Größenvalidierung und Interaktionen absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PendingFileList } from "../../../../../apps/web/src/components/ui/PendingFileList";

beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:test-preview")
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function getFileInput(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("File input not found");
  }
  return input;
}

describe("PendingFileList", () => {
  it("zeigt EmptyState wenn keine Dateien pending sind", () => {
    render(<PendingFileList files={[]} onAdd={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByText("Keine Dateien vorgemerkt")).toBeInTheDocument();
    expect(screen.getByText("Dateien werden lokal gesammelt.")).toBeInTheDocument();
  });

  it("zeigt den Footer-Hinweis immer an", () => {
    const textFile = new File(["abc"], "readme.txt", { type: "text/plain" });
    const { rerender } = render(<PendingFileList files={[]} onAdd={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByText("Dateien werden nach dem Speichern hochgeladen.")).toBeInTheDocument();

    rerender(<PendingFileList files={[{ file: textFile }]} onAdd={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByText("Dateien werden nach dem Speichern hochgeladen.")).toBeInTheDocument();
  });

  it("ruft onAdd bei Datei kleiner oder gleich 25 MB mit korrekten DraftFiles auf", () => {
    const onAdd = vi.fn();
    const imageFile = new File(["image"], "bild.png", { type: "image/png" });
    const { container } = render(<PendingFileList files={[]} onAdd={onAdd} onRemove={vi.fn()} />);

    fireEvent.change(getFileInput(container), { target: { files: [imageFile] } });

    expect(onAdd).toHaveBeenCalledWith([
      { file: imageFile, previewUrl: "blob:test-preview" }
    ]);
  });

  it("lehnt Dateien größer als 25 MB ab und zeigt eine Fehlermeldung", () => {
    const onAdd = vi.fn();
    const largeFile = new File([new Uint8Array(25 * 1024 * 1024 + 1)], "riesig.bin", { type: "application/octet-stream" });
    const { container } = render(<PendingFileList files={[]} onAdd={onAdd} onRemove={vi.fn()} />);

    fireEvent.change(getFileInput(container), { target: { files: [largeFile] } });

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText("Datei zu groß: riesig.bin. Maximal erlaubt sind 25 MB.")).toBeInTheDocument();
  });

  it("zeigt Dateiname und formatierte Dateigröße", () => {
    const file = new File([new Uint8Array(2048)], "anhang.pdf", { type: "application/pdf" });

    render(<PendingFileList files={[{ file }]} onAdd={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByText("anhang.pdf")).toBeInTheDocument();
    expect(screen.getByText("2 KB")).toBeInTheDocument();
  });

  it("ruft onRemove mit dem korrekten Index auf", () => {
    const onRemove = vi.fn();
    const firstFile = new File(["a"], "erstes.txt", { type: "text/plain" });
    const secondFile = new File(["b"], "zweites.txt", { type: "text/plain" });

    render(
      <PendingFileList
        files={[
          { file: firstFile },
          { file: secondFile }
        ]}
        onAdd={vi.fn()}
        onRemove={onRemove}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "zweites.txt entfernen" }));

    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it("erlaubt die Dateiauswahl ohne DMS-Sichtbarkeitsentscheidung", () => {
    render(<PendingFileList files={[]} onAdd={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Dateien auswählen" })).toBeEnabled();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByText(/ausschließlich als Anhänge des neuen Elements/)).toBeInTheDocument();
  });
});
