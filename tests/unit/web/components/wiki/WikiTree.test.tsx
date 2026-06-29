// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte WikiTree-Komponente mit React Router MemoryRouter.
 *
 * Mock-Entscheidung:
 * - Keine API-Mocks; nur lokale Testdaten für den Wiki-Baum.
 *
 * Isolation:
 * - jsdom ohne echte Navigation außerhalb des MemoryRouter.
 *
 * Abgedeckte Regeln:
 * - WikiTree rendert im Dark-Sidebar-Stil.
 * - Aktive und inaktive Nodes erhalten die neuen Sidebar-Klassen.
 * - Root- und Unterseiten-Erstellung bleiben verdrahtet.
 * - Expand/Collapse funktioniert weiterhin.
 *
 * Fehlerfälle:
 * - Der frühere doppelte Wiki-Header darf nicht mehr sichtbar sein.
 * - Eingeklappte Kinder dürfen nicht weiter angezeigt werden.
 *
 * Ziel:
 * Die visuelle Umstellung des WikiTree ohne Regression der Tree-Interaktion absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { WikiTreeState } from "@taskmanager/shared-types";
import type { ReactNode } from "react";
import { useState } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WikiTree } from "../../../../../apps/web/src/components/wiki/WikiTree";
import type { WikiTreeNode } from "../../../../../apps/web/src/hooks/useWiki";

const dndMock = vi.hoisted(() => ({
  context: undefined as
    | {
        onDragEnd?: (event: unknown) => void;
      }
    | undefined
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext({ children, onDragEnd }: { children: ReactNode; onDragEnd?: (event: unknown) => void }) {
    dndMock.context = { onDragEnd };
    return <div data-testid="wiki-tree-dnd-context">{children}</div>;
  },
  DragOverlay({ children }: { children: ReactNode }) {
    return <div data-testid="wiki-tree-drag-overlay">{children}</div>;
  },
  PointerSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn((...sensors: unknown[]) => sensors),
  useDroppable: vi.fn(() => ({
    isOver: false,
    setNodeRef: vi.fn()
  })),
  useDraggable: vi.fn(({ disabled, id }: { disabled?: boolean; id: string }) => ({
    attributes: { "data-draggable-id": id },
    listeners: disabled ? {} : { onPointerDown: vi.fn() },
    setActivatorNodeRef: vi.fn(),
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false
  }))
}));

const childPage: WikiTreeNode = {
  id: 2,
  parentId: 1,
  title: "Unterseite",
  content: "",
  sortOrder: 0,
  childCount: 0,
  attachmentCount: 0,
  taskCount: 0,
  ticketCount: 0,
  relatedPages: [],
  version: 1,
  createdAt: "2026-05-29T08:00:00.000Z",
  updatedAt: "2026-05-29T08:00:00.000Z",
  children: [],
};

const rootPage: WikiTreeNode = {
  ...childPage,
  id: 1,
  parentId: null,
  title: "Rootseite",
  childCount: 1,
  children: [childPage],
};

const targetRootPage: WikiTreeNode = {
  ...childPage,
  id: 3,
  parentId: null,
  title: "Ziel Root",
  childCount: 0,
  children: [],
};

function renderTree(
  onCreate = vi.fn(),
  options: {
    tree?: WikiTreeNode[];
    canMove?: boolean;
    treeState?: WikiTreeState;
    onTreeStateChange?: (treeState: WikiTreeState) => void;
    onMove?: (page: WikiTreeNode, nextParentId: number | null, newOrder: WikiTreeNode[]) => Promise<void>;
  } = {}
) {
  function WikiTreeHarness() {
    const [treeState, setTreeState] = useState<WikiTreeState>(options.treeState ?? { sidebarCollapsed: false, collapsedPageIds: [] });
    const handleTreeStateChange = (nextTreeState: WikiTreeState) => {
      options.onTreeStateChange?.(nextTreeState);
      setTreeState(nextTreeState);
    };
    return (
      <WikiTree
        tree={options.tree ?? [rootPage]}
        onCreate={onCreate}
        canMove={options.canMove}
        treeState={treeState}
        onTreeStateChange={handleTreeStateChange}
        onMove={options.onMove}
      />
    );
  }

  return render(
    <MemoryRouter initialEntries={["/wiki/2"]}>
      <Routes>
        <Route path="/wiki/:id" element={<WikiTreeHarness />} />
      </Routes>
    </MemoryRouter>,
  );
}

