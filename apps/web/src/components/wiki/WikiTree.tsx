import { ChevronDown, ChevronRight, FileText, Plus } from "lucide-react";
import type { MouseEvent } from "react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { WikiTreeNode } from "../../hooks/useWiki";
import { Button } from "../ui/Button";

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

function WikiNode({ node, activeId, level, onCreate, onNavigate }: WikiNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();
  const hasChildren = node.children.length > 0;
  const pagePath = `/wiki/${node.id}`;

  const openPage = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate) {
      return;
    }

    event.preventDefault();
    void Promise.resolve(onNavigate(node)).then((approved) => {
      if (approved) {
        navigate(pagePath);
      }
    });
  };

  return (
    <div className="grid gap-1">
      <div
        className={`wiki-tree-nav-row flex items-center gap-1${activeId === node.id ? " wiki-tree-nav-row-active" : ""}`}
        style={{ paddingLeft: `${level * 14}px` }}
      >
        <button
          type="button"
          className="wiki-tree-expand-btn flex h-8 w-8 items-center justify-center rounded-md"
          onClick={() => setExpanded((current) => !current)}
          disabled={!hasChildren}
          aria-label={expanded ? "Einklappen" : "Ausklappen"}
          title={expanded ? "Einklappen" : "Ausklappen"}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )
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
        <Button
          aria-label="Unterseite anlegen"
          title="Unterseite anlegen"
          icon={<Plus size={15} />}
          variant="ghost"
          className="wiki-tree-action-btn"
          onClick={() => onCreate(node)}
        />
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
  const activeId = Number.isFinite(Number(params.id))
    ? Number(params.id)
    : null;

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col gap-1 overflow-y-auto bg-gradient-to-b from-steel-800 to-steel-900 px-3 py-4">
      <div className="mb-2 flex items-center justify-between px-2">
        <span className="text-xs font-bold uppercase tracking-wide text-white/45">
          Seiten
        </span>
        <Button
          aria-label="Neue Root-Seite"
          title="Neue Root-Seite"
          icon={<Plus size={14} />}
          variant="ghost"
          className="text-white/60 hover:bg-white/10 hover:text-white"
          onClick={() => onCreate(null)}
        />
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
    </aside>
  );
}
