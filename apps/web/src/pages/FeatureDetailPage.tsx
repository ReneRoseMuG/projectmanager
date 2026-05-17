import type { Feature, FeatureUpdate, UseCase, UseCaseInput, UseCaseUpdate } from "@taskmanager/shared-types";
import { ChevronRight, MoreHorizontal, Save, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { FeatureDetail } from "../components/features/FeatureDetail";
import { FeatureProjectLinksPanel } from "../components/features/FeatureProjectLinksPanel";
import { Button } from "../components/ui/Button";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { Pill, type PillTone } from "../components/ui/Pill";
import { TaskListSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { UseCaseForm } from "../components/usecases/UseCaseForm";
import { UseCaseList } from "../components/usecases/UseCaseList";
import { errorMessage } from "../hooks/errors";
import { useFeatures } from "../hooks/useFeatures";
import { useUseCases } from "../hooks/useUseCases";
import type { ViewMode } from "../types";
import { formatHumanDate } from "../utils/date";

type FeatureTab = "details" | "useCases" | "projects";

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

const tabLabels: Record<FeatureTab, string> = {
  details: "Stammdaten",
  useCases: "Use Cases",
  projects: "Projekte"
};

export function FeatureDetailPage() {
  const params = useParams();
  const featureId = Number(params.id);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const features = useFeatures(Number.isFinite(featureId) ? featureId : undefined);
  const useCases = useUseCases(Number.isFinite(featureId) ? featureId : undefined);
  const [activeTab, setActiveTab] = useState<FeatureTab>("details");
  const [useCaseViewMode, setUseCaseViewMode] = useState<ViewMode>("kanban");
  const [useCaseFormOpen, setUseCaseFormOpen] = useState(false);
  const [editingUseCase, setEditingUseCase] = useState<UseCase | null>(null);

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
      await features.reload();
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
      return false;
    }
    try {
      await useCases.removeUseCase(useCase.id);
      await features.reload();
      setEditingUseCase(null);
      showToast({ tone: "success", title: "Use Case gelöscht" });
      return true;
    } catch (useCaseError) {
      showToast({ tone: "error", title: "Use Case konnte nicht gelöscht werden", message: errorMessage(useCaseError) });
      return false;
    }
  };

  const openCreateUseCaseForm = () => {
    setEditingUseCase(null);
    setUseCaseFormOpen(true);
  };

  const openUseCaseForm = async (useCase: UseCase) => {
    try {
      const loadedUseCase = await useCases.loadUseCase(useCase.id);
      setEditingUseCase(loadedUseCase);
      setUseCaseFormOpen(true);
    } catch (useCaseError) {
      showToast({ tone: "error", title: "Use Case konnte nicht geladen werden", message: errorMessage(useCaseError) });
    }
  };

  const submitUseCaseForm = async (input: UseCaseInput) => {
    if (editingUseCase) {
      await saveUseCase(editingUseCase.id, input);
      setEditingUseCase(null);
      return;
    }
    await createUseCase(input);
  };

  const closeUseCaseForm = () => {
    setUseCaseFormOpen(false);
    setEditingUseCase(null);
  };

  if (features.loading) {
    return <TaskListSkeleton />;
  }

  if (!features.feature) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">Feature nicht gefunden</div>;
  }

  const feature = features.feature;
  const tabMeta =
    activeTab === "details"
      ? "Stammdaten"
      : activeTab === "useCases"
        ? `${useCases.useCases.length} Use Cases · Doppelklick öffnet Detail`
        : "Projekt-Relationen dieses Features";

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
              <p className="mt-1 font-mono text-xs text-white/75">/features/{feature.slug}</p>
              <p className="mt-3 max-w-[760px] text-[15px] text-white/90">{feature.description || "Keine Kurzbeschreibung"}</p>
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
            <Button
              aria-label="Weitere Aktionen"
              title="Weitere Aktionen"
              className="border border-white/24 bg-white/14 text-white hover:bg-white/20"
              icon={<MoreHorizontal size={16} />}
              variant="ghost"
            />
            <Button className="bg-white text-steel-700 hover:bg-steel-50" form="feature-detail-form" icon={<Save size={16} />} type="submit" variant="ghost">
              Speichern
            </Button>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-5 border-t border-white/15 pt-4">
          <HeroStat label="Status">
            <Pill tone={statusTones[feature.status]}>{statusLabels[feature.status]}</Pill>
          </HeroStat>
          <HeroStat label="Use Cases">{feature.useCaseCount}</HeroStat>
          <HeroStat label="Sortierung">#{feature.sortOrder}</HeroStat>
          <HeroStat label="Aktualisiert">{formatHumanDate(feature.updatedAt)}</HeroStat>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-line bg-white p-1 shadow-sm" role="tablist" aria-label="Feature-Detail">
          {(["details", "useCases", "projects"] as FeatureTab[]).map((tab) => (
            <button
              key={tab}
              className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                activeTab === tab ? "bg-steel-900 text-white" : "text-slate-600 hover:bg-steel-50 hover:text-ink"
              }`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            >
              {tabLabels[tab]}
              {tab === "useCases" ? (
                <span className={`rounded-full px-1.5 text-[11px] ${activeTab === tab ? "bg-white/20 text-white" : "bg-steel-100 text-slate-600"}`}>
                  {useCases.useCases.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <span className="text-xs font-semibold text-slate-500">{tabMeta}</span>
      </div>

      {useCases.error ? <div className="rounded-lg border border-line bg-white p-4 text-sm text-crimson">{useCases.error}</div> : null}
      {useCases.detailLoading ? <div className="rounded-lg border border-line bg-white p-4 text-sm font-semibold text-slate-500">Use Case wird geladen...</div> : null}

      {activeTab === "details" ? <FeatureDetail feature={feature} onSave={saveFeature} onDelete={deleteFeature} /> : null}
      {activeTab === "useCases" && useCases.loading ? <TaskListSkeleton /> : null}
      {activeTab === "useCases" && !useCases.loading ? (
        <UseCaseList
          useCases={useCases.useCases}
          viewMode={useCaseViewMode}
          onViewModeChange={setUseCaseViewMode}
          onCreate={openCreateUseCaseForm}
          onOpen={(useCase) => void openUseCaseForm(useCase)}
        />
      ) : null}
      {activeTab === "projects" ? <FeatureProjectLinksPanel featureId={feature.id} /> : null}

      <UseCaseForm
        open={useCaseFormOpen}
        useCase={editingUseCase}
        featureTitle={feature.title}
        onSubmit={submitUseCaseForm}
        onDelete={deleteUseCase}
        onClose={closeUseCaseForm}
      />
    </div>
  );
}

function HeroStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wide text-white/65">{label}</span>
      <span className="text-lg font-bold text-white">{children}</span>
    </div>
  );
}
