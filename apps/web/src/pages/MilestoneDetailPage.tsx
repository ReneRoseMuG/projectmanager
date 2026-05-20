import type { Milestone, MilestoneInput } from "@taskmanager/shared-types";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { MilestoneForm } from "../components/milestones/MilestoneForm";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { DetailPageSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useMilestones } from "../hooks/useMilestones";
import { useProjects } from "../hooks/useProjects";

export function MilestoneDetailPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const isCreateMode = params.id === undefined;
  const milestoneId = isCreateMode ? undefined : Number(params.id);
  const initialProjectIdParam = searchParams.get("projectId");
  const parsedInitialProjectId = initialProjectIdParam ? Number(initialProjectIdParam) : undefined;
  const initialProjectId = parsedInitialProjectId !== undefined && Number.isFinite(parsedInitialProjectId) ? parsedInitialProjectId : undefined;
  const { projects, loading: projectsLoading } = useProjects();
  const { milestone, loading, createMilestone, updateMilestone, removeMilestone } = useMilestones(milestoneId);

  const returnTo = searchParams.get("returnTo") ?? (initialProjectId && Number.isFinite(initialProjectId) ? `/projects/${initialProjectId}` : "/projects");
  const closePage = () => navigate(returnTo);
  const openInTab =
    !isCreateMode && milestoneId !== undefined && Number.isFinite(milestoneId)
      ? () => {
          window.open(`/milestones/${milestoneId}`, "_blank");
          navigate(returnTo);
        }
      : undefined;

  const submitMilestone = async (input: MilestoneInput, tagIds: number[]) => {
    try {
      if (milestone) {
        const updated = await updateMilestone(milestone.id, { ...input, expectedVersion: milestone.version }, tagIds);
        showToast({ tone: "success", title: "Meilenstein gespeichert" });
        return updated;
      }

      const created = await createMilestone(input, tagIds);
      showToast({ tone: "success", title: "Meilenstein erstellt" });
      navigate(`/milestones/${created.id}?returnTo=${encodeURIComponent(returnTo)}`);
      return created;
    } catch (milestoneError) {
      showToast({ tone: "error", title: "Meilenstein konnte nicht gespeichert werden", message: errorMessage(milestoneError) });
      throw milestoneError;
    }
  };

  const deleteMilestone = async (targetMilestone: Milestone) => {
    const approved = await confirm({
      title: "Meilenstein löschen?",
      body: `Der Meilenstein "${targetMilestone.name}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen"
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
      showToast({ tone: "error", title: "Meilenstein konnte nicht gelöscht werden", message: errorMessage(milestoneError) });
      return false;
    }
  };

  if (!isCreateMode && !Number.isFinite(milestoneId)) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">Meilenstein nicht gefunden</div>;
  }

  if ((!isCreateMode && loading) || projectsLoading) {
    return <DetailPageSkeleton />;
  }

  if (!isCreateMode && !milestone) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">Meilenstein nicht gefunden</div>;
  }

  return (
    <div className="mx-auto -my-4 min-h-[calc(100%+2rem)] max-w-7xl md:-my-6 md:min-h-[calc(100%+3rem)]">
      <MilestoneForm
        open
        milestone={milestone}
        projects={projects}
        initialProjectId={initialProjectId}
        variant="page"
        onSubmit={submitMilestone}
        onDelete={deleteMilestone}
        closeOnSubmit={!isCreateMode}
        onClose={closePage}
        onOpenInTab={openInTab}
      />
    </div>
  );
}
