// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - AiAgentPanel lädt lokale Modelle über TanStack Query.
 * - Agent-Pläne werden vor der Ausführung angezeigt.
 * - Blockierte Pläne können nicht ausgeführt werden.
 *
 * Fehlerfälle:
 * - Blocker aus dem Backend bleiben sichtbar und deaktivieren die Ausführung.
 *
 * Ziel:
 * Den bestätigungspflichtigen Frontend-Flow des lokalen App-Agenten absichern.
 */

import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiAgentPanel } from "../../../../../apps/web/src/components/ai/AiAgentPanel";
import { ToastProvider } from "../../../../../apps/web/src/components/ui/ToastProvider";

const aiApiMock = vi.hoisted(() => ({
  getAiModels: vi.fn(),
  planAiAgentActions: vi.fn(),
  executeAiAgentActions: vi.fn()
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

describe("AiAgentPanel", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("zeigt Agent-Plan und führt bestätigte Aktionen aus", async () => {
    aiApiMock.getAiModels.mockResolvedValue({
      provider: "ollama",
      baseUrl: "http://127.0.0.1:11434/api",
      defaultModel: "llama3.2:1b",
      available: true,
      models: [{ name: "llama3.2:1b", sizeBytes: 123, modifiedAt: null, digest: null }]
    });
    aiApiMock.planAiAgentActions.mockResolvedValue({
      status: "ready",
      model: "llama3.2:1b",
      message: "Bereit",
      blockers: [],
      actions: [
        {
          type: "createTask",
          label: "Aufgabe anlegen",
          description: "Aufgabe anlegen",
          payload: { ownerType: "project", ownerId: 1, title: "Aufgabe 1" },
          requiresConfirmation: true
        }
      ]
    });
    aiApiMock.executeAiAgentActions.mockResolvedValue({ message: "1 Aktion(en) ausgeführt.", results: [] });

    renderWithProviders(<AiAgentPanel open onClose={vi.fn()} />);

    await screen.findByText("llama3.2:1b");
    fireEvent.change(screen.getByLabelText("Auftrag"), { target: { value: "Erstelle Aufgabe" } });
    fireEvent.click(screen.getByRole("button", { name: "Planen" }));

    await waitFor(() => expect(screen.getAllByText("Aufgabe anlegen").length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole("button", { name: "Ausführen" }));

    await waitFor(() => expect(aiApiMock.executeAiAgentActions).toHaveBeenCalledWith(expect.objectContaining({ actions: expect.any(Array) })));
  });

  it("blockiert Ausführung bei Backend-Blockern", async () => {
    aiApiMock.getAiModels.mockResolvedValue({
      provider: "ollama",
      baseUrl: "http://127.0.0.1:11434/api",
      defaultModel: "llama3.2:1b",
      available: true,
      models: []
    });
    aiApiMock.planAiAgentActions.mockResolvedValue({
      status: "blocked",
      model: "llama3.2:1b",
      message: "Klärung nötig",
      blockers: ["Projekt ist mehrdeutig."],
      actions: []
    });

    renderWithProviders(<AiAgentPanel open onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Auftrag"), { target: { value: "Erstelle Aufgabe" } });
    fireEvent.click(screen.getByRole("button", { name: "Planen" }));

    await waitFor(() => expect(screen.getAllByText("Projekt ist mehrdeutig.").length).toBeGreaterThan(0));
    expect(screen.getByRole("button", { name: "Ausführen" })).toBeDisabled();
  });
});
