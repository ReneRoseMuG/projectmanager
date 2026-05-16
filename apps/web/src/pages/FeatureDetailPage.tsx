import type { Feature, FeatureUpdate, UseCase, UseCaseInput, UseCaseUpdate } from "@taskmanager/shared-types";
import { ChevronRight, Save, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { FeatureDetail } from "../components/features/FeatureDetail";
import { Button } from "../components/ui/Button";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { Pill, type PillTone } from "../components/ui/Pill";
import { TaskListSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { UseCaseDetail } from "../components/usecases/UseCaseDetail";
import { UseCaseForm } from "../components/usecases/UseCaseForm";
import { UseCaseList } from "../components/usecases/UseCaseList";
import { errorMessage } from "../hooks/errors";
import { useFeatures } from "../hooks/useFeatures";
import { useUseCases } from "../hooks/useUseCases";
import { formatHumanDate } from "../utils/date";

const statusLabels: Record<Feature["status"], string> = {
  draft: "Entwurf",
  active: "Aktiv",
  done: "Erledigt",
  archived: "Archiviert"
};

const statusTones: Record<Feature["status"], PillTone> = {
  draft: "mustard",
  active: "fern",
  done: "violet",
  archived: "steel"
};

export function FeatureDetailPage() {
  const params = useParams();
  const featureId = Number(params.id);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
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

  const deleteFeature = async (feature: Feature) => {
    const approved = await confirm({
      title: "Feature löschen?",
      body: `Das Feature "${feature.title}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen"
    });
    if (!approved) {
      return;
    }
    try {
      await features.removeFeature(feature.id);
      showToast({ tone: "success", title: "Feature gelöscht" });
      navigate("/features");
    } catch (featureError) {
      showToast({ tone: "error", title: "Feature konnte nicht gelöscht werden", message: errorMessage(featureError) });
    }
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

  const deleteUseCase = async (useCase: UseCase) => {
    const approved = await confirm({
      title: "Use Case löschen?",
      body: `Der Use Case "${useCase.title}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen"
    });
    if (!approved) {
      return;
    }
    try {
      await useCases.removeUseCase(useCase.id);
      await features.reload();
      showToast({ tone: "success", title: "Use Case gelöscht" });
    } catch (useCaseError) {
      showToast({ tone: "error", title: "Use Case konnte nicht gelöscht werden", message: errorMessage(useCaseError) });
    }
  };

  if (features.loading) {
    return <TaskListSkeleton />;
  }

  if (!features.feature) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">Feature nicht gefunden</div>;
  }

  const feature = features.feature;

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-steel-700 via-steel-600 to-violet p-6 text-white shadow-steel">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="grid gap-3">
            <nav className="flex items-center gap-2 text-sm text-white/70">
              <Link className="hover:text-white" to="/features">
                Features
              </Link>
              <ChevronRight size={16} />
              <span className="text-white">{feature.title}</span>
            </nav>
            <div>
              <h1 className="text-[28px] font-bold text-white">{feature.title}</h1>
              <p className="mt-1 font-mono text-xs text-white/75">{feature.slug}</p>
              <p className="mt-3 max-w-[720px] text-[15px] text-white/90">{feature.description || "Keine Kurzbeschreibung"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="border border-white/24 bg-white/14 text-white hover:bg-white/20"
              icon={<Trash2 size={16} />}
              variant="ghost"
              onClick={() => void deleteFeature(feature)}
            >
              Löschen
            </Button>
            <Button className="bg-white text-steel-700 hover:bg-steel-50" form="feature-detail-form" icon={<Save size={16} />} type="submit" variant="ghost">
              Speichern
            </Button>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/15 pt-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white">
            Status <Pill tone={statusTones[feature.status]}>{statusLabels[feature.status]}</Pill>
          </span>
          <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white">{feature.useCaseCount} Use Cases</span>
          <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white">Aktualisiert {formatHumanDate(feature.updatedAt)}</span>
          <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white">#{feature.sortOrder}</span>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <FeatureDetail feature={feature} onSave={saveFeature} onDelete={deleteFeature} />
        <UseCaseList
          useCases={useCases.useCases}
          selectedId={useCases.selectedUseCase?.id}
          onCreate={() => setUseCaseFormOpen(true)}
          onSelect={(useCase) => void useCases.loadUseCase(useCase.id)}
        />
      </div>

      {useCases.detailLoading ? <TaskListSkeleton /> : null}
      {useCases.error ? <div className="rounded-lg border border-line bg-white p-4 text-sm text-crimson">{useCases.error}</div> : null}
      {useCases.selectedUseCase ? <UseCaseDetail useCase={useCases.selectedUseCase} onSave={saveUseCase} onDelete={deleteUseCase} /> : null}

      <UseCaseForm open={useCaseFormOpen} onSubmit={createUseCase} onClose={() => setUseCaseFormOpen(false)} />
    </div>
  );
}
