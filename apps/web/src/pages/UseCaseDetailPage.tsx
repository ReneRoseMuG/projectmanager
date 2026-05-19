import type { DraftComment, DraftTask, DraftTicket, UseCase, UseCaseInput } from "@taskmanager/shared-types";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { createEntityComment } from "../api/comments";
import { createOwnerTask, linkOwnerTask } from "../api/tasks";
import { createOwnerTicket, linkOwnerTicket } from "../api/tickets";
import { getUseCase } from "../api/use-cases";
import { UseCaseForm } from "../components/usecases/UseCaseForm";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { DetailPageSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useFeatures } from "../hooks/useFeatures";
import { useUseCases } from "../hooks/useUseCases";

export function UseCaseDetailPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const isCreateMode = params.id === undefined;
  const useCaseId = isCreateMode ? null : Number(params.id);
  const initialFeatureIdParam = searchParams.get("featureId");
  const initialFeatureId = initialFeatureIdParam ? Number(initialFeatureIdParam) : undefined;
  const validFeatureId = initialFeatureId !== undefined && Number.isFinite(initialFeatureId) ? initialFeatureId : undefined;
  const allFeatures = useFeatures();
  const useCases = useUseCases(validFeatureId);
  const [useCase, setUseCase] = useState<UseCase | null>(null);
  const [loading, setLoading] = useState(false);
  const returnTo = searchParams.get("returnTo") ?? (useCase ? `/features/${useCase.featureId}` : "/features");

  useEffect(() => {
    const id = useCaseId;
    if (isCreateMode || id === null || !Number.isFinite(id)) {
      return;
    }
    setLoading(true);
    getUseCase(id)
      .then(setUseCase)
      .finally(() => setLoading(false));
  }, [isCreateMode, useCaseId]);

  const closePage = () => navigate(returnTo);

  const submitUseCase = async (input: UseCaseInput) => {
    try {
      if (useCase) {
        const updated = await useCases.updateUseCase(useCase.id, { ...input, expectedVersion: useCase.version });
        setUseCase(updated);
        showToast({ tone: "success", title: "Use Case gespeichert" });
        return updated;
      }
      const created = await useCases.createUseCase(input);
      showToast({ tone: "success", title: "Use Case erstellt" });
      return created;
    } catch (useCaseError) {
      showToast({ tone: "error", title: "Use Case konnte nicht gespeichert werden", message: errorMessage(useCaseError) });
      throw useCaseError;
    }
  };

  const postCreateUseCase = async (useCaseId: number, pending: { tasks: DraftTask[]; tickets: DraftTicket[]; comments: DraftComment[] }) => {
    const owner = { type: "useCase" as const, id: useCaseId };
    try {
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
        await createEntityComment("useCase", useCaseId, { body: comment.text });
      }
      navigate(`/use-cases/${useCaseId}?returnTo=${encodeURIComponent(returnTo)}`);
    } catch (postCreateError) {
      showToast({ tone: "error", title: "Use Case wurde erstellt, aber nicht alle Zuordnungen konnten gespeichert werden", message: errorMessage(postCreateError) });
      throw postCreateError;
    }
  };

  const deleteUseCase = async (targetUseCase: UseCase) => {
    const approved = await confirm({
      title: "Use Case löschen?",
      body: `Der Use Case "${targetUseCase.title}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen"
    });
    if (!approved) {
      return false;
    }
    try {
      await useCases.removeUseCase(targetUseCase.id);
      showToast({ tone: "success", title: "Use Case gelöscht" });
      navigate(returnTo);
      return true;
    } catch (useCaseError) {
      showToast({ tone: "error", title: "Use Case konnte nicht gelöscht werden", message: errorMessage(useCaseError) });
      return false;
    }
  };

  if (isCreateMode && validFeatureId === undefined) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">Use Cases benötigen ein Feature.</div>;
  }

  if (!isCreateMode && !Number.isFinite(useCaseId)) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">Use Case nicht gefunden</div>;
  }

  if (!isCreateMode && loading) {
    return <DetailPageSkeleton />;
  }

  if (!isCreateMode && !useCase) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">Use Case nicht gefunden</div>;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <UseCaseForm
        open
        useCase={useCase}
        currentFeatureId={useCase?.featureId ?? validFeatureId}
        features={allFeatures.features}
        variant="page"
        closeOnSubmit={false}
        onSubmit={submitUseCase}
        onPostCreate={postCreateUseCase}
        onDelete={deleteUseCase}
        onClose={closePage}
      />
    </div>
  );
}
