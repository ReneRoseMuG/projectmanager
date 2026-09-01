// @vitest-environment jsdom

/**
 * Test Scope:
 * AttachmentUploader mit strikt getrennten Parent- und DMS-Uploads.
 *
 * Test-Ebene:
 * - Unit/Komponente
 *
 * Realitätsgrad:
 * - Reales Rendering, echte File-Objekte und reale Eingabeereignisse; nur der Upload-Callback ist kontrolliert.
 *
 * Mock-Entscheidung:
 * - Kein API-Mock im Baustein; der übergebene Callback bildet die äußere Mutation ab.
 *
 * Isolation:
 * - JSDOM und vollständige Bereinigung nach jedem Test.
 *
 * Abgedeckte Regeln:
 * - Owner-Uploads werden ohne Bibliotheksauswahl exklusiv an den Parent gesendet.
 * - Alle Dateien eines Batches werden einzeln mit derselben exklusiven Semantik hochgeladen.
 * - Direkte DMS-Uploads verwenden denselben Datei-Callback, aber keinen Parent-Hinweis.
 *
 * Fehlerfälle:
 * - Ein abgelehnter Upload beendet den Batch-Zustand, ohne eine zweite Ablageart anzubieten.
 *
 * Ziel:
 * Die UI kann keinen Parent-Upload mehr versehentlich in das DMS umleiten.
 */

import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttachmentUploader } from "../../../../../apps/web/src/components/attachments/AttachmentUploader";

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("File input not found");
  }
  return input;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AttachmentUploader", () => {
  it("kennzeichnet Owner-Uploads als exklusive Parent-Anhänge", () => {
    render(<AttachmentUploader visibilityMode="owner" onUpload={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Auswählen" })).toBeEnabled();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByText(/ausschließlich als Anhänge dieses Elements/)).toBeInTheDocument();
  });

  it("lädt alle Dateien eines Owner-Batches ohne DMS-Parameter hoch", async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);
    const first = new File(["a"], "a.txt", { type: "text/plain" });
    const second = new File(["b"], "b.txt", { type: "text/plain" });
    const { container } = render(<AttachmentUploader visibilityMode="owner" onUpload={onUpload} />);

    fireEvent.change(fileInput(container), { target: { files: [first, second] } });

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(2));
    expect(onUpload).toHaveBeenNthCalledWith(1, first);
    expect(onUpload).toHaveBeenNthCalledWith(2, second);
  });

  it("bietet auch nach einem fehlgeschlagenen Owner-Upload keine zweite Ablageart an", async () => {
    const onUpload = vi.fn().mockRejectedValue(new Error("Upload fehlgeschlagen"));
    const file = new File(["a"], "a.txt", { type: "text/plain" });
    const { container } = render(<AttachmentUploader visibilityMode="owner" onUpload={onUpload} />);

    fireEvent.change(fileInput(container), { target: { files: [file] } });

    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(file));
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("lädt aus der Dokumentenbibliothek ohne zusätzliche Auswahl hoch", async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);
    const file = new File(["a"], "a.txt", { type: "text/plain" });
    const { container } = render(<AttachmentUploader onUpload={onUpload} />);

    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Auswählen" })).toBeEnabled();
    fireEvent.change(fileInput(container), { target: { files: [file] } });

    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(file));
  });
});
