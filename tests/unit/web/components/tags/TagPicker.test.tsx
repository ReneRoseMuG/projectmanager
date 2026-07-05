// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TagPicker (default) rendert Tag-Icon, ausgewählte Pills, Hinzufügen-Button und Inline-Dropdown.
 * - TagPicker (panel) rendert eine Karte mit Tags-Header und öffnet das Dropdown via createPortal.
 * - Tags können hinzugefügt und entfernt werden.
 * - Der Picker zeigt im Dropdown nur Tags seiner Domäne (pm/dms) und legt neue Tags in dieser Domäne an.
 *
 * Fehlerfälle:
 * - Das Dropdown der panel-Variante muss via Portal an document.body gehängt werden, damit
 *   overflow:auto des FormSidebar-Scrollbereichs es nicht abschneidet (TKT-83).
 * - Ein Tag der jeweils anderen Domäne darf im Dropdown nicht auftauchen (Gegenbeispiel).
 *
 * Ziel:
 * TagPicker gegen Regressionen bei Panel-Portal-Rendering, Tag-Verwaltung, Dropdown-Öffnung und
 * Domänen-Sichtbarkeit (PM/DMS) absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TagPicker } from "../../../../../apps/web/src/components/tags/TagPicker";

const mockTags = [
  { id: 1, name: "Bug", color: "#dc2626", domain: "pm", version: 1 },
  { id: 2, name: "Feature", color: "#0f766e", domain: "pm", version: 1 },
  { id: 3, name: "Vertrag", color: "#7c3aed", domain: "dms", version: 1 },
];

const createTagMock = vi.fn().mockResolvedValue({ id: 9, name: "Neu", color: "#111111", domain: "dms", version: 1 });

