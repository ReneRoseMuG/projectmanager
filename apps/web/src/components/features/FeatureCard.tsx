import type { Feature } from "@taskmanager/shared-types";
import { ArrowRight, BookOpen, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { featureStatusLabels, featureStatusTones } from "../../utils/domainLabels";
import { richTextToPlainText } from "../../utils/richText";
import { ItemCard } from "../ui/ItemCard";
import { Pill } from "../ui/Pill";

interface FeatureCardProps {
  feature: Feature;
  onDelete: (feature: Feature) => void;
}

/** Feature card based on the shared ItemCard surface. */
export function FeatureCard({ feature, onDelete }: FeatureCardProps) {
  const navigate = useNavigate();
  const open = () => navigate(`/features/${feature.id}`);
  const description = richTextToPlainText(feature.description);

  return (
    <ItemCard
      accentColor="var(--color-steel-600)"
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
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-steel-600 text-white shadow-steel-icon" aria-hidden="true">
        <BookOpen size={22} />
      </span>
      <span className="min-w-0">
        <span className="line-clamp-2 text-base font-semibold text-ink">{feature.title}</span>
        <span className="block truncate font-mono text-xs text-slate-500">/features/{feature.slug}</span>
        <span className="mt-2 inline-flex">
          <Pill tone={featureStatusTones[feature.status]}>{featureStatusLabels[feature.status]}</Pill>
        </span>
      </span>
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
