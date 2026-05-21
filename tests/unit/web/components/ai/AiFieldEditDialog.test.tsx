// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - AiFieldEditDialog sammelt Freitext-Anweisungen und ruft den bestehenden KI-Text-Endpunkt.
 * - Erfolgreiche KI-Antworten werden an das umgebende RichText-Feld zurückgegeben.
 *
 * Fehlerfälle:
 * - Leere Anweisungen dürfen nicht gesendet werden.
 * - Fehlerhafte KI-Aufrufe zeigen einen Toast und lassen den Dialog offen.
 *
 * Ziel:
 * Den eigenständigen Dialog für die KI-Bearbeitung langer RichText-Felder absichern.
 */

import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiFieldEditDialog } from "../../../../../apps/web/src/components/ai/AiFieldEditDialog";
import { ToastProvider } from "../../../../../apps/web/src/components/ui/ToastProvider";

const aiApiMock = vi.hoisted(() => ({
  assistAiText: vi.fn()
}));

vi.mock("../../../../../apps/web/src/api/ai", () => aiApiMock);

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AiFieldEditDialog", () => {
  it("T-01 rendert nicht, wenn open false ist", () => {
    renderWithProviders(<AiFieldEditDialog open={false} currentHtml="<p>Alt</p>" onApply={vi.fn()} onClose={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Anweisung")).not.toBeInTheDocument();
  });

  it("T-02 rendert Dialog und Anweisungsfeld, wenn open true ist", () => {
    renderWithProviders(<AiFieldEditDialog open currentHtml="<p>Alt</p>" onApply={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText("Mit KI bearbeiten")).toBeInTheDocument();
    expect(screen.getByLabelText("Anweisung")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generieren" })).toBeInTheDocument();
  });

  it("T-03 deaktiviert Generieren solange die Anweisung leer ist", () => {
    renderWithProviders(<AiFieldEditDialog open currentHtml="<p>Alt</p>" onApply={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Generieren" })).toBeDisabled();
  });

  it("T-04 ruft assistAiText mit HTML-Kontext und Anweisung auf", async () => {
    aiApiMock.assistAiText.mockResolvedValue({ model: "llama3.2:1b", html: "<p>Neu</p>" });
    renderWithProviders(<AiFieldEditDialog open currentHtml="<p>Alt</p>" onApply={vi.fn()} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Anweisung"), { target: { value: "Fasse kürzer zusammen" } });
    fireEvent.click(screen.getByRole("button", { name: "Generieren" }));

    await waitFor(() =>
      expect(aiApiMock.assistAiText).toHaveBeenCalledWith({
        html: "<p>Alt</p>",
        operation: "rewrite",
        instruction: "Fasse kürzer zusammen"
      })
    );
  });

  it("T-05 sendet bei leerem Feld einen neutralen HTML-Kontext", async () => {
    aiApiMock.assistAiText.mockResolvedValue({ model: "llama3.2:1b", html: "<p>Neu</p>" });
    renderWithProviders(<AiFieldEditDialog open currentHtml="" onApply={vi.fn()} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Anweisung"), { target: { value: "Schreibe eine Beschreibung" } });
    fireEvent.click(screen.getByRole("button", { name: "Generieren" }));

    await waitFor(() => expect(aiApiMock.assistAiText).toHaveBeenCalledWith(expect.objectContaining({ html: "<p></p>" })));
  });

  it("T-06 übernimmt erfolgreiche KI-Antwort und schließt den Dialog", async () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    aiApiMock.assistAiText.mockResolvedValue({ model: "llama3.2:1b", html: "<p>Neu</p>" });
    renderWithProviders(<AiFieldEditDialog open currentHtml="<p>Alt</p>" onApply={onApply} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText("Anweisung"), { target: { value: "Schreibe klarer" } });
    fireEvent.click(screen.getByRole("button", { name: "Generieren" }));

    await waitFor(() => expect(onApply).toHaveBeenCalledWith("<p>Neu</p>"));
    expect(onClose).toHaveBeenCalled();
  });

  it("T-07 zeigt Fehler als Toast und lässt den Dialog offen", async () => {
    aiApiMock.assistAiText.mockRejectedValue(new Error("Ollama offline"));
    renderWithProviders(<AiFieldEditDialog open currentHtml="<p>Alt</p>" onApply={vi.fn()} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Anweisung"), { target: { value: "Schreibe klarer" } });
    fireEvent.click(screen.getByRole("button", { name: "Generieren" }));

    await waitFor(() => expect(screen.getByText("Text konnte nicht generiert werden")).toBeInTheDocument());
    expect(screen.getByLabelText("Anweisung")).toBeInTheDocument();
  });

  it("T-08 Abbrechen ruft onClose auf", () => {
    const onClose = vi.fn();
    renderWithProviders(<AiFieldEditDialog open currentHtml="<p>Alt</p>" onApply={vi.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(onClose).toHaveBeenCalled();
  });
});
