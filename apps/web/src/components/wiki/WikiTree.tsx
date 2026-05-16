import { ChevronDown, ChevronRight, FileText, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { WikiTreeNode } from "../../hooks/useWiki";
import { Button } from "../ui/Button";

interface WikiTreeProps {
  tree: WikiTreeNode[];
  onCreate: (parent: WikiTreeNode | null) => void;
}

interface WikiNodeProps {
  node: WikiTreeNode;
  activeId: number | null;
  level: number;
  onCreate: (parent: WikiTreeNode) => void;
}

function WikiNode({ node, activeId, level, onCreate }: WikiNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-1" style={{ paddingLeft: `${level * 14}px` }}>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-line/50"
          onClick={() => setExpanded((current) => !current)}
          disabled={!hasChildren}
          aria-label={expanded ? "Einklappen" : "Ausklappen"}
          title={expanded ? "Einklappen" : "Ausklappen"}
        >
          {hasChildren ? expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} /> : <FileText size={15} />}
        </button>
        <Link
          className={`min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-sm ${
            activeId === node.id ? "bg-ink text-white" : "text-slate-700 hover:bg-shell"
          }`}
          to={`/wiki/${node.id}`}
        >
          {node.title}
        </Link>
        <Button aria-label="Unterseite anlegen" title="Unterseite anlegen" icon={<Plus size={15} />} variant="ghost" onClick={() => onCreate(node)} />
      </div>
      {expanded && hasChildren ? (
        <div className="grid gap-1">
          {node.children.map((child) => (
            <WikiNode key={child.id} node={child} activeId={activeId} level={level + 1} onCreate={onCreate} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function WikiTree({ tree, onCreate }: WikiTreeProps) {
  const params = useParams();
  const activeId = Number.isFinite(Number(params.id)) ? Number(params.id) : null;

  return (
    <aside className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Wiki</h2>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => onCreate(null)}>
          Root
        </Button>
      </div>
      {tree.length === 0 ? <p className="rounded-md border border-dashed border-line p-4 text-center text-sm text-slate-600">Keine Wiki-Seiten</p> : null}
      <div className="grid gap-1">
        {tree.map((node) => (
          <WikiNode key={node.id} node={node} activeId={activeId} level={0} onCreate={onCreate} />
        ))}
      </div>
    </aside>
  );
}
