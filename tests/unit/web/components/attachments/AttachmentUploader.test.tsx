// @vitest-environment jsdom

/**
 * Test Scope:
 * AttachmentUploader — sequenzieller Mehrfach-Upload und der Abschluss-Rückruf `onBatchComplete`.
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte AttachmentUploader-Komponente mit echtem File-Input und echten `File`-Instanzen.
 *
 * Mock-Entscheidung:
 * - Keine Modul-Mocks. `onUpload` und `onBatchComplete` sind die Callbacks des Aufrufers und werden
 *   als Spies übergeben — sie sind Gegenstand des Vertrags, nicht ein verstecktes Innenleben.
 *
 * Isolation:
 * - jsdom, kein Netzwerk, kein Dateisystem.
 *
 * Abgedeckte Regeln:
 * - Dateien werden sequenziell hochgeladen, in der übergebenen Reihenfolge.
 * - `onBatchComplete` läuft GENAU EINMAL je Upload-Vorgang und ERST nach der letzten Datei.
 *   Darauf beruht, dass die Dokumentenbibliothek nur einmal statt je Datei nachlädt.
 * - Die Prop ist optional: Aufrufer ohne sie funktionieren unverändert.
 *
 * Fehlerfälle:
 * - Wirft ein Upload, läuft `onBatchComplete` dennoch genau einmal (bereits hochgeladene Dateien
 *   müssen sichtbar werden). Der Test hält zugleich fest, dass die Schleife dabei abbricht und die
 *   restlichen Dateien überspringt — bestehendes Verhalten, hier dokumentiert, nicht verändert.
 * - Wirft `onBatchComplete`, schlägt der Upload-Vorgang nicht fehl.
 *
 * Ziel:
 * Absichern, dass ein Upload-Vorgang genau einen Abschluss meldet — die Grundlage dafür, dass nicht
 * je Datei die gesamte Bibliothek neu geladen wird.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent } from "@testing-library/dom";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttachmentUploader } from "../../../../../apps/web/src/components/attachments/AttachmentUploader";

function file(name: string): File {
  return new File(["Inhalt"], name, { type: "text/plain" });
}

function renderUploader(props: {
  onUpload: (file: File) => Promise<unknown>;
  onBatchComplete?: () => void | Promise<void>;
}) {
  const { container } = render(<AttachmentUploader {...props} />);
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Datei-Input nicht gefunden");
  }
  return input;
}

async function selectFiles(input: HTMLInputElement, files: File[]) {
  await act(async () => {
    fireEvent.change(input, { target: { files } });
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AttachmentUploader", () => {
  it("lädt sequenziell hoch und meldet den Abschluss genau einmal, nach der letzten Datei", async () => {
    const order: string[] = [];
    const onUpload = vi.fn(async (uploaded: File) => {
      order.push(`upload:${uploaded.name}`);
    });
    const onBatchComplete = vi.fn(async () => {
      order.push("abschluss");
    });

    const input = renderUploader({ onUpload, onBatchComplete });
    await selectFiles(input, [file("a.txt"), file("b.txt"), file("c.txt")]);

    expect(onUpload).toHaveBeenCalledTimes(3);
    expect(onBatchComplete).toHaveBeenCalledTimes(1);
    // Reihenfolge ist der Kern: erst alle Dateien, dann genau ein Abschluss.
    expect(order).toEqual([
      "upload:a.txt",
      "upload:b.txt",
      "upload:c.txt",
      "abschluss",
    ]);
  });

  it("meldet den Abschluss auch dann genau einmal, wenn ein Upload wirft", async () => {
    const onUpload = vi
      .fn<(uploaded: File) => Promise<unknown>>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Upload kaputt"));
    const onBatchComplete = vi.fn(async () => undefined);

    const input = renderUploader({ onUpload, onBatchComplete });
    await selectFiles(input, [file("a.txt"), file("b.txt"), file("c.txt")]);

    // Bestehendes Verhalten: Die Schleife bricht beim Wurf ab, die dritte Datei wird übersprungen.
    expect(onUpload).toHaveBeenCalledTimes(2);
    // Trotzdem genau ein Abschluss — die erste Datei ist hochgeladen und muss sichtbar werden.
    expect(onBatchComplete).toHaveBeenCalledTimes(1);
  });

  it("funktioniert unverändert ohne `onBatchComplete` (die übrigen Aufrufer)", async () => {
    const onUpload = vi.fn(async () => undefined);

    const input = renderUploader({ onUpload });
    await selectFiles(input, [file("a.txt"), file("b.txt")]);

    expect(onUpload).toHaveBeenCalledTimes(2);
  });

  it("lässt den Upload-Vorgang nicht scheitern, wenn das Nachladen wirft", async () => {
    const onUpload = vi.fn(async () => undefined);
    const onBatchComplete = vi.fn(async () => {
      throw new Error("Nachladen kaputt");
    });

    const input = renderUploader({ onUpload, onBatchComplete });
    await expect(
      selectFiles(input, [file("a.txt")]),
    ).resolves.toBeUndefined();

    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onBatchComplete).toHaveBeenCalledTimes(1);
  });
});
