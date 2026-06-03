import { ChevronDown, ChevronRight, ExternalLink, FileText, Plus } from "lucide-react";
import type { MouseEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { WikiTreeNode } from "../../hooks/useWiki";
import { withStandaloneView } from "../../utils/standalone";

interface WikiTreeProps {
  tree: WikiTreeNode[];
  onCreate: (parent: WikiTreeNode | null) => void;
  onNavigate?: (page: WikiTreeNode) => Promise<boolean> | boolean;
}

interface WikiNodeProps {
  node: WikiTreeNode;
  activeId: number | null;
  level: number;
  onCreate: (parent: WikiTreeNode) => void;
  onNavigate?: (page: WikiTreeNode) => Promise<boolean> | boolean;
}

const TOGGLE_WIDTH = 16;
const MIN_WIDTH = 240;
const MAX_WIDTH = 380;
// Fixed horizontal space per row (excluding text and level indent):
// pl-3(12) + expand(32) + gap(4) + link-px-2(8+8) + gap(4) + action1(32) + gap(4) + action2(32) + pr-4(16) + toggle(16) = 168
const FIXED_OVERHEAD = 168;
const LEVEL_INDENT = 14;

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

function computeIdealWidth(nodes: WikiTreeNode[], level = 0): number {
  let max = 0;
  for (const node of nodes) {
    const w = Math.ceil(measureTextWidth(node.title)) + level * LEVEL_INDENT + FIXED_OVERHEAD;
    if (w > max) max = w;
    const childMax = computeIdealWidth(node.children, level + 1);
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

function WikiNode({ node, activeId, level, onCreate, onNavigate }: WikiNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();
  const hasChildren = node.children.length > 0;
  const pagePath = `/wiki/${node.id}`;

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
        className={`wiki-tree-nav-row flex items-center gap-1${activeId === node.id ? " wiki-tree-nav-row-active" : ""}`}
        style={{ paddingLeft: `${level * LEVEL_INDENT}px` }}
      >
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
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function WikiTree({ tree, onCreate, onNavigate }: WikiTreeProps) {
  const params = useParams();
  const activeId = Number.isFinite(Number(params.id)) ? Number(params.id) : null;
  const [collapsed, setCollapsed] = useState(() => readStoredBoolean("wiki-tree-collapsed", false));
  const [contentWidth, setContentWidth] = useState(MIN_WIDTH);

  useEffect(() => {
    try {
      window.localStorage.setItem("wiki-tree-collapsed", String(collapsed));
    } catch {
      // localStorage unavailable in privacy mode
    }
  }, [collapsed]);

  useEffect(() => {
    if (tree.length === 0) return;
    const ideal = computeIdealWidth(tree);
    setContentWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, ideal)));
  }, [tree]);

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
          />
        ))}
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
