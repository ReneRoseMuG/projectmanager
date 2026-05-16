import type { Feature } from "@taskmanager/shared-types";
import { ArrowRight, BookOpen, FileText, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { Pill, type PillTone } from "../ui/Pill";

interface FeatureCardProps {
  feature: Feature;
  onDelete: (feature: Feature) => void;
}

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

export function FeatureCard({ feature, onDelete }: FeatureCardProps) {
  const accent = "#4682B4";

  return (
    <article className="group relative grid min-h-56 gap-4 overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-panel">
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: accent }} />
      <Link className="absolute inset-0 z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-steel-500" to={`/features/${feature.id}`} aria-label={`${feature.title} öffnen`} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-steel-600 text-white" style={{ boxShadow: `0 6px 18px ${accent}48` }}>
            <BookOpen size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-base font-semibold text-ink">{feature.title}</h2>
            <p className="truncate text-xs text-slate-500">{feature.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={statusTones[feature.status]}>{statusLabels[feature.status]}</Pill>
          <Button
            aria-label="Feature löschen"
            title="Feature löschen"
            icon={<Trash2 size={16} />}
            variant="ghost"
            className="relative z-20"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(feature);
            }}
          />
        </div>
      </div>

      <p className="min-h-10 text-sm text-slate-600">{feature.description || "Keine Kurzbeschreibung"}</p>

      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-steel-700">
          <FileText size={14} />
          {feature.useCaseCount} Use Cases
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-steel-100 text-steel-700 transition group-hover:bg-steel-700 group-hover:text-white" aria-hidden="true">
          <ArrowRight size={16} />
        </span>
      </footer>
    </article>
  );
}
