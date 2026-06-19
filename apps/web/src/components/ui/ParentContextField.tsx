import type { VisibleParentContext, VisibleParentType } from "@taskmanager/shared-types";
import { BookOpen, Bug, FileText, Flag, FolderKanban, Layers3, ListTodo, X, type LucideIcon } from "lucide-react";
import { SidebarPanel } from "./SidebarPanel";

const UNLINKABLE_PARENT_TYPES = new Set<VisibleParentType>(["project", "milestone", "feature", "useCase", "wikiPage"]);

interface ParentContextFieldProps {
  parents?: VisibleParentContext[] | null;
  onUnlink?: (parent: VisibleParentContext) => void;
}

const parentTypeLabels: Record<VisibleParentType, string> = {
  project: "Projekt",
  milestone: "Meilenstein",
  task: "Aufgabe",
  ticket: "Ticket",
  feature: "Feature",
  useCase: "Use Case",
  wikiPage: "Wiki",
};

const parentReferencePrefixes: Record<VisibleParentType, string> = {
  project: "PROJ",
  milestone: "MS",
  task: "TASK",
  ticket: "TKT",
  feature: "FEAT",
  useCase: "UC",
  wikiPage: "WIKI",
};

const parentIcons = {
  project: FolderKanban,
  milestone: Flag,
  task: ListTodo,
  ticket: Bug,
  feature: BookOpen,
  useCase: Layers3,
  wikiPage: FileText,
} satisfies Record<VisibleParentType, LucideIcon>;

export function ParentContextField({ parents, onUnlink }: ParentContextFieldProps) {
  const visibleParents = parents?.filter((parent) => parent.label.trim().length > 0) ?? [];
  if (visibleParents.length === 0) {
    return null;
  }

  return (
    <SidebarPanel label="Übergeordnetes Element" icon={<FolderKanban size={14} />} data-testid="parent-context-field">
      <div className="grid gap-1.5">
        {visibleParents.map((parent) => {
          const Icon = parentIcons[parent.type];
          const reference = parentReferencePrefixes[parent.type];
          const canUnlink = !!onUnlink && parent.origin === "direct" && UNLINKABLE_PARENT_TYPES.has(parent.type);
          return (
            <span
              key={`${parent.type}-${parent.id}-${parent.origin}`}
              className="inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-md border border-steel-200 bg-steel-50 px-2 text-xs font-semibold text-steel-700"
              title={`${parentTypeLabels[parent.type]}: ${parent.label}`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-steel-500" />
              <span className="shrink-0 text-steel-500">{reference}</span>
              <span className="truncate text-ink">{parent.label}</span>
              {canUnlink ? (
                <button
                  type="button"
                  onClick={() => onUnlink(parent)}
                  className="ml-0.5 shrink-0 text-steel-400 hover:text-crimson"
                  title="Verknüpfung aufheben"
                  aria-label={`Verknüpfung mit ${parentTypeLabels[parent.type]} „${parent.label}" aufheben`}
                >
                  <X size={11} />
                </button>
              ) : null}
            </span>
          );
        })}
      </div>
    </SidebarPanel>
  );
}
