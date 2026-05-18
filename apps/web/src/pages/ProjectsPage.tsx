import { PROJECT_STATUSES, type DraftComment, type DraftNote, type DraftTask, type DraftTicket, type Project, type ProjectInput, type ProjectStatus } from "@taskmanager/shared-types";
import { useMemo, useState } from "react";
import { uploadProjectAttachment } from "../api/attachments";
import { createEntityComment } from "../api/comments";
import { setProjectFeatures } from "../api/doc-links";
import { createProjectNote } from "../api/notes";
import { createOwnerTask, linkOwnerTask } from "../api/tasks";
import { createOwnerTicket, linkOwnerTicket } from "../api/tickets";
import { ProjectForm } from "../components/projects/ProjectForm";
import { ProjectListBoardView } from "../components/projects/ProjectListBoardView";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { FilterChips } from "../components/ui/FilterChips";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useProjects } from "../hooks/useProjects";
import type { DraftFile } from "../types";
import { projectStatusLabels } from "../utils/domainLabels";

export function ProjectsPage() {
  const { projects, loading, error, createProject, updateProject, removeProject } = useProjects();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [createdProject, setCreatedProject] = useState<Project | null>(null);
  const [savingLabel, setSavingLabel] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");

  const statusOptions = useMemo(
    () =>
      PROJECT_STATUSES.map((status) => ({
        value: status,
        label: projectStatusLabels[status],
        count: projects.filter((project) => project.status === status).length
      })),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      return matchesStatus;
    });
  }, [projects, statusFilter]);

  const openCreate = () => {
    setEditingProject(null);
    setCreatedProject(null);
    setFormOpen(true);
  };

  const submit = async (input: ProjectInput, tagIds: number[]) => {
    try {
      if (editingProject) {
        const updated = await updateProject(editingProject.id, input, tagIds);
        showToast({ tone: "success", title: "Projekt aktualisiert" });
        return updated;
      }
      if (createdProject) {
        const updated = await updateProject(createdProject.id, input, tagIds);
        setCreatedProject(updated);
        showToast({ tone: "success", title: "Projekt aktualisiert" });
        return updated;
      }
      const created = await createProject(input, tagIds);
      setCreatedProject(created);
      showToast({ tone: "success", title: "Projekt erstellt" });
      return created;
    } catch (submitError) {
      showToast({ tone: "error", title: "Projekt konnte nicht gespeichert werden", message: errorMessage(submitError) });
      throw submitError;
    }
  };

  const deleteProject = async (project: Project) => {
    const approved = await confirm({
      title: "Projekt löschen?",
      body: `Das Projekt "${project.name}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen"
    });
    if (!approved) {
      return false;
    }
    try {
      await removeProject(project.id);
      showToast({ tone: "success", title: "Projekt gelöscht" });
      return true;
    } catch (deleteError) {
      showToast({ tone: "error", title: "Projekt konnte nicht gelöscht werden", message: errorMessage(deleteError) });
      return false;
    }
  };

  const postCreateProject = async (
    projectId: number,
    pending: { tasks: DraftTask[]; tickets: DraftTicket[]; featureIds: number[]; comments: DraftComment[]; notes: DraftNote[]; files: DraftFile[] }
  ) => {
    const owner = { type: "project" as const, id: projectId };
    try {
      if (pending.featureIds.length > 0) {
        await setProjectFeatures(projectId, pending.featureIds);
      }
      for (const task of pending.tasks) {
        if (task.kind === "existing") {
          await linkOwnerTask(owner, task.task.id);
        } else {
          await createOwnerTask(owner, task.draft);
        }
      }
      for (const ticket of pending.tickets) {
        if (ticket.kind === "existing") {
          await linkOwnerTicket(owner, ticket.ticket.id);
        } else {
          await createOwnerTicket(owner, ticket.draft);
        }
      }
      for (const comment of pending.comments) {
        await createEntityComment("project", projectId, { body: comment.text });
      }
      for (const note of pending.notes) {
        await createProjectNote(projectId, note);
      }
      for (let index = 0; index < pending.files.length; index += 1) {
        const file = pending.files[index];
        if (!file) {
          continue;
        }
        setSavingLabel(`Speichern… (Datei ${index + 1} von ${pending.files.length})`);
        await uploadProjectAttachment(projectId, file.file);
      }
      showToast({ tone: "success", title: "Projekt-Zuordnungen gespeichert" });
    } catch (postCreateError) {
      showToast({ tone: "error", title: "Projekt wurde erstellt, aber nicht alle Zuordnungen konnten gespeichert werden", message: errorMessage(postCreateError) });
      throw postCreateError;
    } finally {
      setSavingLabel(undefined);
    }
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Projekte</h1>
          <p className="text-sm text-slate-600">{projects.length} Einträge</p>
        </div>
      </header>

      {error ? <div className="rounded-md border border-crimson bg-crimson/10 p-3 text-sm text-crimson">{error}</div> : null}
      <ProjectListBoardView
        projects={filteredProjects}
        loading={loading}
        onCreate={openCreate}
        onEdit={(project) => {
          setEditingProject(project);
          setCreatedProject(null);
          setFormOpen(true);
        }}
        onDelete={(project) => void deleteProject(project)}
        filters={!loading ? <FilterChips value={statusFilter} onChange={setStatusFilter} options={statusOptions} allCount={projects.length} /> : null}
      />

      <ProjectForm
        open={formOpen}
        project={editingProject ?? createdProject}
        onSubmit={submit}
        onDelete={deleteProject}
        savingLabel={savingLabel}
        onPostCreate={postCreateProject}
        onClose={() => {
          setFormOpen(false);
          setEditingProject(null);
          setCreatedProject(null);
          setSavingLabel(undefined);
        }}
      />
    </div>
  );
}
