import type { Feature, FeatureStatus } from "@taskmanager/shared-types";
import { useQueries } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getProjectFeatures } from "../api/doc-links";
import { FeatureCardSkeleton } from "../components/features/FeatureCardSkeleton";
import { FeatureListBoardView } from "../components/features/FeatureListBoardView";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { FilterChips } from "../components/ui/FilterChips";
import { PageHero } from "../components/ui/PageHero";
import { ProjectMilestoneFilterBar } from "../components/ui/ProjectMilestoneFilterBar";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useCatalogs } from "../hooks/useCatalogs";
import { useFeatures } from "../hooks/useFeatures";
import { useProjects } from "../hooks/useProjects";
import { useStandaloneView } from "../hooks/useStandaloneView";
import { queryKeys } from "../queries/queryKeys";
import { catalogEntriesByKind } from "../utils/catalogs";
import { withStandaloneView } from "../utils/standalone";

export function FeaturesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const standalone = useStandaloneView();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const features = useFeatures();
  const projects = useProjects();
  const catalogs = useCatalogs();
  const [statusFilter, setStatusFilter] = useState<FeatureStatus | "all">(
    "all",
  );
  const [projectFilter, setProjectFilter] = useState<number | null>(null);
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

  const projectFeatureQueries = useQueries({
    queries: projects.projects.map((project) => ({
      queryKey: queryKeys.projects.features(project.id),
      queryFn: () => getProjectFeatures(project.id),
      enabled: projectFilter !== null,
    })),
  });
  const selectedProjectIndex = projects.projects.findIndex(
    (project) => project.id === projectFilter,
  );
  const selectedProjectFeatureQuery =
    projectFilter !== null && selectedProjectIndex >= 0
      ? projectFeatureQueries[selectedProjectIndex]
      : undefined;
  const projectFeatureError =
    projectFilter !== null && selectedProjectFeatureQuery?.error
      ? errorMessage(selectedProjectFeatureQuery.error)
      : null;

  const selectedProjectFeatureIds = useMemo(() => {
    if (projectFilter === null) {
      return null;
    }

    return new Set(
      (selectedProjectFeatureQuery?.data ?? []).map((feature) => feature.id),
    );
  }, [projectFilter, selectedProjectFeatureQuery?.data]);

  const filteredFeatures = useMemo(
    () =>
      features.features.filter(
        (feature) =>
          (statusFilter === "all" || feature.status === statusFilter) &&
          (selectedProjectFeatureIds === null ||
            selectedProjectFeatureIds.has(feature.id)),
      ),
    [features.features, selectedProjectFeatureIds, statusFilter],
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
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero
        variant="list"
        title="Features"
        subtitle={`${features.features.length} Einträge`}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-4 pt-4 md:px-5 md:pt-5">
        {features.loading || projects.loading || (projectFilter !== null && selectedProjectFeatureQuery?.isLoading) ? (
          <FeatureCardSkeleton />
        ) : features.error || projects.error || projectFeatureError ? (
          <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-crimson">
            {features.error ?? projects.error ?? projectFeatureError}
          </div>
        ) : (
          <FeatureListBoardView
            features={filteredFeatures}
            onCreate={() => navigate(featureTarget("/features/new"))}
            onOpen={(feature) => navigate(featureTarget(`/features/${feature.id}`))}
            onStatusChange={updateFeatureStatus}
            toolbarFilters={
              <FilterChips
                value={statusFilter}
                onChange={setStatusFilter}
                options={statusOptions}
                allCount={features.features.length}
              />
            }
            filters={
              <ProjectMilestoneFilterBar
                projects={projects.projects}
                projectId={projectFilter}
                onProjectChange={setProjectFilter}
              />
            }
            onDelete={(feature) => void deleteFeature(feature)}
          />
        )}
      </div>
    </div>
  );
}
