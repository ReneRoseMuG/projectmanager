// @vitest-environment jsdom

/**
 * Test Scope:
 * AttachmentUploader mit expliziter Bibliothekssichtbarkeit für Owner-Uploads.
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
 * - Owner-Uploads sind ohne bewusste Auswahl nicht möglich.
 * - Eine Auswahl gilt unverändert für alle Dateien eines Batches und bleibt nach einem Fehler erhalten.
 * - Direkte Bibliotheksuploads benötigen keine zusätzliche Auswahl.
 *
 * Fehlerfälle:
 * - Ein abgelehnter Upload setzt den gewählten Bedeutungszustand nicht zurück.
 *
 * Ziel:
 * Verständliche und verbindliche Upload-Entscheidung ohne stillen Standardwert.
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
  it("verlangt für Owner-Uploads eine explizite Auswahl", () => {
    render(<AttachmentUploader visibilityMode="owner" onUpload={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Auswählen" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Nur als Anhang/ })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /Zusätzlich in der Dokumentenbibliothek/ })).not.toBeChecked();
  });

  it("wendet die Auswahl auf den gesamten Batch an", async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);
    const first = new File(["a"], "a.txt", { type: "text/plain" });
    const second = new File(["b"], "b.txt", { type: "text/plain" });
    const { container } = render(<AttachmentUploader visibilityMode="owner" onUpload={onUpload} />);

    fireEvent.click(screen.getByRole("radio", { name: /Zusätzlich in der Dokumentenbibliothek/ }));
    fireEvent.change(fileInput(container), { target: { files: [first, second] } });

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(2));
    expect(onUpload).toHaveBeenNthCalledWith(1, first, "document-library");
    expect(onUpload).toHaveBeenNthCalledWith(2, second, "document-library");
  });

  it("behält die Auswahl nach einem fehlgeschlagenen Upload bei", async () => {
    const onUpload = vi.fn().mockRejectedValue(new Error("Upload fehlgeschlagen"));
    const file = new File(["a"], "a.txt", { type: "text/plain" });
    const { container } = render(<AttachmentUploader visibilityMode="owner" onUpload={onUpload} />);

    const attachmentOnly = screen.getByRole("radio", { name: /Nur als Anhang/ });
    fireEvent.click(attachmentOnly);
    fireEvent.change(fileInput(container), { target: { files: [file] } });

    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(file, "attachment-only"));
    expect(attachmentOnly).toBeChecked();
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
