import type { Project, WikiPage, WikiPageRelationSummary } from "@taskmanager/shared-types";
import { Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

interface RelatedPagesSelectorProps {
  pages: WikiPage[];
  projects: Project[];
  currentPageId?: number;
  parentPage?: WikiPageRelationSummary | null;
  selectedPages: WikiPageRelationSummary[];
  onChange: (pages: WikiPageRelationSummary[]) => void;
  readOnly?: boolean;
  onNavigate?: (pageId: number) => void;
}

function toSummary(page: WikiPage): WikiPageRelationSummary {
  return {
    id: page.id,
    title: page.title,
    parentId: page.parentId
  };
}

function buildChildrenByParent(pages: WikiPage[]): Map<number | null, WikiPage[]> {
  const children = new Map<number | null, WikiPage[]>();
  for (const page of pages) {
    children.set(page.parentId, [...(children.get(page.parentId) ?? []), page]);
  }
  return children;
}

function collectDescendantIds(rootId: number, childrenByParent: Map<number | null, WikiPage[]>): Set<number> {
  const ids = new Set<number>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    const currentId = queue.shift();
    if (currentId === undefined) {
      continue;
    }
    for (const child of childrenByParent.get(currentId) ?? []) {
      if (!ids.has(child.id)) {
        ids.add(child.id);
        queue.push(child.id);
      }
    }
  }
  return ids;
}

function RelationChip({ page, removable, onNavigate, onRemove }: { page: WikiPageRelationSummary; removable: boolean; onNavigate?: (pageId: number) => void; onRemove?: (pageId: number) => void }) {
  return (
    <span className="inline-flex max-w-full items-center overflow-hidden rounded-md border border-line bg-white text-sm shadow-sm">
      {onNavigate ? (
        <button
          type="button"
          className="min-w-0 truncate px-2 py-1 text-left font-medium text-teal transition hover:bg-teal/10"
          onClick={() => onNavigate(page.id)}
        >
          {page.title}
        </button>
      ) : (
        <span className="min-w-0 truncate px-2 py-1 font-medium text-teal">{page.title}</span>
      )}
      {removable ? (
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center border-l border-line text-steel-500 transition hover:bg-crimson/10 hover:text-crimson"
          aria-label={`${page.title} entfernen`}
          onClick={() => onRemove?.(page.id)}
        >
          <X size={12} />
        </button>
      ) : null}
    </span>
  );
}

function ParentPageRow({ parentPage, onNavigate }: { parentPage: WikiPageRelationSummary | null; onNavigate?: (pageId: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium text-steel-500">Übergeordnete Seite:</span>
      {parentPage ? (
        <RelationChip page={parentPage} removable={false} onNavigate={onNavigate} />
      ) : (
        <span className="inline-flex min-h-7 items-center rounded-md border border-line bg-shell px-2 text-sm font-medium text-steel-600">Root-Seite</span>
      )}
    </div>
  );
}

export function RelatedPagesSelector({ pages, projects, currentPageId, parentPage, selectedPages, onChange, readOnly, onNavigate }: RelatedPagesSelectorProps) {
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");

  const projectPageIds = useMemo(() => {
    const childrenByParent = buildChildrenByParent(pages);
    const map = new Map<number, Set<number>>();
    for (const project of projects) {
      if (project.wikiPageId !== null) {
        map.set(project.id, collectDescendantIds(project.wikiPageId, childrenByParent));
      }
    }
    return map;
  }, [pages, projects]);

  const pageProjectId = useMemo(() => {
    const map = new Map<number, number>();
    for (const [projectId, ids] of projectPageIds) {
      for (const pageId of ids) {
        map.set(pageId, projectId);
      }
    }
    return map;
  }, [projectPageIds]);

  const selectedIds = useMemo(() => new Set(selectedPages.map((page) => page.id)), [selectedPages]);
  const normalizedQuery = query.trim().toLowerCase();
  const hasSearchQuery = normalizedQuery.length > 0;
  const candidates = hasSearchQuery ? pages.filter((page) => {
    if (page.id === currentPageId || selectedIds.has(page.id)) {
      return false;
    }
    if (!page.title.toLowerCase().includes(normalizedQuery)) {
      return false;
    }
    if (projectFilter === "unassigned") {
      return !pageProjectId.has(page.id);
    }
    if (projectFilter !== "all") {
      return pageProjectId.get(page.id) === Number(projectFilter);
    }
    return true;
  }) : [];

  const addPage = (page: WikiPage) => {
    onChange([...selectedPages, toSummary(page)]);
  };

  const removePage = (pageId: number) => {
    onChange(selectedPages.filter((page) => page.id !== pageId));
  };

  const showParentRow = parentPage !== undefined;
  const selectedPageChips = selectedPages.length > 0 ? (
    <div className="flex flex-wrap gap-2">
      {selectedPages.map((page) => (
        <RelationChip key={page.id} page={page} removable={!readOnly} onNavigate={onNavigate} onRemove={removePage} />
      ))}
    </div>
  ) : null;

  if (readOnly) {
    if (!showParentRow && selectedPages.length === 0) return null;
    return (
      <div className="grid gap-2">
        {showParentRow ? <ParentPageRow parentPage={parentPage ?? null} onNavigate={onNavigate} /> : null}
        {selectedPageChips}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {showParentRow ? <ParentPageRow parentPage={parentPage ?? null} onNavigate={onNavigate} /> : null}
      {selectedPageChips}

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
        <label className="relative block">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
          <input
            className="h-10 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm outline-none focus:border-teal"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Verwandte Seite suchen"
          />
        </label>
        <select
          className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-teal"
          value={projectFilter}
          onChange={(event) => setProjectFilter(event.target.value)}
        >
          <option value="all">Alle Projekte</option>
          <option value="unassigned">Ohne Projekt</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {hasSearchQuery ? (
        <div className="grid max-h-56 gap-2 overflow-auto rounded-lg border border-line bg-shell/60 p-2">
          {candidates.map((page) => (
            <button
              key={page.id}
              type="button"
              aria-label={`${page.title} als verwandte Seite hinzufügen`}
              className="flex min-h-10 items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-left text-sm transition hover:bg-teal/10"
              onClick={() => addPage(page)}
            >
              <span className="min-w-0 truncate font-medium text-ink">{page.title}</span>
              <Plus size={15} className="shrink-0 text-teal" />
            </button>
          ))}
          {candidates.length === 0 ? <div className="px-2 py-4 text-sm text-steel-500">Keine passenden Seiten.</div> : null}
        </div>
      ) : null}
    </div>
  );
}
