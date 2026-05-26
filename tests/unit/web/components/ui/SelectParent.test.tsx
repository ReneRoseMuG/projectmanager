// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte React-Komponente mit DOM-Events; Status-Katalog als kleiner Hook-Stub ohne Einfluss auf Auswahlverhalten.
 *
 * Mock-Entscheidung:
 * - useCatalogs wird gestubbt, damit StatusPill deterministische Labels rendert.
 *
 * Isolation:
 * - jsdom ohne DB- oder Dateisystemzugriff.
 *
 * Abgedeckte Regeln:
 * - SelectParent ist kontrolliert, filtert über die Suche und zeigt die gewählte ItemRow.
 *
 * Fehlerfälle:
 * - Leere Liste, Suche ohne Treffer, Disabled-Zustand und Schließen per Outside-Click/Escape.
 *
 * Ziel:
 * Die generische Parent-Auswahl als reine UI-Komponente absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SelectParentItem } from "../../../../../apps/web/src/components/ui/SelectParent";
import { SelectParent } from "../../../../../apps/web/src/components/ui/SelectParent";

vi.mock("../../../../../apps/web/src/hooks/useCatalogs", () => ({
  useCatalogs() {
    return {
      entries: [
        {
          id: 1,
          kind: "workStatus",
          key: "active",
          label: "Aktiv",
          color: "var(--color-fern)",
          sortOrder: 100,
          isClosed: false,
          version: 1,
          createdAt: "",
          updatedAt: "",
        },
      ],
    };
  },
}));

const items: SelectParentItem[] = [
  {
    id: 1,
    title: "Projekt Alpha",
    accentColor: "var(--color-steel-700)",
    statusKind: "workStatus",
    statusValue: "active",
    meta: "3 offene Aufgaben",
  },
  {
    id: 2,
    title: "Projekt Beta",
    accentColor: "var(--color-teal)",
    statusKind: "workStatus",
    statusValue: "active",
    meta: "8 offene Aufgaben",
  },
];

afterEach(() => {
  cleanup();
});

function renderSelectParent(
  props: Partial<{
    items: SelectParentItem[];
    value: SelectParentItem | null;
    onChange: (item: SelectParentItem | null) => void;
    disabled: boolean;
  }> = {},
) {
  const onChange = props.onChange ?? vi.fn();
  render(
    <SelectParent
      type="project"
      label="Projekt"
      placeholder="Projekt wählen ..."
      items={props.items ?? items}
      value={props.value ?? null}
      disabled={props.disabled}
      onChange={onChange}
    />,
  );
  return { onChange };
}

describe("SelectParent", () => {
  it("zeigt den Placeholder wenn kein Item gewählt ist", () => {
    renderSelectParent();

    expect(screen.getByRole("button", { name: /Projekt wählen/ })).toBeInTheDocument();
  });

  it("zeigt den Titel des gewählten Items und die ItemRow", () => {
    renderSelectParent({ value: items[0] ?? null });

    expect(screen.getByRole("button", { name: "Projekt Alpha" })).toBeInTheDocument();
    expect(screen.getByText("Aktiv")).toBeInTheDocument();
    expect(screen.getByText("3 offene Aufgaben")).toBeInTheDocument();
  });

  it("öffnet das Dropdown per Trigger und filtert die Liste über Suche", () => {
    renderSelectParent();

    fireEvent.click(screen.getByRole("button", { name: /Projekt wählen/ }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Projekt Alpha/ })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Projekt suchen"), {
      target: { value: "Beta" },
    });

    expect(screen.queryByRole("option", { name: /Projekt Alpha/ })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Projekt Beta/ })).toBeInTheDocument();
  });

  it("ruft onChange mit dem Item auf und schließt das Dropdown", () => {
    const { onChange } = renderSelectParent();

    fireEvent.click(screen.getByRole("button", { name: /Projekt wählen/ }));
    fireEvent.click(screen.getByRole("option", { name: /Projekt Beta/ }));

    expect(onChange).toHaveBeenCalledWith(items[1]);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("schließt das Dropdown bei Klick außerhalb und bei Escape", () => {
    renderSelectParent();

    fireEvent.click(screen.getByRole("button", { name: /Projekt wählen/ }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Projekt wählen/ }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("ruft onChange(null) über den Entfernen-Button auf", () => {
    const { onChange } = renderSelectParent({ value: items[0] ?? null });

    fireEvent.click(screen.getByRole("button", { name: "Projekt Alpha entfernen" }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("ist disabled nicht klickbar und zeigt keinen Entfernen-Button", () => {
    renderSelectParent({ value: items[0] ?? null, disabled: true });

    const trigger = screen.getByRole("button", { name: /Projekt Alpha/ });
    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Projekt Alpha entfernen" })).not.toBeInTheDocument();
  });

  it("zeigt einen Leerzustand wenn keine Items vorhanden sind", () => {
    renderSelectParent({ items: [] });

    fireEvent.click(screen.getByRole("button", { name: /Projekt wählen/ }));

    expect(screen.getByText("Keine Einträge vorhanden")).toBeInTheDocument();
  });

  it("zeigt einen Keine-Ergebnisse-Zustand wenn die Suche keine Treffer hat", () => {
    renderSelectParent();

    fireEvent.click(screen.getByRole("button", { name: /Projekt wählen/ }));
    fireEvent.change(screen.getByPlaceholderText("Projekt suchen"), {
      target: { value: "Gamma" },
    });

    expect(screen.getByText("Keine Ergebnisse für „Gamma“")).toBeInTheDocument();
  });
});