// Der Mock liefert bewusst ALLE Domänen zurück; die Domänen-Trennung im Dropdown
// entsteht durch den Filter der Komponente selbst und wird so direkt geprüft.
vi.mock("../../../../../apps/web/src/hooks/useTags", () => ({
  useTags: () => ({
    tags: mockTags,
    loading: false,
    error: null,
    reload: vi.fn(),
    createTag: createTagMock,
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TagPicker — default variant", () => {
  it("rendert Tags-Label und Hinzufügen-Button", () => {
    render(<TagPicker selected={[]} onChange={vi.fn()} domain="pm" />);

    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tag hinzufügen" })).toBeInTheDocument();
  });

  it("zeigt ausgewählte Tags als Pills mit Entfernen-Button", () => {
    render(<TagPicker selected={[mockTags[0]!]} onChange={vi.fn()} domain="pm" />);

    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: 'Tag "Bug" entfernen' })).toBeInTheDocument();
  });

  it("entfernt ausgewählten Tag und ruft onChange ohne ihn auf", () => {
    const onChange = vi.fn();
    render(<TagPicker selected={[mockTags[0]!]} onChange={onChange} domain="pm" />);

    fireEvent.click(screen.getByRole("button", { name: 'Tag "Bug" entfernen' }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("öffnet Inline-Dropdown mit verfügbaren Tags bei Klick auf Hinzufügen", () => {
    render(<TagPicker selected={[]} onChange={vi.fn()} domain="pm" />);

    fireEvent.click(screen.getByRole("button", { name: "Tag hinzufügen" }));

    expect(screen.getByPlaceholderText("Suchen…")).toBeInTheDocument();
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Feature")).toBeInTheDocument();
  });

  it("fügt Tag per Klick hinzu und ruft onChange auf", () => {
    const onChange = vi.fn();
    render(<TagPicker selected={[]} onChange={onChange} domain="pm" />);

    fireEvent.click(screen.getByRole("button", { name: "Tag hinzufügen" }));
    fireEvent.click(screen.getByText("Bug"));

    expect(onChange).toHaveBeenCalledWith([mockTags[0]]);
  });

  it("filtert bereits ausgewählte Tags aus dem Dropdown", () => {
    render(<TagPicker selected={[mockTags[0]!]} onChange={vi.fn()} domain="pm" />);

    fireEvent.click(screen.getByRole("button", { name: "Tag hinzufügen" }));

    const dropdown = screen.getByPlaceholderText("Suchen…").closest("div")!.parentElement!;
    expect(within(dropdown).queryByText("Bug")).not.toBeInTheDocument();
    expect(within(dropdown).getByText("Feature")).toBeInTheDocument();
  });
});

describe("TagPicker — panel variant", () => {
  it("rendert Panel-Karte mit Tags-Header und Hinzufügen-Button", () => {
    render(<TagPicker selected={[]} onChange={vi.fn()} domain="pm" variant="panel" />);

    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tag hinzufügen" })).toBeInTheDocument();
  });

  it("zeigt ausgewählte Tags als Pills in der Panel-Karte", () => {
    render(<TagPicker selected={[mockTags[0]!]} onChange={vi.fn()} domain="pm" variant="panel" />);

    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: 'Tag "Bug" entfernen' })).toBeInTheDocument();
  });

  it("öffnet Dropdown via Portal in document.body bei Klick auf Hinzufügen", () => {
    render(<TagPicker selected={[]} onChange={vi.fn()} domain="pm" variant="panel" />);

    fireEvent.click(screen.getByRole("button", { name: "Tag hinzufügen" }));

    const searchInput = screen.getByPlaceholderText("Suchen…");
    expect(searchInput).toBeInTheDocument();

    // Das Portal rendert direkt in document.body, nicht innerhalb des Panel-Containers
    const panelContainer = screen.getByText("Tags").closest("div")!;
    expect(panelContainer).not.toContainElement(searchInput);
    expect(document.body).toContainElement(searchInput);
  });

  it("das Portal-Dropdown hat position:fixed", () => {
    render(<TagPicker selected={[]} onChange={vi.fn()} domain="pm" variant="panel" />);

    fireEvent.click(screen.getByRole("button", { name: "Tag hinzufügen" }));

    const portalDropdown = screen.getByPlaceholderText("Suchen…").closest(".rounded-md") as HTMLElement;
    expect(portalDropdown.style.position).toBe("fixed");
  });

  it("fügt Tag per Klick hinzu und ruft onChange auf", () => {
    const onChange = vi.fn();
    render(<TagPicker selected={[]} onChange={onChange} domain="pm" variant="panel" />);

    fireEvent.click(screen.getByRole("button", { name: "Tag hinzufügen" }));
    fireEvent.click(screen.getByText("Bug"));

    expect(onChange).toHaveBeenCalledWith([mockTags[0]]);
  });

  it("entfernt ausgewählten Tag und ruft onChange ohne ihn auf", () => {
    const onChange = vi.fn();
    render(<TagPicker selected={[mockTags[0]!]} onChange={onChange} domain="pm" variant="panel" />);

    fireEvent.click(screen.getByRole("button", { name: 'Tag "Bug" entfernen' }));

    expect(onChange).toHaveBeenCalledWith([]);
  });
});

describe("TagPicker — Domänen-Sichtbarkeit (PM/DMS)", () => {
  it("PM-Picker zeigt im Dropdown nur PM-Tags, keinen DMS-Tag", () => {
    render(<TagPicker selected={[]} onChange={vi.fn()} domain="pm" />);

    fireEvent.click(screen.getByRole("button", { name: "Tag hinzufügen" }));

    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Feature")).toBeInTheDocument();
    expect(screen.queryByText("Vertrag")).not.toBeInTheDocument();
  });

  it("DMS-Picker zeigt im Dropdown nur DMS-Tags, keinen PM-Tag", () => {
    render(<TagPicker selected={[]} onChange={vi.fn()} domain="dms" />);

    fireEvent.click(screen.getByRole("button", { name: "Tag hinzufügen" }));

    expect(screen.getByText("Vertrag")).toBeInTheDocument();
    expect(screen.queryByText("Bug")).not.toBeInTheDocument();
    expect(screen.queryByText("Feature")).not.toBeInTheDocument();
  });

  it("legt ein neues Tag mit der Domäne des Pickers an (dms)", async () => {
    render(<TagPicker selected={[]} onChange={vi.fn()} domain="dms" />);

    fireEvent.click(screen.getByRole("button", { name: "Tag hinzufügen" }));
    fireEvent.change(screen.getByPlaceholderText("Neues Tag…"), { target: { value: "Rechnung" } });
    fireEvent.click(screen.getByRole("button", { name: "Neu" }));

    await waitFor(() => {
      expect(createTagMock).toHaveBeenCalledWith({ name: "Rechnung", color: expect.any(String), domain: "dms" });
    });
  });
});
