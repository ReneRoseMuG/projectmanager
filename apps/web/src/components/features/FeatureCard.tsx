import type { Feature } from "@taskmanager/shared-types";
import { BookOpen, FileText, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

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

export function FeatureCard({ feature, onDelete }: FeatureCardProps) {
  return (
    <article className="grid min-h-52 gap-4 rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-teal text-white">
            <BookOpen size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-base font-semibold text-ink">{feature.title}</h2>
            <p className="truncate text-xs text-slate-500">{feature.slug}</p>
          </div>
        </div>
        <Button aria-label="Feature löschen" title="Feature löschen" icon={<Trash2 size={16} />} variant="ghost" onClick={() => onDelete(feature)} />
      </div>

      <p className="min-h-10 text-sm text-slate-600">{feature.description || "Keine Kurzbeschreibung"}</p>

      <div className="flex flex-wrap gap-2">
        <Badge muted>{statusLabels[feature.status]}</Badge>
        <Badge muted>
          <span className="inline-flex items-center gap-1">
            <FileText size={13} />
            {feature.useCaseCount} Use Cases
          </span>
        </Badge>
      </div>

      <Link
        className="mt-auto inline-flex h-10 items-center justify-center rounded-md bg-ink px-3 text-sm font-medium text-white transition hover:bg-teal"
        to={`/features/${feature.id}`}
      >
        Öffnen
      </Link>
    </article>
  );
}