function triggerDragEnd(page: WikiTreeNode, overId: string | null) {
  dndMock.context?.onDragEnd?.({
    active: { data: { current: { page } } },
    over: overId === null ? null : { id: overId }
  });
}

afterEach(() => {
  cleanup();
  dndMock.context = undefined;
});

describe("WikiTree", () => {
  it("rendert als Dark Sidebar ohne doppelten Wiki-Header", () => {
    renderTree();

    const aside = screen.getByText("Seiten").closest("aside");
    expect(aside).toHaveClass("bg-gradient-to-b", "from-steel-800", "to-steel-900");
    expect(screen.queryByRole("heading", { name: "Wiki" })).not.toBeInTheDocument();
  });

  it("markiert aktive und inaktive Nodes im Sidebar-Stil", () => {
    renderTree();

    expect(screen.getByRole("link", { name: "Unterseite" }).closest(".wiki-tree-nav-row")).toHaveClass("wiki-tree-nav-row-active");
    expect(screen.getByRole("link", { name: "Rootseite" }).closest(".wiki-tree-nav-row")).not.toHaveClass("wiki-tree-nav-row-active");
    expect(screen.getByRole("link", { name: "Rootseite" })).toHaveClass("wiki-tree-nav-link");
  });

  it("behält Root- und Unterseiten-Erstellung bei", () => {
    const onCreate = vi.fn();
    renderTree(onCreate);

    fireEvent.click(screen.getByRole("button", { name: "Neue Root-Seite" }));
    expect(onCreate).toHaveBeenCalledWith(null);

    fireEvent.click(screen.getAllByRole("button", { name: "Unterseite anlegen" })[0]);
    expect(onCreate).toHaveBeenCalledWith(rootPage);
  });

  it("öffnet Wiki-Seiten aus dem Baum in einer Standalone-Tab-Ansicht", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    renderTree();

    fireEvent.click(screen.getByRole("button", { name: "Rootseite in neuem Tab öffnen" }));

    expect(openSpy).toHaveBeenCalledWith("/wiki/1?standalone=1", "_blank");
    openSpy.mockRestore();
  });

  it("klappt Kindseiten weiterhin ein und aus", () => {
    renderTree();

    fireEvent.click(screen.getAllByRole("button", { name: "Einklappen" })[0]);

    expect(screen.queryByRole("link", { name: "Unterseite" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ausklappen" })).toBeInTheDocument();
  });

  it("meldet den kontrollierten Collapse-State nach außen", () => {
    const onTreeStateChange = vi.fn();
    renderTree(vi.fn(), { onTreeStateChange });

    fireEvent.click(screen.getAllByRole("button", { name: "Einklappen" })[0]);

    expect(onTreeStateChange).toHaveBeenCalledWith({ sidebarCollapsed: false, collapsedPageIds: [1] });
  });

  it("zeigt Griphandles bei canMove und verschiebt auf eine Zielseite", () => {
    const onMove = vi.fn().mockResolvedValue(undefined);
    renderTree(vi.fn(), { tree: [rootPage, targetRootPage], canMove: true, onMove });

    expect(screen.getByRole("button", { name: "Unterseite verschieben" })).toBeInTheDocument();

    triggerDragEnd(childPage, "wiki-page-3");

    expect(onMove).toHaveBeenCalledWith(childPage, 3, [childPage]);
  });

  it("verschiebt Seiten über die Root-Zone auf Root-Ebene", () => {
    const onMove = vi.fn().mockResolvedValue(undefined);
    renderTree(vi.fn(), { canMove: true, onMove });

    expect(screen.getByText("Root-Ebene")).toBeInTheDocument();

    triggerDragEnd(childPage, "wiki-root");

    expect(onMove).toHaveBeenCalledWith(childPage, null, [rootPage, childPage]);
  });

  it("ignoriert Drops auf sich selbst oder ohne Ziel", () => {
    const onMove = vi.fn().mockResolvedValue(undefined);
    renderTree(vi.fn(), { canMove: true, onMove });

    triggerDragEnd(childPage, "wiki-page-2");
    triggerDragEnd(childPage, null);

    expect(onMove).not.toHaveBeenCalled();
  });
});
