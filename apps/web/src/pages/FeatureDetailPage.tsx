import type { DraftComment, DraftTask, DraftTicket, DraftUseCase, Feature, FeatureInput } from "@taskmanager/shared-types";
import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { uploadFeatureAttachment } from "../api/attachments";
import { createEntityComment } from "../api/comments";
import { getProjectFeatures, setProjectFeatures } from "../api/doc-links";
import { createOwnerTask, linkOwnerTask } from "../api/tasks";
import { createOwnerTicket, linkOwnerTicket } from "../api/tickets";
import { createUseCase as createUseCaseRequest } from "../api/use-cases";
import { FeatureForm } from "../components/features/FeatureForm";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { DetailPageSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useFeatures } from "../hooks/useFeatures";
import type { DraftFile } from "../types";

export function FeatureDetailPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const isCreateMode = params.id === undefined;
  const featureId = isCreateMode ? undefined : Number(params.id);
  const initialProjectIdParam = searchParams.get("projectId");
  const initialProjectId = initialProjectIdParam ? Number(initialProjectIdParam) : undefined;
  const features = useFeatures(featureId);
  const [savingLabel, setSavingLabel] = useState<string | undefined>();

  const returnTo = searchParams.get("returnTo") ?? "/features";
  const closePage = () => navigate(returnTo);

  const saveFeature = async (input: FeatureInput) => {
    try {
      if (features.feature) {
        const updated = await features.updateFeature(features.feature.id, input);
        await features.reload();
        showToast({ tone: "success", title: "Feature gespeichert" });
        return updated;
      }

      const created = await features.createFeature(input);
      showToast({ tone: "success", title: "Feature erstellt" });
      return created;
    } catch (featureError) {
      showToast({ tone: "error", title: "Feature konnte nicht gespeichert werden", message: errorMessage(featureError) });
      throw featureError;
    }
  };

  const postCreateFeature = async (
    featureId: number,
    pending: { tasks: DraftTask[]; tickets: DraftTicket[]; useCases: DraftUseCase[]; projectIds: number[]; comments: DraftComment[]; files: DraftFile[] }
  ) => {
    const owner = { type: "feature" as const, id: featureId };
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
      for (const useCase of pending.useCases) {
        if (useCase.kind === "new") {
          await createUseCaseRequest(featureId, useCase.draft);
        }
      }
      const projectIds = initialProjectId !== undefined && Number.isFinite(initialProjectId) ? [...new Set([...pending.projectIds, initialProjectId])] : pending.projectIds;
      for (const projectId of projectIds) {
        const linkedFeatures = await getProjectFeatures(projectId);
        await setProjectFeatures(projectId, [...new Set([...linkedFeatures.map((feature) => feature.id), featureId])]);
      }
      for (const comment of pending.comments) {
        await createEntityComment("feature", featureId, { body: comment.text });
      }
      for (let index = 0; index < pending.files.length; index += 1) {
        const file = pending.files[index];
        if (!file) {
          continue;
        }
        setSavingLabel(`Speichern… (Datei ${index + 1} von ${pending.files.length})`);
        await uploadFeatureAttachment(featureId, file.file);
      }
      await features.reload();
      showToast({ tone: "success", title: "Feature-Zuordnungen gespeichert" });
      navigate(`/features/${featureId}`);
    } catch (postCreateError) {
      showToast({ tone: "error", title: "Feature wurde erstellt, aber nicht alle Zuordnungen konnten gespeichert werden", message: errorMessage(postCreateError) });
      throw postCreateError;
    } finally {
      setSavingLabel(undefined);
    }
  };

  const deleteFeature = async (feature: Feature) => {
    const approved = await confirm({
      title: "Feature löschen?",
      body: `Das Feature "${feature.title}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen"
    });
    if (!approved) {
      return false;
    }
    try {
      await features.removeFeature(feature.id);
      showToast({ tone: "success", title: "Feature gelöscht" });
      navigate("/features");
      return true;
    } catch (featureError) {
      showToast({ tone: "error", title: "Feature konnte nicht gelöscht werden", message: errorMessage(featureError) });
      return false;
    }
  };

  if (!isCreateMode && !Number.isFinite(featureId)) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">Feature nicht gefunden</div>;
  }

  if (!isCreateMode && features.loading) {
    return <DetailPageSkeleton />;
  }

  if (!isCreateMode && !features.feature) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">Feature nicht gefunden</div>;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <FeatureForm
        open
        feature={features.feature}
        variant="page"
        closeOnSubmit={false}
        onSubmit={saveFeature}
        onDelete={deleteFeature}
        savingLabel={savingLabel}
        onPostCreate={postCreateFeature}
        onClose={closePage}
      />
    </div>
  );
}
