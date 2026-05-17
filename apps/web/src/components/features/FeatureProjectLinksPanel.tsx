import type { Project } from "@taskmanager/shared-types";
import { FolderKanban, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useFeatureProjectLinks } from "../../hooks/useDocLinks";
import { formatHumanDate } from "../../utils/date";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { TaskListSkeleton } from "../ui/Skeleton";

interface FeatureProjectLinksPanelProps {
  featureId?: number;
  onChanged?: () => void | Promise<void>;
}

const statusLabels: Record<Project["status"], string> = {
  active: "Aktiv",
  on_hold: "Pausiert",
  completed: "Abgeschlossen",
  archived: "Archiviert"
};

export function FeatureProjectLinksPanel({ featureId, onChanged }: FeatureProjectLinksPanelProps) {
  const links = useFeatureProjectLinks(featureId);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingProjectId, setSavingProjectId] = useState<number | null>(null);

  const availableProjects = useMemo(() => {
    const linkedIds = new Set(links.linkedProjects.map((project) => project.id));
    return links.projects.filter((project) => !linkedIds.has(project.id));
  }, [links.linkedProjects, links.projects]);

  const selectedProject = availableProjects.find((project) => project.id === Number(selectedProjectId)) ?? null;

  const notifyChanged = async () => {
    if (onChanged) {
      await onChanged();
    }
  };

  const addProject = async () => {
    if (!selectedProject) {
      return;
    }

    setSavingProjectId(selectedProject.id);
    setActionError(null);
    try {
      await links.addProjectToFeature(selectedProject.id);
      setSelectedProjectId("");
      await notifyChanged();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Projekt konnte nicht hinzugefügt werden");
    } finally {
      setSavingProjectId(null);
    }
  };

  const removeProject = async (project: Project) => {
    setSavingProjectId(project.id);
    setActionError(null);
    try {
      await links.removeProjectFromFeature(project.id);
      await notifyChanged();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Projekt konnte nicht entfernt werden");
    } finally {
      setSavingProjectId(null);
    }
  };

  if (!featureId) {
    return (
      <EmptyState
        icon={<FolderKanban size={22} />}
        title="Projektverknüpfung nach dem Speichern"
        body="Speichere das Feature zuerst, bevor Projekte verknüpft werden."
        tone="violet"
        variant="tinted"
      />
    );
  }

  if (links.loading) {
    return <TaskListSkeleton />;
  }

  return (
    <section className="grid gap-4">
      <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-[min(22rem,100%)] flex-1 gap-1 text-sm font-semibold text-ink">
            Projekt hinzufügen
            <select
              className="h-11 rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-4 focus:ring-steel-600/10"
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              disabled={availableProjects.length === 0}
            >
              <option value="">{availableProjects.length === 0 ? "Alle Projekte sind verknüpft" : "Projekt auswählen"}</option>
              {availableProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <Button variant="primary" icon={<Plus size={16} />} disabled={!selectedProject || savingProjectId === selectedProject.id} onClick={() => void addProject()}>
            Projekt hinzufügen
          </Button>
        </div>
        {links.error ? <p className="mt-3 text-sm font-semibold text-crimson">{links.error}</p> : null}
        {actionError ? <p className="mt-3 text-sm font-semibold text-crimson">{actionError}</p> : null}
      </div>

      {links.linkedProjects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={22} />}
          title="Keine Projekte verknüpft"
          body="Füge ein bestehendes Projekt hinzu, um diese Feature-Relation zu setzen."
          tone="violet"
          variant="tinted"
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {links.linkedProjects.map((project) => (
            <article key={project.id} className="grid gap-3 rounded-xl border border-line bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-ink">{project.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{project.description || "Keine Beschreibung"}</p>
                </div>
                <Button
                  aria-label="Projekt entfernen"
                  title="Projekt entfernen"
                  icon={<Trash2 size={16} />}
                  variant="ghost"
                  disabled={savingProjectId === project.id}
                  onClick={() => void removeProject(project)}
                />
              </div>
              <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs font-semibold text-slate-500">
                <span>{statusLabels[project.status]}</span>
                <span>Aktualisiert {formatHumanDate(project.updatedAt)}</span>
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
