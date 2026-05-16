import type { Feature, FeatureUpdate, UseCase, UseCaseInput, UseCaseUpdate } from "@taskmanager/shared-types";
import { ChevronRight } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { FeatureDetail } from "../components/features/FeatureDetail";
import { TaskListSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { UseCaseDetail } from "../components/usecases/UseCaseDetail";
import { UseCaseForm } from "../components/usecases/UseCaseForm";
import { UseCaseList } from "../components/usecases/UseCaseList";
import { errorMessage } from "../hooks/errors";
import { useFeatures } from "../hooks/useFeatures";
import { useUseCases } from "../hooks/useUseCases";

export function FeatureDetailPage() {
  const params = useParams();
  const featureId = Number(params.id);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const features = useFeatures(Number.isFinite(featureId) ? featureId : undefined);
  const useCases = useUseCases(Number.isFinite(featureId) ? featureId : undefined);
  const [useCaseFormOpen, setUseCaseFormOpen] = useState(false);

  const saveFeature = async (id: number, input: FeatureUpdate) => {
    try {
      await features.updateFeature(id, input);
      showToast({ tone: "success", title: "Feature gespeichert" });
    } catch (featureError) {
      showToast({ tone: "error", title: "Feature konnte nicht gespeichert werden", message: errorMessage(featureError) });
      throw featureError;
    }
  };

  const deleteFeature = (feature: Feature) => {
    if (!window.confirm("Feature löschen?")) {
      return;
    }
    void features.removeFeature(feature.id)
      .then(() => {
        showToast({ tone: "success", title: "Feature gelöscht" });
        navigate("/features");
      })
      .catch((featureError: unknown) => showToast({ tone: "error", title: "Feature konnte nicht gelöscht werden", message: errorMessage(featureError) }));
  };

  const createUseCase = async (input: UseCaseInput) => {
    try {
      await useCases.createUseCase(input);
      await features.reload();
      showToast({ tone: "success", title: "Use Case erstellt" });
    } catch (useCaseError) {
      showToast({ tone: "error", title: "Use Case konnte nicht erstellt werden", message: errorMessage(useCaseError) });
      throw useCaseError;
    }
  };

  const saveUseCase = async (id: number, input: UseCaseUpdate) => {
    try {
      await useCases.updateUseCase(id, input);
      showToast({ tone: "success", title: "Use Case gespeichert" });
    } catch (useCaseError) {
      showToast({ tone: "error", title: "Use Case konnte nicht gespeichert werden", message: errorMessage(useCaseError) });
      throw useCaseError;
    }
  };

  const deleteUseCase = (useCase: UseCase) => {
    if (!window.confirm("Use Case löschen?")) {
      return;
    }
    void useCases.removeUseCase(useCase.id)
      .then(async () => {
        await features.reload();
        showToast({ tone: "success", title: "Use Case gelöscht" });
      })
      .catch((useCaseError: unknown) => showToast({ tone: "error", title: "Use Case konnte nicht gelöscht werden", message: errorMessage(useCaseError) }));
  };

  if (features.loading) {
    return <TaskListSkeleton />;
  }

  if (!features.feature) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">Feature nicht gefunden</div>;
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <header className="grid gap-4">
        <nav className="flex items-center gap-2 text-sm text-slate-600">
          <Link className="hover:text-teal" to="/features">
            Features
          </Link>
          <ChevronRight size={16} />
          <span className="text-ink">{features.feature.title}</span>
        </nav>
        <div>
          <h1 className="text-2xl font-semibold text-ink">{features.feature.title}</h1>
          <p className="text-sm text-slate-600">{features.feature.description || "Keine Kurzbeschreibung"}</p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <FeatureDetail feature={features.feature} onSave={saveFeature} onDelete={deleteFeature} />
        <UseCaseList
          useCases={useCases.useCases}
          selectedId={useCases.selectedUseCase?.id}
          onCreate={() => setUseCaseFormOpen(true)}
          onSelect={(useCase) => void useCases.loadUseCase(useCase.id)}
        />
      </div>

      {useCases.detailLoading ? <TaskListSkeleton /> : null}
      {useCases.error ? <div className="rounded-lg border border-line bg-white p-4 text-sm text-coral">{useCases.error}</div> : null}
      {useCases.selectedUseCase ? <UseCaseDetail useCase={useCases.selectedUseCase} onSave={saveUseCase} onDelete={deleteUseCase} /> : null}

      <UseCaseForm open={useCaseFormOpen} onSubmit={createUseCase} onClose={() => setUseCaseFormOpen(false)} />
    </div>
  );
}
