import type { Feature } from "@taskmanager/shared-types";
import { ArrowRight, FileText } from "lucide-react";
import { useCatalogs } from "../../hooks/useCatalogs";
import { catalogColor } from "../../utils/catalogs";
import { richTextToPlainText } from "../../utils/richText";
import { ItemCard } from "../ui/ItemCard";
import { StatusPill } from "../ui/StatusPill";

interface FeatureCardProps {
  feature: Feature;
  onOpen: (feature: Feature) => void;
  onDelete: (feature: Feature) => void;
}

/** Feature card based on the shared ItemCard surface. */
export function FeatureCard({ feature, onOpen, onDelete }: FeatureCardProps) {
  const catalogs = useCatalogs();
  const open = () => onOpen(feature);
  const description = richTextToPlainText(feature.description);

  return (
    <ItemCard
      accentColor={catalogColor(catalogs.entries, "featureStatus", feature.status)}
      onOpen={open}
      onEdit={open}
      onDelete={() => onDelete(feature)}
      header={<FeatureCardHeader feature={feature} />}
      body={description ? <p className="line-clamp-3 text-sm text-slate-600">{description}</p> : null}
      footer={<FeatureCardFooter feature={feature} />}
    />
  );
}

function FeatureCardHeader({ feature }: { feature: Feature }) {
  return (
    <div className="grid gap-2">
      <span className="line-clamp-2 text-base font-semibold text-ink">{feature.title}</span>
      <StatusPill kind="featureStatus" value={feature.status} />
    </div>
  );
}

function FeatureCardFooter({ feature }: { feature: Feature }) {
  return (
    <div className="group flex items-center justify-between gap-3 border-t border-line pt-3">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-steel-700">
        <FileText size={14} />
        {feature.useCaseCount} Use Cases
      </span>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-steel-100 text-steel-700 transition group-hover:bg-steel-700 group-hover:text-white" aria-hidden="true">
        <ArrowRight size={16} />
      </span>
    </div>
  );
}
