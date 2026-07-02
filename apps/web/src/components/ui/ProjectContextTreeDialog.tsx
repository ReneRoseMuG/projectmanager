import type { MoveOwner, ProjectContextTreeNode, ProjectContextTreeNodeType } from "@taskmanager/shared-types";
import { Briefcase, ChevronDown, ChevronRight, Flag, ListTodo, MoveRight, StickyNote, Ticket as TicketIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useProjectContextTree } from "../../hooks/useProjectContextTree";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { Modal } from "./Modal";
import { SearchInput } from "./SearchInput";
import { Spinner } from "./Spinner";

export type MoveItemType = "task" | "ticket" | "note";
export type MoveTarget = MoveOwner<"project" | "milestone" | "task" | "ticket">;

interface ProjectContextTreeDialogProps {
  open: boolean;
  source: MoveOwner | null;
  itemType: MoveItemType;
  itemId: number | null;
  onSelect: (target: MoveTarget) => Promise<void>;
  onClose: () => void;
}

const labels: Record<ProjectContextTreeNodeType, string> = {
  project: "Projekt",
  milestone: "Meilenstein",
  task: "Aufgabe",
  ticket: "Ticket",
  note: "Notiz"
};

function nodeIcon(type: ProjectContextTreeNodeType) {
  if (type === "project") return <Briefcase size={16} />;
  if (type === "milestone") return <Flag size={16} />;
  if (type === "task") return <ListTodo size={16} />;
  if (type === "ticket") return <TicketIcon size={16} />;
  return <StickyNote size={16} />;
}

function targetAllowed(itemType: MoveItemType, node: ProjectContextTreeNode, itemId: number | null): node is ProjectContextTreeNode & MoveTarget {
  if (node.type === "note") return false;
  if (itemType === "note") return node.type === "project" || node.type === "milestone" || node.type === "task" || node.type === "ticket";
  if (itemType === "task") return (node.type === "project" || node.type === "milestone" || node.type === "task") && !(node.type === "task" && node.id === itemId);
  return (node.type === "project" || node.type === "milestone" || node.type === "task" || node.type === "ticket") && !(node.type === "ticket" && node.id === itemId);
}

function matchesTree(node: ProjectContextTreeNode, query: string): boolean {
  if (!query) return true;
  const ownMatch = node.label.toLocaleLowerCase("de-DE").includes(query) || labels[node.type].toLocaleLowerCase("de-DE").includes(query);
  return ownMatch || node.children.some((child) => matchesTree(child, query));
}

function TreeNode({
  node,
  source,
  itemType,
  itemId,
  collapsed,
  pending,
  level,
  onToggle,
  onSelect
}: {
  node: ProjectContextTreeNode;
  source: MoveOwner | null;
  itemType: MoveItemType;
  itemId: number | null;
  collapsed: Set<string>;
  pending: string | null;
  level: number;
  onToggle: (key: string) => void;
  onSelect: (target: MoveTarget) => void;
}) {
  const key = `${node.type}:${node.id}`;
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsed.has(key);
  const isSource = source?.type === node.type && source.id === node.id;
  const allowed = targetAllowed(itemType, node, itemId) && !isSource;
  const pendingThis = pending === key;

  return (
    <li>
      <div className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-steel-50" style={{ paddingLeft: `${8 + level * 18}px` }}>
        <button
          type="button"
          aria-label={isCollapsed ? "Aufklappen" : "Einklappen"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-steel-500 hover:bg-white"
          disabled={!hasChildren}
          onClick={() => onToggle(key)}
        >
          {hasChildren ? (isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />) : null}
        </button>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-steel-100 text-steel-700">{nodeIcon(node.type)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{node.label}</p>
          <p className="text-xs text-steel-500">{labels[node.type]}</p>
        </div>
        <Button
          size="sm"
          variant={allowed ? "secondary" : "ghost"}
          icon={<MoveRight size={15} />}
          loading={pendingThis}
          disabled={!allowed || pending !== null}
          onClick={() => {
            if (allowed) onSelect({ type: node.type, id: node.id });
          }}
        >
          Wählen
        </Button>
      </div>
      {hasChildren && !isCollapsed ? (
        <ul className="mt-1 grid gap-1">
          {node.children.map((child) => (
            <TreeNode
              key={`${child.type}:${child.id}`}
              node={child}
              source={source}
              itemType={itemType}
              itemId={itemId}
              collapsed={collapsed}
              pending={pending}
              level={level + 1}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function ProjectContextTreeDialog({ open, source, itemType, itemId, onSelect, onClose }: ProjectContextTreeDialogProps) {
  const { tree, loading, error } = useProjectContextTree(source, open);
  const [query, setQuery] = useState("");
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase("de-DE");
  const visibleTree = useMemo(() => (tree && matchesTree(tree, normalizedQuery) ? tree : null), [normalizedQuery, tree]);

  const toggle = (key: string) => {
    setCollapsedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectTarget = async (target: MoveTarget) => {
    setPendingTarget(`${target.type}:${target.id}`);
    try {
      await onSelect(target);
      onClose();
    } finally {
      setPendingTarget(null);
    }
  };

  return (
    <Modal open={open} title="Ziel auswählen" size="lg" bodyClassName="grid max-h-[min(720px,calc(100vh-140px))] gap-4 overflow-hidden p-5" onClose={onClose}>
      <SearchInput value={query} placeholder="Baum durchsuchen" onChange={setQuery} />
      <div className="min-h-80 overflow-auto rounded-lg border border-line p-2">
        {loading ? (
          <div className="flex h-56 items-center justify-center text-steel-500"><Spinner /></div>
        ) : error ? (
          <EmptyState icon={<MoveRight size={22} />} title="Baum konnte nicht geladen werden" body={error} tone="tangerine" variant="tinted" />
        ) : visibleTree ? (
          <ul className="grid gap-1">
            <TreeNode
              node={visibleTree}
              source={source}
              itemType={itemType}
              itemId={itemId}
              collapsed={collapsedKeys}
              pending={pendingTarget}
              level={0}
              onToggle={toggle}
              onSelect={(target) => void selectTarget(target)}
            />
          </ul>
        ) : (
          <EmptyState icon={<MoveRight size={22} />} title="Kein Ziel gefunden" body="Passe die Suche an." tone="neutral" variant="default" />
        )}
      </div>
    </Modal>
  );
}
