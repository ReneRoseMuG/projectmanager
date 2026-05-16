import { FEATURE_STATUSES, type FeatureInput, type FeatureStatus } from "@taskmanager/shared-types";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FeatureForm } from "../components/features/FeatureForm";
import { FeatureList } from "../components/features/FeatureList";
import { Button } from "../components/ui/Button";
import { FilterChips } from "../components/ui/FilterChips";
import { SearchInput } from "../components/ui/SearchInput";
import { TaskListSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useFeatures } from "../hooks/useFeatures";

export function FeaturesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const features = useFeatures();
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FeatureStatus | "all">("all");
  const [search, setSearch] = useState("");

  const statusOptions = useMemo(
    () =>
      FEATURE_STATUSES.map((status) => ({
        value: status,
        label: statusLabels[status],
        count: features.features.filter((feature) => feature.status === status).length
      })),
    [features.features]
  );

  const filteredFeatures = useMemo(() => {
    const query = search.trim().toLowerCase();
    return features.features.filter((feature) => {
      const matchesStatus = statusFilter === "all" || feature.status === statusFilter;
      const matchesSearch = !query || feature.title.toLowerCase().includes(query) || feature.slug.toLowerCase().includes(query) || (feature.description ?? "").toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [features.features, search, statusFilter]);

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
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Features</h1>
          <p className="text-sm text-slate-600">Fachliche Features und Use Cases</p>
        </div>
        <Button variant="primary" icon={<Plus size={17} />} onClick={() => setFormOpen(true)}>
          Neues Feature
        </Button>
      </header>

      {features.loading ? (
        <TaskListSkeleton />
      ) : features.error ? (
        <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-coral">{features.error}</div>
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <FilterChips value={statusFilter} onChange={setStatusFilter} options={statusOptions} allCount={features.features.length} />
            <SearchInput value={search} onChange={setSearch} placeholder="Features suchen" />
          </div>
          <FeatureList
            features={filteredFeatures}
            onCreate={() => setFormOpen(true)}
            onDelete={(feature) => {
              if (window.confirm("Feature löschen?")) {
                void features.removeFeature(feature.id)
                  .then(() => showToast({ tone: "success", title: "Feature gelöscht" }))
                  .catch((featureError: unknown) => showToast({ tone: "error", title: "Feature konnte nicht gelöscht werden", message: errorMessage(featureError) }));
              }
            }}
          />
        </>
      )}

      <FeatureForm open={formOpen} onSubmit={createFeature} onClose={() => setFormOpen(false)} />
    </div>
  );
}

const statusLabels: Record<FeatureStatus, string> = {
  draft: "Entwurf",
  active: "Aktiv",
  done: "Erledigt",
  archived: "Archiviert"
};
