// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - RelationPanel rendert verfügbare Items, verknüpfte Items zuerst, Suche und optionale Gruppierung.
 * - Toggle-Änderungen bleiben lokal über onChange und speichern erst über den Speichern-Button.
 *
 * Fehlerfälle:
 * - Checkbox-Toggles dürfen onSave nicht auslösen.
 * - Leere verfügbare Relationstabellen müssen den EmptyState anzeigen.
 *
 * Ziel:
 * Den generischen n:m-Relation-Manager gegen Regressionsfehler bei Auswahl, Suche, Sortierung und Speicherung absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RelationPanel, type RelationItem } from "../RelationPanel";

interface TestRelationItem extends RelationItem {
  title: string;
  description: string;
  group: string;
}

const items: TestRelationItem[] = [
  { id: 1, title: "Alpha", description: "Erste Relation", group: "A" },
  { id: 2, title: "Beta", description: "Zweite Relation", group: "B" },
  { id: 3, title: "Gamma", description: "Dritte Relation", group: "A" }
];

function renderRelationPanel({
  relationItems = items,
  selectedIds = [2],
  onChange = vi.fn(),
  onSave = vi.fn()
}: {
  relationItems?: TestRelationItem[];
  selectedIds?: number[];
  onChange?: (ids: number[]) => void;
  onSave?: () => Promise<void>;
} = {}) {
  return render(
    <RelationPanel
      items={relationItems}
      selectedIds={selectedIds}
      onChange={onChange}
      onSave={onSave}
      title="Relationen"
      searchKeys={["title", "description"]}
      emptyAvailable={<div>Keine Relationen verfügbar</div>}
      renderItem={(item, checked) => (
        <span>
          <span data-testid="relation-title">{item.title}</span>
          {checked ? <span> verknüpft</span> : null}
        </span>
      )}
    />
  );
}

afterEach(() => {
  cleanup();
});

describe("RelationPanel", () => {
  it("rendert alle items", () => {
    renderRelationPanel();

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
  });

  it("verknüpfte Items erscheinen vor unverknüpften", () => {
    renderRelationPanel({ selectedIds: [3] });

    const titles = screen.getAllByTestId("relation-title").map((item) => item.textContent);

    expect(titles).toEqual(["Gamma", "Alpha", "Beta"]);
  });

  it("Toggle ändert selectedIds", () => {
    const onChange = vi.fn();
    const onSave = vi.fn();
    renderRelationPanel({ selectedIds: [2], onChange, onSave });

    fireEvent.click(screen.getByRole("checkbox", { name: /Alpha/ }));

    expect(onChange).toHaveBeenCalledWith([2, 1]);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("Speichern ruft onSave auf", () => {
    const onSave = vi.fn();
    renderRelationPanel({ onSave });

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("Suche filtert items nach searchKeys", () => {
    renderRelationPanel();

    fireEvent.change(screen.getByPlaceholderText("Suchen"), { target: { value: "Dritte" } });

    expect(screen.getByText("Gamma")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  });

  it("groupBy rendert Trennlinien", () => {
    render(
      <RelationPanel
        items={items}
        selectedIds={[]}
        onChange={vi.fn()}
        onSave={vi.fn()}
        title="Relationen"
        groupBy="group"
        groupLabel={(group) => `Gruppe ${String(group)}`}
        renderItem={(item) => <span>{item.title}</span>}
      />
    );

    expect(screen.getByText("Gruppe A")).toBeInTheDocument();
    expect(screen.getByText("Gruppe B")).toBeInTheDocument();
  });

  it("emptyAvailable erscheint wenn items=[]", () => {
    renderRelationPanel({ relationItems: [] });

    expect(screen.getByText("Keine Relationen verfügbar")).toBeInTheDocument();
  });
});
