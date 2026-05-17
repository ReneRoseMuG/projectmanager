import { FEATURE_STATUSES, type FeatureInput, type FeatureStatus } from "@taskmanager/shared-types";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

  const createFeature = async (input: FeatureInput) => {
    try {
      const created = await features.createFeature(input);
      showToast({ tone: "success", title: "Feature erstellt" });
      navigate(`/features/${created.id}`);
    } catch (featureError) {
      showToast({ tone: "error", title: "Feature konnte nicht erstellt werden", message: errorMessage(featureError) });
      throw featureError;
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
            onCreate={() => setFormOpen(true)}
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

      <FeatureForm open={formOpen} onSubmit={createFeature} onClose={() => setFormOpen(false)} />
    </div>
  );
}
