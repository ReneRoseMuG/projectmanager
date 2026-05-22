import { BookOpen, Bug, CircleHelp, ClipboardList, FileText, Flag, FolderKanban, ListTodo, Paperclip, Plus, Search, Sparkles, StickyNote, X } from "lucide-react";
import type { Ticket } from "@taskmanager/shared-types";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalSearchData } from "../../hooks/useGlobalSearchData";
import { richTextToPlainText } from "../../utils/richText";
import { EmptyState } from "../ui/EmptyState";

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

type Scope = "all" | "projects" | "milestones" | "tasks" | "tickets" | "features" | "notes" | "wiki" | "files";

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

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const projectResults = projects
      .filter((project) => !normalized || project.name.toLowerCase().includes(normalized) || richTextToPlainText(project.description).toLowerCase().includes(normalized))
      .map((project) => ({ id: `project-${project.id}`, type: "Projekte", title: project.name, meta: `PROJECT-${project.id}`, to: `/projects/${project.id}`, icon: <FolderKanban size={17} /> }));
    const milestoneResults = milestones
      .filter((milestone) => !normalized || milestone.name.toLowerCase().includes(normalized) || richTextToPlainText(milestone.description).toLowerCase().includes(normalized))
      .map((milestone) => ({ id: `milestone-${milestone.id}`, type: "Meilensteine", title: milestone.name, meta: `MILESTONE-${milestone.id}`, to: `/milestones/${milestone.id}`, icon: <Flag size={17} /> }));
    const featureResults = features
      .filter((feature) => !normalized || feature.title.toLowerCase().includes(normalized))
      .map((feature) => ({ id: `feature-${feature.id}`, type: "Features", title: feature.title, meta: `FEATURE-${feature.id}`, to: `/features/${feature.id}`, icon: <BookOpen size={17} /> }));
    const taskResults = tasks
      .filter((task) => !normalized || task.title.toLowerCase().includes(normalized) || richTextToPlainText(task.description).toLowerCase().includes(normalized))
      .map((task) => ({ id: `task-${task.id}`, type: "Aufgaben", title: task.title, meta: `TASK-${task.id}`, to: "/projects", icon: <ListTodo size={17} /> }));
    const ticketResults = tickets
      .filter((ticket) => !normalized || ticket.title.toLowerCase().includes(normalized) || richTextToPlainText(ticket.description).toLowerCase().includes(normalized))
      .map((ticket) => ({ id: `ticket-${ticket.id}`, type: "Tickets", title: ticket.title, meta: `TICKET-${ticket.id}`, to: "/tickets", icon: ticketIcon(ticket) }));
    const noteResults = notes
      .filter((note) => !normalized || note.title.toLowerCase().includes(normalized))
      .map((note) => ({ id: `note-${note.id}`, type: "Notizen", title: note.title, meta: `NOTE-${note.id}`, to: "/projects", icon: <StickyNote size={17} /> }));
    const wikiResults = wikiPages
      .filter((page) => !normalized || page.title.toLowerCase().includes(normalized))
      .map((page) => ({ id: `wiki-${page.id}`, type: "Wiki", title: page.title, meta: `WIKI-${page.id}`, to: `/wiki/${page.id}`, icon: <FileText size={17} /> }));
    const fileResults = attachments
      .filter((attachment) => !normalized || attachment.originalName.toLowerCase().includes(normalized))
      .map((attachment) => ({ id: `file-${attachment.id}`, type: "Dateien", title: attachment.originalName, meta: attachment.mimetype, to: "/projects", icon: <Paperclip size={17} /> }));
    return [
      ...(scope === "all" || scope === "projects" ? projectResults : []),
      ...(scope === "all" || scope === "milestones" ? milestoneResults : []),
      ...(scope === "all" || scope === "tasks" ? taskResults : []),
      ...(scope === "all" || scope === "tickets" ? ticketResults : []),
      ...(scope === "all" || scope === "features" ? featureResults : []),
      ...(scope === "all" || scope === "notes" ? noteResults : []),
      ...(scope === "all" || scope === "wiki" ? wikiResults : []),
      ...(scope === "all" || scope === "files" ? fileResults : [])
    ];
  }, [attachments, features, milestones, notes, projects, query, scope, tasks, tickets, wikiPages]);

  const go = (to: string) => {
    navigate(to);
    onClose();
  };

  if (!open) {
    return null;
  }

  const scopes: Array<{ value: Scope; label: string; count: number }> = [
    { value: "all", label: "Alle", count: projects.length + milestones.length + tasks.length + tickets.length + features.length + notes.length + wikiPages.length + attachments.length },
    { value: "projects", label: "Projekte", count: projects.length },
    { value: "milestones", label: "Meilensteine", count: milestones.length },
    { value: "tasks", label: "Aufgaben", count: tasks.length },
    { value: "tickets", label: "Tickets", count: tickets.length },
    { value: "features", label: "Features", count: features.length },
    { value: "notes", label: "Notizen", count: notes.length },
    { value: "wiki", label: "Wiki", count: wikiPages.length },
    { value: "files", label: "Dateien", count: attachments.length }
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
            <div className="grid gap-2">
              <p className="px-2 text-xs font-bold uppercase text-slate-500">Schnellaktionen</p>
              <button type="button" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-shell" onClick={() => go("/projects")}>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-fern/10 text-fern">
                  <Plus size={17} />
                </span>
                <span>
                  <span className="block font-semibold text-ink">Neues Projekt</span>
                  <span className="block text-xs text-slate-500">Projektliste öffnen</span>
                </span>
                <kbd className="rounded border border-line px-1.5 py-0.5 text-xs text-slate-500">↵</kbd>
              </button>
            </div>
          ) : results.length === 0 ? (
            <EmptyState icon={<Search size={22} />} title="Keine Treffer" body={`Für "${query}" wurde nichts in den geladenen Daten gefunden.`} tone="neutral" variant="default" actions={[{ label: "Neue Aufgabe mit diesem Titel", onClick: () => go("/projects"), icon: <Plus size={16} /> }]} />
          ) : (
            <div className="grid gap-1">
              {results.map((result) => (
                <button key={result.id} type="button" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-shell" onClick={() => go(result.to)}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-steel-100 text-steel-700">{result.icon}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{result.title}</span>
                    <span className="block truncate font-mono text-xs text-slate-500">{result.meta} · {result.type}</span>
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
