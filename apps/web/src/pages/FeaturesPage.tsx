import type { Feature, FeatureStatus } from "@taskmanager/shared-types";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FeatureCardSkeleton } from "../components/features/FeatureCardSkeleton";
import { FeatureListBoardView } from "../components/features/FeatureListBoardView";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { FilterChips } from "../components/ui/FilterChips";
import { PageHeader } from "../components/ui/PageHeader";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useCatalogs } from "../hooks/useCatalogs";
import { useFeatures } from "../hooks/useFeatures";
import { useStandaloneView } from "../hooks/useStandaloneView";
import { catalogEntriesByKind } from "../utils/catalogs";
import { withStandaloneView } from "../utils/standalone";

export function FeaturesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const standalone = useStandaloneView();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const features = useFeatures();
  const catalogs = useCatalogs();
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FeatureStatus | "all">(
    "all",
  );
  const currentReturnTo = `${location.pathname}${location.search}`;
  const targetForMode = (to: string) => (standalone ? withStandaloneView(to) : to);
  const featureTarget = (path: string) => {
    const params = new URLSearchParams({ returnTo: currentReturnTo });
    return targetForMode(`${path}?${params.toString()}`);
  };

  const statusOptions = useMemo(
    () =>
      catalogEntriesByKind(catalogs.entries, "featureStatus").map((entry) => ({
        value: entry.key,
        label: entry.label,
        color: entry.color,
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

  const refresh = async () => {
    setRefreshing(true);
    try {
      await features.reload();
      await catalogs.reload();
    } finally {
      setRefreshing(false);
    }
  };

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

  const updateFeatureStatus = async (feature: Feature, status: FeatureStatus) => {
    try {
      await features.updateFeature(feature.id, { status, expectedVersion: feature.version });
    } catch (featureError) {
      showToast({
        tone: "error",
        title: "Featurestatus konnte nicht geändert werden",
        message: errorMessage(featureError),
      });
      throw featureError;
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-6">
      <PageHeader
        title="Features"
        subtitle={`${features.features.length} Einträge`}
        onRefresh={standalone ? refresh : undefined}
        refreshing={refreshing}
      />

      {features.loading ? (
        <FeatureCardSkeleton />
      ) : features.error ? (
        <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-crimson">
          {features.error}
        </div>
      ) : (
        <FeatureListBoardView
          features={filteredFeatures}
          onCreate={() => navigate(featureTarget("/features/new"))}
          onOpen={(feature) => navigate(featureTarget(`/features/${feature.id}`))}
          onStatusChange={updateFeatureStatus}
          filters={
            <FilterChips
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
              allCount={features.features.length}
            />
          }
          onDelete={(feature) => void deleteFeature(feature)}
        />
      )}
    </div>
  );
}
