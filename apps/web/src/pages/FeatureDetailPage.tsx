import type { Feature, FeatureInput, FeatureUpdate } from "@taskmanager/shared-types";
import { ChevronRight, Edit3 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FeatureForm } from "../components/features/FeatureForm";
import { Button } from "../components/ui/Button";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { Pill } from "../components/ui/Pill";
import { TaskListSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useFeatures } from "../hooks/useFeatures";
import { formatHumanDate } from "../utils/date";
import { featureStatusLabels, featureStatusTones } from "../utils/domainLabels";
import { richTextToPlainText } from "../utils/richText";

export function FeatureDetailPage() {
  const params = useParams();
  const featureId = Number(params.id);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const features = useFeatures(Number.isFinite(featureId) ? featureId : undefined);
  const [formOpen, setFormOpen] = useState(false);

  const saveFeature = async (input: FeatureInput) => {
    if (!features.feature) {
      return;
    }
    try {
      const updated = await features.updateFeature(features.feature.id, input as FeatureUpdate);
      await features.reload();
      showToast({ tone: "success", title: "Feature gespeichert" });
      return updated;
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
      return false;
    }
    try {
      await features.removeFeature(feature.id);
      showToast({ tone: "success", title: "Feature gelöscht" });
      navigate("/features");
      return true;
    } catch (featureError) {
      showToast({ tone: "error", title: "Feature konnte nicht gelöscht werden", message: errorMessage(featureError) });
      return false;
    }
  };

  if (features.loading) {
    return <TaskListSkeleton />;
  }

  if (!features.feature) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">Feature nicht gefunden</div>;
  }

  const feature = features.feature;
  const description = richTextToPlainText(feature.description);

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-steel-700 via-steel-600 to-violet p-6 text-white shadow-steel">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="grid min-w-0 gap-3">
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
              {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">{description}</p> : null}
            </div>
          </div>
          <Button className="border-white/20 bg-white/10 text-white hover:bg-white/20" icon={<Edit3 size={17} />} variant="ghost" onClick={() => setFormOpen(true)}>
            Bearbeiten
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap gap-5 border-t border-white/15 pt-4">
          <HeroStat label="Status">
            <Pill tone={featureStatusTones[feature.status]}>{featureStatusLabels[feature.status]}</Pill>
          </HeroStat>
          <HeroStat label="Use Cases">{feature.useCaseCount}</HeroStat>
          <HeroStat label="Sortierung">#{feature.sortOrder}</HeroStat>
          <HeroStat label="Aktualisiert">{formatHumanDate(feature.updatedAt)}</HeroStat>
        </div>
      </header>

      <FeatureForm open={formOpen} feature={feature} onSubmit={saveFeature} onDelete={deleteFeature} onClose={() => setFormOpen(false)} />
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
