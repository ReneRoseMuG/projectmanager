import type { DraftComment, DraftNote, Milestone, MilestoneInput } from "@taskmanager/shared-types";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { uploadMilestoneAttachment } from "../api/attachments";
import { createEntityComment } from "../api/comments";
import { createMilestoneNote } from "../api/notes";
import {
  MilestoneForm,
  parseMilestoneFormTab,
} from "../components/milestones/MilestoneForm";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { DetailPageSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useMilestones } from "../hooks/useMilestones";
import { useProjects } from "../hooks/useProjects";
import { useStatusCascadeWorkflow } from "../hooks/useStatusCascadeWorkflow";
import type { DraftFile } from "../types";
import { withStandaloneView } from "../utils/standalone";

export function MilestoneDetailPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const statusCascade = useStatusCascadeWorkflow();
  const isCreateMode = params.id === undefined;
  const milestoneId = isCreateMode ? undefined : Number(params.id);
  const initialProjectIdParam = searchParams.get("projectId");
  const parsedInitialProjectId = initialProjectIdParam
    ? Number(initialProjectIdParam)
    : undefined;
  const initialProjectId =
    parsedInitialProjectId !== undefined &&
    Number.isFinite(parsedInitialProjectId)
      ? parsedInitialProjectId
      : undefined;
  const initialTab = parseMilestoneFormTab(searchParams.get("tab"));
  const { projects, loading: projectsLoading } = useProjects();
  const {
    milestone,
    loading,
    createMilestone,
    updateMilestone,
    removeMilestone,
  } = useMilestones(milestoneId);
  useDocumentTitle(isCreateMode ? "[Mei.] Neu" : milestone ? `[Mei.] ${milestone.name}` : "[Mei.]");

  const returnTo =
    searchParams.get("returnTo") ??
    (searchParams.get("standalone") === "1"
      ? withStandaloneView("/milestones")
      : initialProjectId && Number.isFinite(initialProjectId)
      ? `/projects/${initialProjectId}`
      : "/projects");
  const closePage = () => navigate(returnTo);
  const openInTab =
    !isCreateMode && milestoneId !== undefined && Number.isFinite(milestoneId)
      ? () => {
          window.open(withStandaloneView(`/milestones/${milestoneId}`), "_blank");
          navigate(returnTo);
        }
      : undefined;

  const submitMilestone = async (input: MilestoneInput, tagIds: number[]) => {
    try {
      if (milestone) {
        const m = milestone;
        const fieldsChanged =
          input.name !== m.name ||
          (input.description ?? "") !== (m.description ?? "") ||
          (input.status ?? m.status) !== m.status ||
          (input.color ?? null) !== m.color ||
          (input.startDate ?? null) !== m.startDate ||
          (input.dueDate ?? null) !== m.dueDate ||
          (input.responsibleUserId ?? null) !== m.responsibleUserId;

        const currentTagIds = m.tags.map((t) => t.id).sort((a, b) => a - b);
        const nextTagIds = [...tagIds].sort((a, b) => a - b);
        const tagsChanged =
          nextTagIds.length !== currentTagIds.length ||
          nextTagIds.some((id, i) => id !== currentTagIds[i]);

        if (!fieldsChanged && !tagsChanged) {
          return m;
        }

        const updated = await updateMilestone(
          m.id,
          { ...input, expectedVersion: m.version },
          tagsChanged ? tagIds : undefined,
        );
        showToast({ tone: "success", title: "Meilenstein gespeichert" });
        await statusCascade.startMilestoneCascade(m, updated);
        return updated;
      }

      const created = await createMilestone(input, tagIds);
      showToast({ tone: "success", title: "Meilenstein erstellt" });
      return created;
    } catch (milestoneError) {
      showToast({
        tone: "error",
        title: "Meilenstein konnte nicht gespeichert werden",
        message: errorMessage(milestoneError),
      });
      throw milestoneError;
    }
  };

  const postCreateMilestone = async (
    milestoneId: number,
    pending: {
      comments: DraftComment[];
      notes: DraftNote[];
      files: DraftFile[];
    },
  ) => {
    try {
      for (const comment of pending.comments) {
        await createEntityComment("milestone", milestoneId, { body: comment.text });
      }
      for (const note of pending.notes) {
        await createMilestoneNote(milestoneId, note);
      }
      for (const file of pending.files) {
        await uploadMilestoneAttachment(milestoneId, file.file);
      }
    } catch (postCreateError) {
      showToast({
        tone: "error",
        title:
          "Meilenstein wurde erstellt, aber nicht alle Zuordnungen konnten gespeichert werden",
        message: errorMessage(postCreateError),
      });
      throw postCreateError;
    }
  };

  const deleteMilestone = async (targetMilestone: Milestone) => {
    const approved = await confirm({
      title: "Meilenstein löschen?",
      body: `Der Meilenstein "${targetMilestone.name}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen",
    });
    if (!approved) {
      return false;
    }
    try {
      await removeMilestone(targetMilestone.id);
      showToast({ tone: "success", title: "Meilenstein gelöscht" });
      navigate(returnTo);
      return true;
    } catch (milestoneError) {
      showToast({
        tone: "error",
        title: "Meilenstein konnte nicht gelöscht werden",
        message: errorMessage(milestoneError),
      });
      return false;
    }
  };

  if (!isCreateMode && !Number.isFinite(milestoneId)) {
    return (
      <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-steel-600">
        Meilenstein nicht gefunden
      </div>
    );
  }

  if ((!isCreateMode && loading) || projectsLoading) {
    return <DetailPageSkeleton />;
  }

  if (!isCreateMode && !milestone) {
    return (
      <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-steel-600">
        Meilenstein nicht gefunden
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <MilestoneForm
        open
        milestone={milestone}
        projects={projects}
        initialProjectId={initialProjectId}
        initialTab={initialTab}
        variant="page"
        onSubmit={submitMilestone}
        onPostCreate={postCreateMilestone}
        onDelete={deleteMilestone}
        onClose={closePage}
        onOpenInTab={openInTab}
      />
      {statusCascade.dialog}
    </div>
  );
}
