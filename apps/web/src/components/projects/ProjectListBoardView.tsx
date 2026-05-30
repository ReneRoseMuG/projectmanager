import type { Project } from "@taskmanager/shared-types";
import { FolderKanban } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useHasPermission } from "../../hooks/usePermissions";
import { useTags } from "../../hooks/useTags";
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
  onTagsChange?: (projectId: number, tagIds: number[]) => void | Promise<void>;
  onCreateMilestone?: (project: Project) => void;
  onCreateTask?: (project: Project) => void;
  onCreateTicket?: (project: Project) => void;
  filters?: ReactNode;
  showToolbarAdd?: boolean;
  readOnly?: boolean;
  viewMode?: ListBoardMode;
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
  onTagsChange,
  onCreateMilestone,
  onCreateTask,
  onCreateTicket,
  filters,
  showToolbarAdd = true,
  readOnly = false,
  viewMode,
}: ProjectListBoardViewProps) {
  const canReadTags = useHasPermission("tags", "read");
  const canWriteProjects = useHasPermission("projects", "write");
  const [mode, setMode] = useState<ListBoardMode>("board");
  const [searchValue, setSearchValue] = useState("");
  const visibleProjects = useMemo(
    () => projects.filter((project) => matchesSearch(project, searchValue)),
    [projects, searchValue],
  );
  const tagEditingEnabled = !readOnly && canReadTags && canWriteProjects && Boolean(onTagsChange);
  const tagController = useTags(tagEditingEnabled);
  const editableTags = tagEditingEnabled ? tagController.tags : undefined;
  const handleTagsChange = tagEditingEnabled ? onTagsChange : undefined;

  return (
    <ListBoardView
      items={visibleProjects}
      mode={viewMode ?? mode}
      onModeChange={(nextMode) => {
        if (!readOnly) {
          setMode(nextMode);
        }
      }}
      onAdd={onCreate}
      onAddToColumn={readOnly ? undefined : onCreate}
      addLabel="Neues Projekt"
      showToolbar={!readOnly}
      showToolbarAdd={!readOnly && showToolbarAdd}
      statusKey="status"
      statusCatalogKind="workStatus"
      onItemStatusChange={!readOnly && onStatusChange ? (project, status) => onStatusChange(project, status as Project["status"]) : undefined}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      toolbarFilters={readOnly ? undefined : filters}
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
        <ProjectCard
          project={project}
          onEdit={onEdit}
          onDelete={readOnly ? undefined : onDelete}
          onStatusChange={readOnly ? undefined : onStatusChange}
          allTags={editableTags}
          onTagsChange={handleTagsChange}
          onCreateMilestone={!readOnly && onCreateMilestone ? () => onCreateMilestone(project) : undefined}
          onCreateTask={!readOnly && onCreateTask ? () => onCreateTask(project) : undefined}
          onCreateTicket={!readOnly && onCreateTicket ? () => onCreateTicket(project) : undefined}
        />
      )}
      renderRow={(project) => (
        <ProjectCard
          project={project}
          variant="row"
          onEdit={onEdit}
          onDelete={readOnly ? undefined : onDelete}
          onStatusChange={readOnly ? undefined : onStatusChange}
          allTags={editableTags}
          onTagsChange={handleTagsChange}
          onCreateMilestone={!readOnly && onCreateMilestone ? () => onCreateMilestone(project) : undefined}
          onCreateTask={!readOnly && onCreateTask ? () => onCreateTask(project) : undefined}
          onCreateTicket={!readOnly && onCreateTicket ? () => onCreateTicket(project) : undefined}
        />
      )}
    />
  );
}
