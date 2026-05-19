import { PROJECT_STATUSES, type Project, type ProjectStatus } from "@taskmanager/shared-types";
import { Edit3, FolderKanban, FolderOpen, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ViewMode } from "../../types";
import { formatHumanDate } from "../../utils/date";
import { projectStatusLabels, projectStatusTones } from "../../utils/domainLabels";
import { richTextToPlainText } from "../../utils/richText";
import { TagBadge } from "../tags/TagBadge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { FormModal } from "../ui/FormModal";
import { ItemCard } from "../ui/ItemCard";
import { ItemRow } from "../ui/ItemRow";
import { ListBoardView, type ListBoardMode } from "../ui/ListBoardView";
import { Pill } from "../ui/Pill";
import { Section } from "../ui/Section";
import { Select } from "../ui/Select";

interface FeatureProjectPanelProps {
  projects: Project[];
  availableProjects: Project[];
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
  onAddProject: (project: Project) => Promise<void>;
  onRemoveProject: (project: Project) => Promise<void>;
  onOpen: (project: Project) => void;
}

const statusColumns: Array<{ value: ProjectStatus; label: string }> = PROJECT_STATUSES.map((status) => ({ value: status, label: projectStatusLabels[status] }));

function toListBoardMode(viewMode: ViewMode): ListBoardMode {
  return viewMode === "kanban" ? "board" : "list";
}

function toViewMode(mode: ListBoardMode): ViewMode {
  return mode === "board" ? "kanban" : "list";
}

function matchesSearch(project: Project, searchValue: string) {
  const normalized = searchValue.trim().toLocaleLowerCase("de-DE");
  if (!normalized) {
    return true;
  }

  const values = [project.name, richTextToPlainText(project.description), projectStatusLabels[project.status], ...project.tags.map((tag) => tag.name)];
  return values.some((value) => value.toLocaleLowerCase("de-DE").includes(normalized));
}

function sortProjects(projects: Project[]) {
  return [...projects].sort((left, right) => left.name.localeCompare(right.name, "de-DE"));
}

/** Feature project relation surface built on the shared list/board toolbar. */
export function FeatureProjectPanel({ projects, availableProjects, viewMode, onViewModeChange, onAddProject, onRemoveProject, onOpen }: FeatureProjectPanelProps) {
  const [searchValue, setSearchValue] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [removingProjectId, setRemovingProjectId] = useState<number | null>(null);
  const linkedProjectIds = useMemo(() => new Set(projects.map((project) => project.id)), [projects]);
  const addableProjects = useMemo(
    () => sortProjects(availableProjects.filter((project) => !linkedProjectIds.has(project.id))),
    [availableProjects, linkedProjectIds]
  );
  const visibleProjects = useMemo(() => sortProjects(projects).filter((project) => matchesSearch(project, searchValue)), [projects, searchValue]);

  useEffect(() => {
    if (!addModalOpen) {
      return;
    }
    if (selectedProjectId !== null && addableProjects.some((project) => project.id === selectedProjectId)) {
      return;
    }
    setSelectedProjectId(addableProjects[0]?.id ?? null);
  }, [addModalOpen, addableProjects, selectedProjectId]);

  const openAddModal = () => {
    setSelectedProjectId(addableProjects[0]?.id ?? null);
    setAddModalOpen(true);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
    setSelectedProjectId(null);
  };

  const submitAddProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedProject = addableProjects.find((project) => project.id === selectedProjectId);
    if (!selectedProject) {
      return;
    }

    setAdding(true);
    try {
      await onAddProject(selectedProject);
      closeAddModal();
    } finally {
      setAdding(false);
    }
  };

  const removeProject = async (project: Project) => {
    setRemovingProjectId(project.id);
    try {
      await onRemoveProject(project);
    } finally {
      setRemovingProjectId(null);
    }
  };

  return (
    <>
      <ListBoardView
        items={visibleProjects}
        mode={toListBoardMode(viewMode)}
        onModeChange={(mode) => onViewModeChange(toViewMode(mode))}
        onAdd={openAddModal}
        addLabel="Projekt hinzufügen"
        statusKey="status"
        statusColumns={statusColumns}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        emptyState={
          <EmptyState
            icon={<FolderKanban size={22} />}
            title="Keine Projekte verknüpft"
            body="Füge ein Projekt hinzu, um diese Feature-Zuordnung zu speichern."
            tone="violet"
            variant="tinted"
          />
        }
        renderCard={(project) => (
          <FeatureProjectCard
            project={project}
            removing={removingProjectId === project.id}
            onOpen={() => onOpen(project)}
            onRemove={() => void removeProject(project)}
          />
        )}
        renderRow={(project) => (
          <FeatureProjectRow
            project={project}
            removing={removingProjectId === project.id}
            onOpen={() => onOpen(project)}
            onRemove={() => void removeProject(project)}
          />
        )}
      />

      <FormModal
        open={addModalOpen}
        title="Projekt hinzufügen"
        icon={<FolderKanban size={20} />}
        breadcrumb={["Feature", "Projekte"]}
        onSubmit={submitAddProject}
        onClose={closeAddModal}
        saving={adding || selectedProjectId === null}
        submitLabel="Hinzufügen"
      >
        <Section title="Projekt auswählen">
          {addableProjects.length > 0 ? (
            <Select label="Projekt" value={String(selectedProjectId ?? "")} onChange={(event) => setSelectedProjectId(Number(event.target.value))}>
              {addableProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          ) : (
            <EmptyState
              icon={<FolderKanban size={22} />}
              title="Keine weiteren Projekte"
              body="Alle vorhandenen Projekte sind bereits mit diesem Feature verknüpft."
              tone="neutral"
              variant="tinted"
            />
          )}
        </Section>
      </FormModal>
    </>
  );
}

