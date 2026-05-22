import { BookOpen, Bug, CircleHelp, ClipboardList, FileText, Flag, FolderKanban, ListTodo, Paperclip, Search, Sparkles, StickyNote, X } from "lucide-react";
import type { Ticket } from "@taskmanager/shared-types";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalSearchData } from "../../hooks/useGlobalSearchData";
import { EmptyState } from "../ui/EmptyState";

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

type Scope = "all" | "projects" | "milestones" | "tasks" | "tickets" | "features" | "notes" | "wiki" | "files";
type ResultScope = Exclude<Scope, "all">;

interface SearchResult {
  id: string;
  type: string;
  title: string;
  to: string;
  icon: JSX.Element;
}

type SearchResultGroups = Record<ResultScope, SearchResult[]>;

function matchesQuery(value: string | null | undefined, query: string) {
  return !query || (value ?? "").toLocaleLowerCase("de-DE").includes(query);
}

function ticketIcon(ticket: Ticket) {
  if (ticket.type === "bug") {
    return <Bug size={17} />;
  }
  if (ticket.type === "improvement") {
    return <Sparkles size={17} />;
  }
  if (ticket.type === "question") {
    return <CircleHelp size={17} />;
  }
  return <ClipboardList size={17} />;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const searchData = useGlobalSearchData(open);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const { projects, milestones, features, wikiPages, tasks, tickets, notes, attachments } = searchData.data;

  const resultGroups = useMemo<SearchResultGroups>(() => {
    const normalized = query.trim().toLocaleLowerCase("de-DE");
    return {
      projects: projects
        .filter((project) => matchesQuery(project.name, normalized))
        .map((project) => ({ id: `project-${project.id}`, type: "Projekte", title: project.name, to: `/projects/${project.id}`, icon: <FolderKanban size={17} /> })),
      milestones: milestones
        .filter((milestone) => matchesQuery(milestone.name, normalized))
        .map((milestone) => ({ id: `milestone-${milestone.id}`, type: "Meilensteine", title: milestone.name, to: `/milestones/${milestone.id}`, icon: <Flag size={17} /> })),
      tasks: tasks
        .filter((task) => matchesQuery(task.title, normalized))
        .map((task) => ({ id: `task-${task.id}`, type: "Aufgaben", title: task.title, to: `/tasks/${task.id}`, icon: <ListTodo size={17} /> })),
      tickets: tickets
        .filter((ticket) => matchesQuery(ticket.title, normalized))
        .map((ticket) => ({ id: `ticket-${ticket.id}`, type: "Tickets", title: ticket.title, to: `/tickets/${ticket.id}`, icon: ticketIcon(ticket) })),
      features: features
        .filter((feature) => matchesQuery(feature.title, normalized))
        .map((feature) => ({ id: `feature-${feature.id}`, type: "Features", title: feature.title, to: `/features/${feature.id}`, icon: <BookOpen size={17} /> })),
      notes: notes
        .filter((note) => matchesQuery(note.title, normalized))
        .map((note) => ({ id: `note-${note.id}`, type: "Notizen", title: note.title, to: `/projects/${note.projectId}`, icon: <StickyNote size={17} /> })),
      wiki: wikiPages
        .filter((page) => matchesQuery(page.title, normalized))
        .map((page) => ({ id: `wiki-${page.id}`, type: "Wiki", title: page.title, to: `/wiki/${page.id}`, icon: <FileText size={17} /> })),
      files: attachments
        .filter((attachment) => matchesQuery(attachment.originalName, normalized))
        .map((attachment) => ({ id: `file-${attachment.id}`, type: "Dateien", title: attachment.originalName, to: `/projects/${attachment.projectId}`, icon: <Paperclip size={17} /> }))
    };
  }, [attachments, features, milestones, notes, projects, query, tasks, tickets, wikiPages]);

  const allResults = [
    ...resultGroups.projects,
    ...resultGroups.milestones,
    ...resultGroups.tasks,
    ...resultGroups.tickets,
    ...resultGroups.features,
    ...resultGroups.notes,
    ...resultGroups.wiki,
    ...resultGroups.files
  ];
  const results = scope === "all" ? allResults : resultGroups[scope];

  const go = (to: string) => {
    navigate(to);
    onClose();
  };

  if (!open) {
    return null;
  }

  const scopes: Array<{ value: Scope; label: string; count: number }> = [
    { value: "all", label: "Alle", count: allResults.length },
    { value: "projects", label: "Projekte", count: resultGroups.projects.length },
    { value: "milestones", label: "Meilensteine", count: resultGroups.milestones.length },
    { value: "tasks", label: "Aufgaben", count: resultGroups.tasks.length },
    { value: "tickets", label: "Tickets", count: resultGroups.tickets.length },
    { value: "features", label: "Features", count: resultGroups.features.length },
    { value: "notes", label: "Notizen", count: resultGroups.notes.length },
    { value: "wiki", label: "Wiki", count: resultGroups.wiki.length },
    { value: "files", label: "Dateien", count: resultGroups.files.length }
  ];

  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center bg-steel-900/55 p-4 pt-[12vh] backdrop-blur-[2px]">
      <section className="w-full max-w-[720px] overflow-hidden rounded-2xl border border-line bg-white shadow-modal">
        <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-4 py-3">
          <Search size={18} className="text-steel-500" />
          <input autoFocus className="h-10 min-w-0 bg-transparent text-base outline-none placeholder:text-slate-400" placeholder="Global suchen" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-shell hover:text-ink" aria-label="Schließen" onClick={onClose}>
            <X size={17} />
          </button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2">
          {scopes.map((item) => (
            <button key={item.value} type="button" className={`rounded-full px-3 py-1.5 text-xs font-bold ${scope === item.value ? "bg-steel-700 text-white" : "bg-shell text-slate-600 hover:text-ink"}`} onClick={() => setScope(item.value)}>
              {item.label} · {item.count}
            </button>
          ))}
        </nav>
        <div className="max-h-[420px] overflow-auto p-3">
          {searchData.error ? (
            <p className="rounded-lg border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{searchData.error}</p>
          ) : !query ? (
            <EmptyState icon={<Search size={22} />} title="Suchbegriff eingeben" body="Die globale Suche zeigt Treffer aus Titeln, Namen und Dateinamen." tone="neutral" variant="default" />
          ) : results.length === 0 ? (
            <EmptyState icon={<Search size={22} />} title="Keine Treffer" body={`Für "${query}" wurde nichts in den geladenen Daten gefunden.`} tone="neutral" variant="default" />
          ) : (
            <div className="grid gap-1">
              {results.map((result) => (
                <button key={result.id} type="button" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-shell" onClick={() => go(result.to)}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-steel-100 text-steel-700">{result.icon}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{result.title}</span>
                    <span className="block truncate text-xs text-slate-500">{result.type}</span>
                  </span>
                  <kbd className="rounded border border-line px-1.5 py-0.5 text-xs text-slate-500">↵</kbd>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
