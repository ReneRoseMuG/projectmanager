// @vitest-environment jsdom

/**
 * Test Scope: ListBoardView - Drag & Drop zwischen Status-Panels
 *
 * Abgedeckte Regeln:
 * - DnD wird nur aktiv, wenn onItemStatusChange übergeben wird.
 * - Board- und Listenmodus melden Drops auf bekannte fremde Status.
 * - Drop auf eigene oder unbekannte Status und abgebrochene Drags bleiben Noops.
 * - Statusgruppierte Listen rendern auch leere bekannte Status-Panels.
 *
 * Fehlerfälle:
 * - Abgebrochener Drag darf keine Mutation auslösen.
 *
 * Ziel:
 * Sicherstellen, dass die generische DnD-Callback-Logik und die leeren Listen-Panels korrekt funktionieren.
 */
import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/dom";
import { act, cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ItemCard } from "../../../../../apps/web/src/components/ui/ItemCard";
import { ItemRow } from "../../../../../apps/web/src/components/ui/ItemRow";
import {
  ListBoardView,
  type ListBoardMode,
} from "../../../../../apps/web/src/components/ui/ListBoardView";

type MockDndId = string | number;

interface MockDragStartEvent {
  active: { id: MockDndId };
}

interface MockDragEndEvent {
  active: { id: MockDndId };
  over: { id: MockDndId } | null;
}

interface MockDndContextProps {
  children: ReactNode;
  onDragStart?: (event: MockDragStartEvent) => void;
  onDragEnd?: (event: MockDragEndEvent) => void;
  onDragCancel?: () => void;
  sensors?: unknown;
}

const dndMock = vi.hoisted(() => ({
  contextProps: undefined as MockDndContextProps | undefined,
  draggableIds: [] as string[],
  droppableIds: [] as string[],
}));

vi.mock("@dnd-kit/core", async () => {
  const React = await vi.importActual<typeof import("react")>("react");

  return {
    DndContext: (props: MockDndContextProps) => {
      dndMock.contextProps = props;
      return React.createElement(
        "div",
        { "data-testid": "dnd-context" },
        props.children,
      );
    },
    DragOverlay: ({ children }: { children: ReactNode }) =>
      React.createElement("div", { "data-testid": "drag-overlay" }, children),
    KeyboardSensor: function KeyboardSensor() {
      return null;
    },
    PointerSensor: function PointerSensor() {
      return null;
    },
    useDraggable: ({ id }: { id: MockDndId }) => {
      dndMock.draggableIds.push(String(id));
      return {
        attributes: { "data-mock-draggable-id": String(id) },
        listeners: {},
        setNodeRef: vi.fn(),
        isDragging: false,
      };
    },
    useDroppable: ({ id }: { id: MockDndId; disabled?: boolean }) => {
      dndMock.droppableIds.push(String(id));
      return {
        setNodeRef: vi.fn(),
        isOver: false,
      };
    },
    useSensor: (sensor: unknown, options?: unknown) => ({ sensor, options }),
    useSensors: (...sensors: unknown[]) => sensors,
  };
});

vi.mock("@dnd-kit/sortable", () => ({
  sortableKeyboardCoordinates: vi.fn(),
}));

interface TestItem {
  id: number;
  title: string;
  description: string;
  status: "todo" | "doing" | "done";
}

const items: TestItem[] = [
  { id: 1, title: "Alpha", description: "Erste Aufgabe", status: "todo" },
  { id: 2, title: "Beta", description: "Zweite Aufgabe", status: "done" },
];

const statusColumns = [
  { value: "todo", label: "Offen", sortOrder: 100 },
  { value: "doing", label: "In Arbeit", sortOrder: 200 },
  { value: "done", label: "Erledigt", sortOrder: 300 },
];

