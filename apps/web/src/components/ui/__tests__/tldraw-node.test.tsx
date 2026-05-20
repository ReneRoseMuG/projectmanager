// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TldrawNodeView rendert Vorschau, Editor-Zustand und TLDraw-Canvas korrekt.
 * - Commit serialisiert den aktuellen TLDraw-Snapshot und erzeugt eine SVG-Vorschau.
 * - Abbrechen verändert das TipTap-Node-Attribut nicht.
 * - Erzeugte Object-URLs werden beim Unmount freigegeben.
 *
 * Fehlerfälle:
 * - TLDraw selbst wird in jsdom nicht ausgeführt und deshalb vollständig gemockt.
 * - Ein leerer oder noch nicht exportierter Snapshot fällt auf den Platzhalter zurück.
 *
 * Ziel:
 * Die TipTap-NodeView gegen Regressionsfehler bei Zustandswechseln und Snapshot-Commit absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { ReactNodeViewProps } from "@tiptap/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TldrawNodeView } from "../TldrawNodeView";

interface MockTldrawSnapshot {
  document: {
    store: Record<string, unknown>;
    schema: Record<string, unknown>;
  };
  session: Record<string, unknown>;
}

interface MockTldrawEditor {
  getSnapshot: ReturnType<typeof vi.fn<[], MockTldrawSnapshot>>;
  getCurrentPageShapeIds: ReturnType<typeof vi.fn<[], Set<string>>>;
}

interface ExportToBlobInput {
  editor: MockTldrawEditor;
  ids: string[];
  format: "svg";
  opts?: { background: boolean };
}

type UpdateAttributesMock = ReturnType<typeof vi.fn<[Record<string, unknown>], void>>;

const tldrawMocks = vi.hoisted(() => ({
  currentShapeIds: ["shape:one"],
  exportToBlob: vi.fn<[ExportToBlobInput], Promise<Blob>>(),
  lastEditor: undefined as MockTldrawEditor | undefined,
  snapshot: {
    document: {
      store: {
        "shape:one": { id: "shape:one", typeName: "shape" }
      },
      schema: {}
    },
    session: {}
  } as MockTldrawSnapshot
}));

const createObjectUrlMock = vi.fn<[Blob], string>(() => "blob:tldraw-preview");
const revokeObjectUrlMock = vi.fn<[string], void>();
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

vi.mock("@tldraw/tldraw", () => ({
  Tldraw: ({ onMount }: { onMount?: (editor: MockTldrawEditor) => void }) => {
    const mockEditor: MockTldrawEditor = {
      getSnapshot: vi.fn(() => tldrawMocks.snapshot),
      getCurrentPageShapeIds: vi.fn(() => new Set(tldrawMocks.currentShapeIds))
    };

    tldrawMocks.lastEditor = mockEditor;
    onMount?.(mockEditor);
    return <div data-testid="tldraw-canvas" />;
  },
  exportToBlob: tldrawMocks.exportToBlob
}));

vi.mock("@tiptap/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tiptap/react")>();
  return {
    ...actual,
    NodeViewWrapper: ({ children }: { children: ReactNode }) => <div>{children}</div>
  };
});

function renderNodeView({
  selected = false,
  snapshot = "",
  updateAttributes = vi.fn<[Record<string, unknown>], void>()
}: {
  selected?: boolean;
  snapshot?: string;
  updateAttributes?: UpdateAttributesMock;
} = {}) {
  const props = {
    node: { attrs: { snapshot } },
    selected,
    updateAttributes
  } as unknown as ReactNodeViewProps;

  return {
    updateAttributes,
    ...render(<TldrawNodeView {...props} />)
  };
}

beforeEach(() => {
  tldrawMocks.currentShapeIds = ["shape:one"];
  tldrawMocks.lastEditor = undefined;
  tldrawMocks.exportToBlob.mockResolvedValue(new Blob(["<svg/>"], { type: "image/svg+xml" }));
  createObjectUrlMock.mockReturnValue("blob:tldraw-preview");
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrlMock });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectUrlMock });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: originalCreateObjectURL });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: originalRevokeObjectURL });
});

