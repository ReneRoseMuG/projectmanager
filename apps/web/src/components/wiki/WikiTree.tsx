import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, ExternalLink, FileText, GripVertical, Plus } from "lucide-react";
import type { CSSProperties, MouseEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { WikiTreeNode } from "../../hooks/useWiki";
import { withStandaloneView } from "../../utils/standalone";

interface WikiTreeProps {
  tree: WikiTreeNode[];
  onCreate: (parent: WikiTreeNode | null) => void;
  onNavigate?: (page: WikiTreeNode) => Promise<boolean> | boolean;
  canMove?: boolean;
  onMove?: (page: WikiTreeNode, nextParentId: number | null) => Promise<void>;
}

interface WikiNodeProps {
  node: WikiTreeNode;
  activeId: number | null;
  level: number;
  onCreate: (parent: WikiTreeNode) => void;
  onNavigate?: (page: WikiTreeNode) => Promise<boolean> | boolean;
  canMove: boolean;
}

const TOGGLE_WIDTH = 16;
const MIN_WIDTH = 240;
const MAX_WIDTH = 560;
// Fixed horizontal space per row (excluding text and level indent):
// pl-3(12) + expand(32) + gap(4) + link-px-2(8+8) + gap(4) + action1(32) + gap(4) + action2(32) + paddingRight(20) = 156
const FIXED_OVERHEAD = 156;
const MOVE_HANDLE_OVERHEAD = 32;
const LEVEL_INDENT = 14;
const WIDTH_BUFFER = 16;
const WIKI_ROOT_DROP_ID = "wiki-root";
const WIKI_PAGE_DROP_PREFIX = "wiki-page-";

function measureTextWidth(text: string): number {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;
    ctx.font = "500 13.5px Inter, ui-sans-serif, system-ui, sans-serif";
    return ctx.measureText(text).width;
  } catch {
    return 0;
  }
}

function computeIdealWidth(nodes: WikiTreeNode[], canMove: boolean, level = 0): number {
  let max = 0;
  for (const node of nodes) {
    const w = Math.ceil(measureTextWidth(node.title)) + level * LEVEL_INDENT + FIXED_OVERHEAD + (canMove ? MOVE_HANDLE_OVERHEAD : 0);
    if (w > max) max = w;
    const childMax = computeIdealWidth(node.children, canMove, level + 1);
    if (childMax > max) max = childMax;
  }
  return max;
}

function readStoredBoolean(key: string, fallback: boolean): boolean {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === "true") return true;
    if (stored === "false") return false;
    return fallback;
  } catch {
    return fallback;
  }
}

function pageDropId(pageId: number): string {
  return `${WIKI_PAGE_DROP_PREFIX}${pageId}`;
}

function getDragPage(data: unknown): WikiTreeNode | null {
  if (!data || typeof data !== "object" || !("page" in data)) {
    return null;
  }
  const page = (data as { page?: WikiTreeNode }).page;
  return page ?? null;
}

function getDropParentId(overId: string | number | undefined): number | null | undefined {
  if (overId === undefined) {
    return undefined;
  }
  if (overId === WIKI_ROOT_DROP_ID) {
    return null;
  }
  if (typeof overId !== "string" || !overId.startsWith(WIKI_PAGE_DROP_PREFIX)) {
    return undefined;
  }
  const pageId = Number(overId.slice(WIKI_PAGE_DROP_PREFIX.length));
  return Number.isInteger(pageId) && pageId > 0 ? pageId : undefined;
}

function containsPage(node: WikiTreeNode, pageId: number): boolean {
  return node.children.some((child) => child.id === pageId || containsPage(child, pageId));
}

function WikiRootDropZone({ canMove }: { canMove: boolean }) {
  const drop = useDroppable({
    id: WIKI_ROOT_DROP_ID,
    disabled: !canMove
  });

  if (!canMove) {
    return null;
  }

  return (
    <div
      ref={drop.setNodeRef}
      className={`mb-2 rounded-md border border-dashed px-2 py-1.5 text-xs font-semibold transition ${
        drop.isOver ? "border-teal bg-teal/15 text-white" : "border-white/20 bg-white/[0.04] text-white/55"
      }`}
    >
      Root-Ebene
    </div>
  );
}