function FeatureProjectCard({ project, removing, onOpen, onRemove }: { project: Project; removing: boolean; onOpen: () => void; onRemove: () => void }) {
  const accent = project.color ?? "var(--color-steel-700)";
  const description = richTextToPlainText(project.description);

  return (
    <ItemCard
      accentColor={accent}
      onOpen={onOpen}
      header={<FeatureProjectHeader project={project} />}
      body={description ? <p className="line-clamp-3 text-sm text-slate-600">{description}</p> : null}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <span className="text-xs font-semibold text-slate-500">Aktualisiert {formatHumanDate(project.updatedAt)}</span>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" icon={<Edit3 size={16} />} onClick={onOpen}>
              Bearbeiten
            </Button>
            <Button variant="ghost" icon={<Trash2 size={16} />} loading={removing} onClick={onRemove}>
              Entfernen
            </Button>
          </div>
        </div>
      }
      className="min-w-0 max-w-full overflow-hidden"
    />
  );
}

function FeatureProjectRow({ project, removing, onOpen, onRemove }: { project: Project; removing: boolean; onOpen: () => void; onRemove: () => void }) {
  const accent = project.color ?? "var(--color-steel-700)";
  const description = richTextToPlainText(project.description);

  return (
    <ItemRow
      accentColor={accent}
      statusIndicator={<ProjectAvatar project={project} />}
      title={project.name}
      description={description}
      pills={
        <>
          <Pill tone={projectStatusTones[project.status]}>{projectStatusLabels[project.status]}</Pill>
          {project.tags[0] ? <TagBadge tag={project.tags[0]} /> : null}
        </>
      }
      meta={<span className="text-xs font-semibold text-slate-500">Aktualisiert {formatHumanDate(project.updatedAt)}</span>}
      actions={
        <>
          <Button aria-label="Bearbeiten" title="Bearbeiten" className="h-10 w-10" icon={<Edit3 size={18} />} variant="ghost" onClick={onOpen} />
          <Button variant="ghost" icon={<Trash2 size={16} />} loading={removing} onClick={onRemove}>
            Entfernen
          </Button>
        </>
      }
      onOpen={onOpen}
    />
  );
}

function FeatureProjectHeader({ project }: { project: Project }) {
  return (
    <div className="grid gap-3">
      <div className="flex items-start gap-3">
        <ProjectAvatar project={project} />
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-base font-semibold text-ink">{project.name}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">{project.openTaskCount} offene Aufgaben</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={projectStatusTones[project.status]}>{projectStatusLabels[project.status]}</Pill>
        {project.tags.map((tag) => (
          <TagBadge key={tag.id} tag={tag} />
        ))}
      </div>
    </div>
  );
}

function ProjectAvatar({ project }: { project: Project }) {
  const accent = project.color ?? "var(--color-steel-700)";

  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm" style={{ backgroundColor: accent }}>
      <FolderOpen size={20} />
    </span>
  );
}
