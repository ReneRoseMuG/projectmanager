// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TagPicker (default) rendert Tag-Icon, ausgewählte Pills, Hinzufügen-Button und Inline-Dropdown.
 * - TagPicker (panel) rendert eine Karte mit Tags-Header und öffnet das Dropdown via createPortal.
 * - Tags können hinzugefügt und entfernt werden.
 *
 * Fehlerfälle:
 * - Das Dropdown der panel-Variante muss via Portal an document.body gehängt werden, damit
 *   overflow:auto des FormSidebar-Scrollbereichs es nicht abschneidet (TKT-83).
 *
 * Ziel:
 * TagPicker gegen Regressionen bei Panel-Portal-Rendering, Tag-Verwaltung und Dropdown-Öffnung absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, within } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TagPicker } from "../../../../../apps/web/src/components/tags/TagPicker";

const mockTags = [
  { id: 1, name: "Bug", color: "#dc2626", version: 1 },
  { id: 2, name: "Feature", color: "#0f766e", version: 1 },
];

vi.mock("../../../../../apps/web/src/hooks/useTags", () => ({
  useTags: () => ({
    tags: mockTags,
    loading: false,
    error: null,
    reload: vi.fn(),
    createTag: vi.fn().mockResolvedValue({ id: 3, name: "Neu", color: "#111111", version: 1 }),
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TagPicker — default variant", () => {
  it("rendert Tags-Label und Hinzufügen-Button", () => {
    render(<TagPicker selected={[]} onChange={vi.fn()} />);

    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tag hinzufügen" })).toBeInTheDocument();
  });

  it("zeigt ausgewählte Tags als Pills mit Entfernen-Button", () => {
    render(<TagPicker selected={[mockTags[0]!]} onChange={vi.fn()} />);

    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: 'Tag "Bug" entfernen' })).toBeInTheDocument();
  });

  it("entfernt ausgewählten Tag und ruft onChange ohne ihn auf", () => {
    const onChange = vi.fn();
    render(<TagPicker selected={[mockTags[0]!]} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: 'Tag "Bug" entfernen' }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("öffnet Inline-Dropdown mit verfügbaren Tags bei Klick auf Hinzufügen", () => {
    render(<TagPicker selected={[]} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Tag hinzufügen" }));

    expect(screen.getByPlaceholderText("Suchen…")).toBeInTheDocument();
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Feature")).toBeInTheDocument();
  });

  it("fügt Tag per Klick hinzu und ruft onChange auf", () => {
    const onChange = vi.fn();
    render(<TagPicker selected={[]} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Tag hinzufügen" }));
    fireEvent.click(screen.getByText("Bug"));

    expect(onChange).toHaveBeenCalledWith([mockTags[0]]);
  });

  it("filtert bereits ausgewählte Tags aus dem Dropdown", () => {
    render(<TagPicker selected={[mockTags[0]!]} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Tag hinzufügen" }));

    const dropdown = screen.getByPlaceholderText("Suchen…").closest("div")!.parentElement!;
    expect(within(dropdown).queryByText("Bug")).not.toBeInTheDocument();
    expect(within(dropdown).getByText("Feature")).toBeInTheDocument();
  });
});

describe("TagPicker — panel variant", () => {
  it("rendert Panel-Karte mit Tags-Header und Hinzufügen-Button", () => {
    render(<TagPicker selected={[]} onChange={vi.fn()} variant="panel" />);

    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tag hinzufügen" })).toBeInTheDocument();
  });

  it("zeigt ausgewählte Tags als Pills in der Panel-Karte", () => {
    render(<TagPicker selected={[mockTags[0]!]} onChange={vi.fn()} variant="panel" />);

    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: 'Tag "Bug" entfernen' })).toBeInTheDocument();
  });

  it("öffnet Dropdown via Portal in document.body bei Klick auf Hinzufügen", () => {
    render(<TagPicker selected={[]} onChange={vi.fn()} variant="panel" />);

    fireEvent.click(screen.getByRole("button", { name: "Tag hinzufügen" }));

    const searchInput = screen.getByPlaceholderText("Suchen…");
    expect(searchInput).toBeInTheDocument();

    // Das Portal rendert direkt in document.body, nicht innerhalb des Panel-Containers
    const panelContainer = screen.getByText("Tags").closest("div")!;
    expect(panelContainer).not.toContainElement(searchInput);
    expect(document.body).toContainElement(searchInput);
  });

  it("das Portal-Dropdown hat position:fixed", () => {
    render(<TagPicker selected={[]} onChange={vi.fn()} variant="panel" />);

    fireEvent.click(screen.getByRole("button", { name: "Tag hinzufügen" }));

    const portalDropdown = screen.getByPlaceholderText("Suchen…").closest(".rounded-md") as HTMLElement;
    expect(portalDropdown.style.position).toBe("fixed");
  });

  it("fügt Tag per Klick hinzu und ruft onChange auf", () => {
    const onChange = vi.fn();
    render(<TagPicker selected={[]} onChange={onChange} variant="panel" />);

    fireEvent.click(screen.getByRole("button", { name: "Tag hinzufügen" }));
    fireEvent.click(screen.getByText("Bug"));

    expect(onChange).toHaveBeenCalledWith([mockTags[0]]);
  });

  it("entfernt ausgewählten Tag und ruft onChange ohne ihn auf", () => {
    const onChange = vi.fn();
    render(<TagPicker selected={[mockTags[0]!]} onChange={onChange} variant="panel" />);

    fireEvent.click(screen.getByRole("button", { name: 'Tag "Bug" entfernen' }));

    expect(onChange).toHaveBeenCalledWith([]);
  });
});
