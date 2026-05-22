import type {
  DraftComment,
  DraftNote,
  DraftTask,
  DraftTicket,
  Project,
  ProjectInput,
} from "@taskmanager/shared-types";
import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { uploadProjectAttachment } from "../api/attachments";
import { createEntityComment } from "../api/comments";
import { setProjectFeatures } from "../api/doc-links";
import { createProjectNote } from "../api/notes";
import { createOwnerTask, linkOwnerTask } from "../api/tasks";
import { createOwnerTicket, linkOwnerTicket } from "../api/tickets";
import { ProjectForm } from "../components/projects/ProjectForm";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { DetailPageSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useProjects } from "../hooks/useProjects";
import { withStandaloneView } from "../utils/standalone";
import type { DraftFile } from "../types";

export function ProjectDetailPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const isCreateMode = params.id === undefined;
  const projectId = isCreateMode ? undefined : Number(params.id);
  const { project, loading, createProject, updateProject, removeProject } =
    useProjects(projectId);
  const [savingLabel, setSavingLabel] = useState<string | undefined>();

  const returnTo = searchParams.get("returnTo") ?? (searchParams.get("standalone") === "1" ? withStandaloneView("/projects") : "/projects");
  const closePage = () => navigate(returnTo);
  const openInTab =
    !isCreateMode && projectId !== undefined && Number.isFinite(projectId)
      ? () => {
          window.open(withStandaloneView(`/projects/${projectId}`), "_blank");
          navigate(returnTo);
        }
      : undefined;

  const submitProject = async (input: ProjectInput, tagIds: number[]) => {
    try {
      if (project) {
        const updated = await updateProject(
          project.id,
          { ...input, expectedVersion: project.version },
          tagIds,
        );
        showToast({ tone: "success", title: "Projekt gespeichert" });
        return updated;
      }

      const created = await createProject(input, tagIds);
      showToast({ tone: "success", title: "Projekt erstellt" });
      return created;
    } catch (projectError) {
      showToast({
        tone: "error",
        title: "Projekt konnte nicht gespeichert werden",
        message: errorMessage(projectError),
      });
      throw projectError;
    }
  };

  const postCreateProject = async (
    projectId: number,
    pending: {
      tasks: DraftTask[];
      tickets: DraftTicket[];
      featureIds: number[];
      comments: DraftComment[];
      notes: DraftNote[];
      files: DraftFile[];
    },
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
        setSavingLabel(
          `Speichern… (Datei ${index + 1} von ${pending.files.length})`,
        );
        await uploadProjectAttachment(projectId, file.file);
      }
      showToast({ tone: "success", title: "Projekt-Zuordnungen gespeichert" });
    } catch (postCreateError) {
      showToast({
        tone: "error",
        title:
          "Projekt wurde erstellt, aber nicht alle Zuordnungen konnten gespeichert werden",
        message: errorMessage(postCreateError),
      });
      throw postCreateError;
    } finally {
      setSavingLabel(undefined);
    }
  };

  const deleteProject = async (targetProject: Project) => {
    const approved = await confirm({
      title: "Projekt löschen?",
      body: `Das Projekt "${targetProject.name}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen",
    });
    if (!approved) {
      return false;
    }
    try {
      await removeProject(targetProject.id);
      showToast({ tone: "success", title: "Projekt gelöscht" });
      navigate("/projects");
      return true;
    } catch (projectError) {
      showToast({
        tone: "error",
        title: "Projekt konnte nicht gelöscht werden",
        message: errorMessage(projectError),
      });
      return false;
    }
  };

  if (!isCreateMode && !Number.isFinite(projectId)) {
    return (
      <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-steel-600">
        Projekt nicht gefunden
      </div>
    );
  }

  if (!isCreateMode && loading) {
    return <DetailPageSkeleton />;
  }

  if (!isCreateMode && !project) {
    return (
      <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-steel-600">
        Projekt nicht gefunden
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <ProjectForm
        open
        project={project}
        variant="page"
        onSubmit={submitProject}
        onDelete={deleteProject}
        savingLabel={savingLabel}
        onPostCreate={postCreateProject}
        onClose={closePage}
        onOpenInTab={openInTab}
      />
    </div>
  );
}
