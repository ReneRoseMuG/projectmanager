// @vitest-environment jsdom

/**
 * Test Scope:
 * SubtaskList
 *
 * Test-Ebene:
 * - Unit/jsdom.
 *
 * Realitätsgrad:
 * - Echte React-Komponente mit Katalog-Hook-Mock ohne API, DB oder Dateisystem.
 *
 * Mock-Entscheidung:
 * - `useCatalogs` wird isoliert, weil nur die Empty-State-Darstellung geprüft wird.
 *
 * Isolation:
 * - Kein DB- oder Dateisystemzugriff.
 *
 * Abgedeckte Regeln:
 * - Der leere Subtask-State nutzt das kanonische Aufgaben-Icon `ListTodo`.
 *
 * Fehlerfälle:
 * - Das alte Aufgaben-Ersatzicon `ListChecks` darf im Empty-State nicht erscheinen.
 *
 * Ziel:
 * Die MS-33-Icon-Vereinheitlichung für Subtask-Empty-States absichern.
 */
import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SubtaskList } from "../../../../../apps/web/src/components/tasks/SubtaskList";

vi.mock("../../../../../apps/web/src/hooks/useCatalogs", () => ({
  useCatalogs() {
    return {
      entries: [
        { id: 1, kind: "workStatus", key: "todo", label: "Offen", sortOrder: 1, isClosed: false, color: "var(--color-fern)", version: 1, createdAt: "", updatedAt: "" },
        { id: 2, kind: "workStatus", key: "done", label: "Erledigt", sortOrder: 2, isClosed: true, color: "var(--color-steel-500)", version: 1, createdAt: "", updatedAt: "" }
      ],
      workStatuses: [],
      featureStatuses: [],
      priorities: [],
      loading: false,
      error: null,
      reload: async () => undefined,
      createEntry: async () => undefined,
      updateEntry: async () => undefined,
      deleteEntry: async () => undefined
    };
  }
}));

afterEach(() => {
  cleanup();
});

describe("SubtaskList", () => {
  it("zeigt den leeren Zustand mit ListTodo statt ListChecks", () => {
    const { container } = render(
      <SubtaskList
        subtasks={[]}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Noch keine Tasks")).toBeInTheDocument();
    expect(container.querySelector(".lucide-list-todo")).toBeInTheDocument();
    expect(container.querySelector(".lucide-list-checks")).not.toBeInTheDocument();
  });
});
