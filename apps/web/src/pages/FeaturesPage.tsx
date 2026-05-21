import type { Feature, FeatureStatus } from "@taskmanager/shared-types";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FeatureCardSkeleton } from "../components/features/FeatureCardSkeleton";
import { FeatureListBoardView } from "../components/features/FeatureListBoardView";
import { Button } from "../components/ui/Button";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { FilterChips } from "../components/ui/FilterChips";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useCatalogs } from "../hooks/useCatalogs";
import { useFeatures } from "../hooks/useFeatures";
import { catalogEntriesByKind } from "../utils/catalogs";

export function FeaturesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const features = useFeatures();
  const catalogs = useCatalogs();
  const [statusFilter, setStatusFilter] = useState<FeatureStatus | "all">(
    "all",
  );

  const statusOptions = useMemo(
    () =>
      catalogEntriesByKind(catalogs.entries, "featureStatus").map((entry) => ({
        value: entry.key,
        label: entry.label,
        count: features.features.filter(
          (feature) => feature.status === entry.key,
        ).length,
      })),
    [catalogs.entries, features.features],
  );

  const filteredFeatures = useMemo(
    () =>
      features.features.filter(
        (feature) => statusFilter === "all" || feature.status === statusFilter,
      ),
    [features.features, statusFilter],
  );

  const deleteFeature = async (feature: Feature) => {
    const approved = await confirm({
      title: "Feature löschen?",
      body: `Das Feature "${feature.title}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen",
    });
    if (!approved) {
      return;
    }

    try {
      await features.removeFeature(feature.id);
      showToast({ tone: "success", title: "Feature gelöscht" });
    } catch (featureError) {
      showToast({
        tone: "error",
        title: "Feature konnte nicht gelöscht werden",
        message: errorMessage(featureError),
      });
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Features</h1>
          <p className="text-sm text-slate-500">
            {features.features.length} Einträge
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={17} />}
          onClick={() => navigate("/features/new")}
        >
          Neues Feature
        </Button>
      </header>

      {features.loading ? (
        <FeatureCardSkeleton />
      ) : features.error ? (
        <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-crimson">
          {features.error}
        </div>
      ) : (
        <FeatureListBoardView
          features={filteredFeatures}
          onCreate={() => navigate("/features/new")}
          onOpen={(feature) => navigate(`/features/${feature.id}`)}
          filters={
            <FilterChips
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
              allCount={features.features.length}
            />
          }
          onDelete={(feature) => void deleteFeature(feature)}
          showToolbarAdd={false}
        />
      )}
    </div>
  );
}
