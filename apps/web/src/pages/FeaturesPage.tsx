import { FEATURE_STATUSES, type DraftComment, type DraftTask, type DraftTicket, type DraftUseCase, type Feature, type FeatureInput, type FeatureStatus } from "@taskmanager/shared-types";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createEntityComment } from "../api/comments";
import { getProjectFeatures, setProjectFeatures } from "../api/doc-links";
import { uploadFeatureAttachment } from "../api/attachments";
import { createOwnerTask, linkOwnerTask } from "../api/tasks";
import { createOwnerTicket, linkOwnerTicket } from "../api/tickets";
import { createUseCase as createUseCaseRequest } from "../api/use-cases";
import type { DraftFile } from "../types";
import { FeatureForm } from "../components/features/FeatureForm";
import { FeatureCardSkeleton } from "../components/features/FeatureCardSkeleton";
import { FeatureListBoardView } from "../components/features/FeatureListBoardView";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { FilterChips } from "../components/ui/FilterChips";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useFeatures } from "../hooks/useFeatures";
import { featureStatusLabels } from "../utils/domainLabels";

export function FeaturesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const features = useFeatures();
  const [formOpen, setFormOpen] = useState(false);
  const [createdFeature, setCreatedFeature] = useState<Feature | null>(null);
  const [savingLabel, setSavingLabel] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<FeatureStatus | "all">("all");

  const statusOptions = useMemo(
    () =>
      FEATURE_STATUSES.map((status) => ({
        value: status,
        label: featureStatusLabels[status],
        count: features.features.filter((feature) => feature.status === status).length
      })),
    [features.features]
  );

  const filteredFeatures = useMemo(() => features.features.filter((feature) => statusFilter === "all" || feature.status === statusFilter), [features.features, statusFilter]);

  const submitFeature = async (input: FeatureInput) => {
    try {
      if (createdFeature) {
        const updated = await features.updateFeature(createdFeature.id, input);
        setCreatedFeature(updated);
        showToast({ tone: "success", title: "Feature gespeichert" });
        return updated;
      }
      const created = await features.createFeature(input);
      setCreatedFeature(created);
      showToast({ tone: "success", title: "Feature erstellt" });
      return created;
    } catch (featureError) {
      showToast({ tone: "error", title: "Feature konnte nicht erstellt werden", message: errorMessage(featureError) });
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
      for (const projectId of pending.projectIds) {
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

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <header className="grid gap-1">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Features</h1>
          <p className="text-sm text-slate-600">Fachliche Features und Use Cases</p>
        </div>
      </header>

      {features.loading ? (
        <FeatureCardSkeleton />
      ) : features.error ? (
        <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-crimson">{features.error}</div>
      ) : (
        <>
          <FeatureListBoardView
            features={filteredFeatures}
            onCreate={() => {
              setCreatedFeature(null);
              setFormOpen(true);
            }}
            filters={<FilterChips value={statusFilter} onChange={setStatusFilter} options={statusOptions} allCount={features.features.length} />}
            onDelete={(feature) => {
              void confirm({
                title: "Feature löschen?",
                body: `Das Feature "${feature.title}" wird entfernt.`,
                severity: "danger",
                confirmLabel: "Löschen"
              }).then((approved) => {
                if (approved) {
                  void features.removeFeature(feature.id)
                    .then(() => showToast({ tone: "success", title: "Feature gelöscht" }))
                    .catch((featureError: unknown) => showToast({ tone: "error", title: "Feature konnte nicht gelöscht werden", message: errorMessage(featureError) }));
                }
              });
            }}
          />
        </>
      )}

      <FeatureForm
        open={formOpen}
        feature={createdFeature}
        onSubmit={submitFeature}
        savingLabel={savingLabel}
        onPostCreate={postCreateFeature}
        onClose={() => {
          setFormOpen(false);
          setCreatedFeature(null);
          setSavingLabel(undefined);
        }}
      />
    </div>
  );
}