function WikiNode({ node, activeId, level, onCreate, onNavigate, canMove }: WikiNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();
  const hasChildren = node.children.length > 0;
  const pagePath = `/wiki/${node.id}`;
  const drop = useDroppable({
    id: pageDropId(node.id),
    disabled: !canMove
  });
  const drag = useDraggable({
    id: pageDropId(node.id),
    data: { page: node },
    disabled: !canMove
  });
  const rowStyle: CSSProperties = {
    paddingLeft: `${level * LEVEL_INDENT}px`,
    transform: drag.transform ? CSS.Translate.toString(drag.transform) : undefined
  };
  const setRowRef = (element: HTMLDivElement | null) => {
    drop.setNodeRef(element);
    drag.setNodeRef(element);
  };

  const openPage = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate) return;
    event.preventDefault();
    void Promise.resolve(onNavigate(node)).then((approved) => {
      if (approved) navigate(pagePath);
    });
  };

  const openPageInTab = () => {
    window.open(withStandaloneView(pagePath), "_blank");
  };

  return (
    <div className="grid gap-1">
      <div
        ref={setRowRef}
        className={`wiki-tree-nav-row flex items-center gap-1${activeId === node.id ? " wiki-tree-nav-row-active" : ""}${drop.isOver ? " ring-1 ring-white/35" : ""}${drag.isDragging ? " opacity-60" : ""}`}
        style={rowStyle}
      >
        {canMove ? (
          <button
            ref={drag.setActivatorNodeRef}
            type="button"
            className="wiki-tree-action-btn flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md active:cursor-grabbing"
            aria-label={`${node.title} verschieben`}
            title="Verschieben"
            {...drag.attributes}
            {...drag.listeners}
          >
            <GripVertical size={15} />
          </button>
        ) : null}
        <button
          type="button"
          className="wiki-tree-expand-btn flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          onClick={() => setExpanded((current) => !current)}
          disabled={!hasChildren}
          aria-label={expanded ? "Einklappen" : "Ausklappen"}
          title={expanded ? "Einklappen" : "Ausklappen"}
        >
          {hasChildren ? (
            expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          ) : (
            <FileText size={15} className="wiki-tree-icon-muted" />
          )}
        </button>
        <Link
          className="wiki-tree-nav-link min-w-0 flex-1 truncate rounded-md px-2 py-1.5"
          to={pagePath}
          onClick={openPage}
        >
          {node.title}
        </Link>
        <button
          type="button"
          className="wiki-tree-action-btn flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          aria-label={`${node.title} in neuem Tab öffnen`}
          title="In neuem Tab öffnen"
          onClick={openPageInTab}
        >
          <ExternalLink size={15} />
        </button>
        <button
          type="button"
          className="wiki-tree-action-btn flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          aria-label="Unterseite anlegen"
          title="Unterseite anlegen"
          onClick={() => onCreate(node)}
        >
          <Plus size={15} />
        </button>
      </div>
      {expanded && hasChildren ? (
        <div className="grid gap-1">
          {node.children.map((child) => (
            <WikiNode
              key={child.id}
              node={child}
              activeId={activeId}
              level={level + 1}
              onCreate={onCreate}
              onNavigate={onNavigate}
              canMove={canMove}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function WikiTree({ tree, onCreate, onNavigate, canMove = false, onMove }: WikiTreeProps) {
  const params = useParams();
  const activeId = Number.isFinite(Number(params.id)) ? Number(params.id) : null;
  const [collapsed, setCollapsed] = useState(() => readStoredBoolean("wiki-tree-collapsed", false));
  const [contentWidth, setContentWidth] = useState(MIN_WIDTH);
  const [activeDragPage, setActiveDragPage] = useState<WikiTreeNode | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    try {
      window.localStorage.setItem("wiki-tree-collapsed", String(collapsed));
    } catch {
      // localStorage unavailable in privacy mode
    }
  }, [collapsed]);

  useEffect(() => {
    if (tree.length === 0) return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const ideal = computeIdealWidth(tree, canMove) + WIDTH_BUFFER;
      setContentWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, ideal)));
    };
    void (document.fonts?.ready ?? Promise.resolve()).then(run).catch(run);
    return () => { cancelled = true; };
  }, [canMove, tree]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragPage(getDragPage(event.active.data.current));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragPage(null);
    if (!onMove) {
      return;
    }
    const page = getDragPage(event.active.data.current);
    const nextParentId = getDropParentId(event.over?.id);
    if (!page || nextParentId === undefined || page.id === nextParentId || page.parentId === nextParentId) {
      return;
    }
    if (nextParentId !== null && containsPage(page, nextParentId)) {
      return;
    }

    void Promise.resolve(onMove(page, nextParentId)).catch(() => undefined);
  };

  const totalWidth = collapsed ? TOGGLE_WIDTH : contentWidth + TOGGLE_WIDTH;

  return (
    <aside
      className="relative h-full shrink-0 overflow-hidden bg-gradient-to-b from-steel-800 to-steel-900 text-white transition-[width] duration-150"
      style={{ width: totalWidth, cursor: collapsed ? "col-resize" : undefined }}
      onClick={collapsed ? () => setCollapsed(false) : undefined}
    >
      {/* Scrollable content — right margin reserves space for the toggle strip */}
      <div
        className="flex h-full flex-col gap-1 overflow-y-auto py-4 pl-3 transition-opacity duration-150"
        style={{
          paddingRight: TOGGLE_WIDTH + 4,
          opacity: collapsed ? 0 : 1,
          pointerEvents: collapsed ? "none" : "auto",
        }}
      >
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveDragPage(null)}>
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-xs font-bold uppercase tracking-wide text-white/45">
              Seiten
            </span>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-md text-white/55 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
              aria-label="Neue Root-Seite"
              title="Neue Root-Seite"
              onClick={() => onCreate(null)}
            >
              <Plus size={14} />
            </button>
          </div>
          <WikiRootDropZone canMove={canMove} />
          {tree.length === 0 ? (
            <div className="px-2 py-6 text-center">
              <FileText size={20} className="mx-auto mb-2 text-white/30" />
              <p className="text-sm font-medium text-white/60">Keine Wiki-Seiten</p>
              <p className="mt-0.5 text-xs text-white/40">Starte mit einer Root-Seite.</p>
            </div>
          ) : null}
          {tree.map((node) => (
            <WikiNode
              key={node.id}
              node={node}
              activeId={activeId}
              level={0}
              onCreate={onCreate}
              onNavigate={onNavigate}
              canMove={canMove}
            />
          ))}
          <DragOverlay>
            {activeDragPage ? (
              <div className="rounded-md border border-white/20 bg-steel-700 px-3 py-2 text-sm font-semibold text-white shadow-lg">
                {activeDragPage.title}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Toggle strip — absolute on right edge, always reachable */}
      <button
        type="button"
        className="absolute bottom-0 right-0 top-0 flex cursor-col-resize flex-col items-center justify-center gap-[3px] border-l border-white/20 bg-white/[0.04] transition-colors hover:bg-white/[0.10] focus:outline-none"
        style={{ width: TOGGLE_WIDTH }}
        aria-label={collapsed ? "Seitenbaum öffnen" : "Seitenbaum schließen"}
        title={collapsed ? "Seitenbaum öffnen" : "Seitenbaum schließen"}
        onClick={(e) => { e.stopPropagation(); setCollapsed((c) => !c); }}
      >
        <span
          className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-white/60"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {collapsed ? "Öffnen" : "Schließen"}
        </span>
      </button>
    </aside>
  );
}