function renderListBoardView({
  mode = "board",
  viewItems = items,
  onItemStatusChange,
}: {
  mode?: ListBoardMode;
  viewItems?: TestItem[];
  onItemStatusChange?: (item: TestItem, newStatus: string) => void;
} = {}) {
  return render(
    <ListBoardView
      items={viewItems}
      mode={mode}
      onModeChange={vi.fn()}
      onAdd={vi.fn()}
      statusKey="status"
      statusColumns={statusColumns}
      onItemStatusChange={onItemStatusChange}
      renderCard={(item) => (
        <ItemCard
          header={<h3>Card {item.title}</h3>}
          body={<p>{item.description}</p>}
        />
      )}
      renderRow={(item) => (
        <ItemRow title={`Row ${item.title}`} description={item.description} />
      )}
    />,
  );
}

function triggerDrag(activeId: MockDndId, overId: MockDndId | null) {
  act(() => {
    dndMock.contextProps?.onDragStart?.({ active: { id: activeId } });
  });
  act(() => {
    dndMock.contextProps?.onDragEnd?.({
      active: { id: activeId },
      over: overId === null ? null : { id: overId },
    });
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  dndMock.contextProps = undefined;
  dndMock.draggableIds = [];
  dndMock.droppableIds = [];
});

describe("ListBoardView DnD", () => {
  it("rendert ohne onItemStatusChange keine DnD-Infrastruktur", () => {
    const { container } = renderListBoardView();

    expect(screen.queryByTestId("dnd-context")).not.toBeInTheDocument();
    expect(container.querySelector("[data-dnd-enabled='true']")).not.toBeInTheDocument();
    expect(container.querySelector("[data-dnd-draggable='true']")).not.toBeInTheDocument();
  });

  it("ruft im Board-Modus bei Drop auf fremden bekannten Status den Callback auf", () => {
    const onItemStatusChange = vi.fn();
    renderListBoardView({ mode: "board", onItemStatusChange });

    expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
    expect(dndMock.droppableIds).toEqual(["todo", "doing", "done"]);
    expect(dndMock.draggableIds).toEqual(["1", "2"]);

    triggerDrag(1, "done");

    expect(onItemStatusChange).toHaveBeenCalledTimes(1);
    expect(onItemStatusChange).toHaveBeenCalledWith(items[0], "done");
  });

  it("ruft im Listenmodus bei Drop auf fremden bekannten Status den Callback auf", () => {
    const onItemStatusChange = vi.fn();
    renderListBoardView({ mode: "list", onItemStatusChange });

    expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
    expect(screen.getByText("Row Alpha")).toBeInTheDocument();

    triggerDrag(1, "doing");

    expect(onItemStatusChange).toHaveBeenCalledTimes(1);
    expect(onItemStatusChange).toHaveBeenCalledWith(items[0], "doing");
  });

  it("ignoriert Drops auf eigene, unbekannte oder fehlende Zielspalten", () => {
    const onItemStatusChange = vi.fn();
    renderListBoardView({ mode: "board", onItemStatusChange });

    triggerDrag(1, "todo");
    triggerDrag(1, "blocked");
    triggerDrag(1, null);

    expect(onItemStatusChange).not.toHaveBeenCalled();
  });

  it("rendert im statusgruppierten Listenmodus leere bekannte Status-Panels", () => {
    const { container } = renderListBoardView({
      mode: "list",
      viewItems: [items[0]],
    });

    const sections = container.querySelectorAll("section.rounded-lg");
    expect(sections).toHaveLength(3);
    expect(
      within(sections[0] as HTMLElement).getByRole("heading", { name: "Offen" }),
    ).toBeInTheDocument();
    expect(
      within(sections[1] as HTMLElement).getByRole("heading", { name: "In Arbeit" }),
    ).toBeInTheDocument();
    expect(within(sections[1] as HTMLElement).getByText("0")).toBeInTheDocument();
    expect(
      within(sections[2] as HTMLElement).getByRole("heading", { name: "Erledigt" }),
    ).toBeInTheDocument();
    expect(within(sections[2] as HTMLElement).getByText("0")).toBeInTheDocument();
  });
});
