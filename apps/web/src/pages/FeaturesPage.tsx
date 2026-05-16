import type { FeatureInput } from "@taskmanager/shared-types";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FeatureForm } from "../components/features/FeatureForm";
import { FeatureList } from "../components/features/FeatureList";
import { Button } from "../components/ui/Button";
import { TaskListSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useFeatures } from "../hooks/useFeatures";

export function FeaturesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const features = useFeatures();
  const [formOpen, setFormOpen] = useState(false);

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
        <FeatureList
          features={features.features}
          onCreate={() => setFormOpen(true)}
          onDelete={(feature) => {
            if (window.confirm("Feature löschen?")) {
              void features.removeFeature(feature.id)
                .then(() => showToast({ tone: "success", title: "Feature gelöscht" }))
                .catch((featureError: unknown) => showToast({ tone: "error", title: "Feature konnte nicht gelöscht werden", message: errorMessage(featureError) }));
            }
          }}
        />
      )}

      <FeatureForm open={formOpen} onSubmit={createFeature} onClose={() => setFormOpen(false)} />
    </div>
  );
}