describe("TldrawNodeView", () => {
  it("TN-01 Vorschau leer: rendert Platzhalter wenn snapshot leer ist", () => {
    renderNodeView();

    expect(screen.getByTestId("tldraw-node-preview")).toBeInTheDocument();
    expect(screen.getByText("Zeichnung — Doppelklick zum Bearbeiten")).toBeInTheDocument();
  });

  it("TN-02 Vorschau leer: zeigt Zeichnung und PenLine-Icon", () => {
    renderNodeView();

    const preview = screen.getByTestId("tldraw-node-preview");
    expect(preview).toHaveTextContent("Zeichnung");
    expect(preview.querySelector("svg")).toBeInTheDocument();
  });

  it("TN-03 Vorschau: rendert img-Tag wenn previewSvg vorhanden ist", async () => {
    renderNodeView();

    fireEvent.doubleClick(screen.getByTestId("tldraw-node-preview"));
    fireEvent.click(screen.getByTestId("tldraw-node-commit"));

    await waitFor(() => expect(screen.getByRole("img", { name: "Zeichnung" })).toBeInTheDocument());
    expect(screen.getByRole("img", { name: "Zeichnung" })).toHaveAttribute("src", "blob:tldraw-preview");
  });

  it("TN-04 Doppelklick auf Vorschau: Editor-Container erscheint", () => {
    renderNodeView();

    fireEvent.doubleClick(screen.getByTestId("tldraw-node-preview"));

    expect(screen.getByTestId("tldraw-node-editor")).toBeInTheDocument();
  });

  it("TN-05 Doppelklick auf Vorschau: Vorschau-Container verschwindet", () => {
    renderNodeView();

    fireEvent.doubleClick(screen.getByTestId("tldraw-node-preview"));

    expect(screen.queryByTestId("tldraw-node-preview")).not.toBeInTheDocument();
  });

  it("TN-06 Doppelklick: TLDraw-Canvas erscheint", () => {
    renderNodeView();

    fireEvent.doubleClick(screen.getByTestId("tldraw-node-preview"));

    expect(screen.getByTestId("tldraw-canvas")).toBeInTheDocument();
  });

  it("TN-07 Commit: updateAttributes wird aufgerufen mit serialisiertem Snapshot", async () => {
    const { updateAttributes } = renderNodeView();

    fireEvent.doubleClick(screen.getByTestId("tldraw-node-preview"));
    fireEvent.click(screen.getByTestId("tldraw-node-commit"));

    await waitFor(() =>
      expect(updateAttributes).toHaveBeenCalledWith({ snapshot: JSON.stringify(tldrawMocks.snapshot) })
    );
  });

  it("TN-08 Commit: Vorschau-Container erscheint wieder, Editor-Container verschwindet", async () => {
    renderNodeView();

    fireEvent.doubleClick(screen.getByTestId("tldraw-node-preview"));
    fireEvent.click(screen.getByTestId("tldraw-node-commit"));

    await waitFor(() => expect(screen.getByTestId("tldraw-node-preview")).toBeInTheDocument());
    expect(screen.queryByTestId("tldraw-node-editor")).not.toBeInTheDocument();
  });

  it("TN-09 Abbrechen: updateAttributes wird NICHT aufgerufen", () => {
    const { updateAttributes } = renderNodeView();

    fireEvent.doubleClick(screen.getByTestId("tldraw-node-preview"));
    fireEvent.click(screen.getByTestId("tldraw-node-cancel"));

    expect(updateAttributes).not.toHaveBeenCalled();
  });

  it("TN-10 Abbrechen: Vorschau-Container erscheint wieder, Editor-Container verschwindet", () => {
    renderNodeView();

    fireEvent.doubleClick(screen.getByTestId("tldraw-node-preview"));
    fireEvent.click(screen.getByTestId("tldraw-node-cancel"));

    expect(screen.getByTestId("tldraw-node-preview")).toBeInTheDocument();
    expect(screen.queryByTestId("tldraw-node-editor")).not.toBeInTheDocument();
  });

  it("TN-11 Kein doppelter Object-URL-Leak: revokeObjectURL wird beim Unmount aufgerufen", async () => {
    const { unmount } = renderNodeView();

    fireEvent.doubleClick(screen.getByTestId("tldraw-node-preview"));
    fireEvent.click(screen.getByTestId("tldraw-node-commit"));

    await waitFor(() => expect(createObjectUrlMock).toHaveBeenCalledTimes(1));
    expect(revokeObjectUrlMock).not.toHaveBeenCalled();

    unmount();

    expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:tldraw-preview");
  });
});
