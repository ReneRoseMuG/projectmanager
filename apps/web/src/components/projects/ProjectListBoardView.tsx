import type { Project } from "@taskmanager/shared-types";
import { FolderKanban } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { EmptyState } from "../ui/EmptyState";
import { ListBoardView, type ListBoardMode } from "../ui/ListBoardView";
import { ProjectCard } from "./ProjectCard";

interface ProjectListBoardViewProps {
  projects: Project[];
  loading?: boolean;
  onCreate: () => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onStatusChange?: (project: Project, status: Project["status"]) => void | Promise<unknown>;
  filters?: ReactNode;
  showToolbarAdd?: boolean;
}

function matchesSearch(project: Project, searchValue: string) {
  const normalized = searchValue.trim().toLocaleLowerCase("de-DE");
  if (!normalized) {
    return true;
  }

  return project.name.toLocaleLowerCase("de-DE").includes(normalized);
}

/** Project-specific ListBoardView adapter with status board columns. */
export function ProjectListBoardView({
  projects,
  loading = false,
  onCreate,
  onEdit,
  onDelete,
  onStatusChange,
  filters,
  showToolbarAdd = true,
}: ProjectListBoardViewProps) {
  const [mode, setMode] = useState<ListBoardMode>("board");
  const [searchValue, setSearchValue] = useState("");
  const visibleProjects = useMemo(
    () => projects.filter((project) => matchesSearch(project, searchValue)),
    [projects, searchValue],
  );

  return (
    <ListBoardView
      items={visibleProjects}
      mode={mode}
      onModeChange={setMode}
      onAdd={onCreate}
      onAddToColumn={onCreate}
      addLabel="Neues Projekt"
      showToolbarAdd={showToolbarAdd}
      statusKey="status"
      statusCatalogKind="workStatus"
      onItemStatusChange={onStatusChange ? (project, status) => onStatusChange(project, status as Project["status"]) : undefined}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      filters={filters}
      loading={loading}
      emptyState={
        <EmptyState
          icon={<FolderKanban size={22} />}
          title="Keine Projekte"
          body="Lege dein erstes Projekt an, um Aufgaben, Backlog und Dateien zu bündeln."
          tone="fern"
          variant="first-run"
        />
      }
      renderCard={(project) => (
        <ProjectCard project={project} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
      )}
      renderRow={(project) => (
        <ProjectCard
          project={project}
          variant="row"
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />
      )}
    />
  );
}
