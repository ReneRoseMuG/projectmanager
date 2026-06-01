import type { Feature } from "@taskmanager/shared-types";
import { ArrowRight, Edit3, ExternalLink, Layers3, Trash2 } from "lucide-react";
import { useCatalogs } from "../../hooks/useCatalogs";
import { objectReference } from "../../lib/references";
import { catalogColor } from "../../utils/catalogs";
import { richTextToPlainText } from "../../utils/richText";
import { ActionMenu } from "../ui/ActionMenu";
import { CardFooterBar } from "../ui/CardFooterBar";
import { ItemCard } from "../ui/ItemCard";
import { ItemRow } from "../ui/ItemRow";
import { StatusPill } from "../ui/StatusPill";

interface FeatureCardProps {
  feature: Feature;
  variant?: "card" | "row";
  onOpen: (feature: Feature) => void;
  onOpenInTab?: (feature: Feature) => void;
  onDelete: (feature: Feature) => void;
  onStatusChange?: (feature: Feature, status: Feature["status"]) => void | Promise<unknown>;
}

/** Feature card based on the shared ItemCard surface. */
export function FeatureCard({ feature, variant = "card", onOpen, onOpenInTab, onDelete, onStatusChange }: FeatureCardProps) {
  const catalogs = useCatalogs();
  const open = () => onOpen(feature);
  const description = richTextToPlainText(feature.description);
  const statusColor = catalogColor(catalogs.entries, "featureStatus", feature.status);

  if (variant === "row") {
    return (
      <>
        <div className="md:hidden">
          <FeatureCard feature={feature} onOpen={onOpen} onOpenInTab={onOpenInTab} onDelete={onDelete} onStatusChange={onStatusChange} />
        </div>
        <div className="hidden md:block">
          <ItemRow
            accentColor={statusColor}
            objectReference={objectReference("feature", feature.id)}
            title={feature.title}
            description={description}
            pills={<StatusPill kind="featureStatus" value={feature.status} onChange={onStatusChange ? (status) => onStatusChange(feature, status) : undefined} />}
            meta={<span className="text-xs font-semibold text-steel-500">{feature.useCaseCount} Use Cases</span>}
            footer={<CardFooterBar tags={[]} attachmentCount={feature.attachmentCount} noteCount={feature.noteCount} commentCount={feature.commentCount} bordered={false} />}
            actions={<ActionMenu objectReference={objectReference("feature", feature.id)} items={[
              { label: "Bearbeiten", icon: <Edit3 size={16} />, onClick: open },
              ...(onOpenInTab ? [{ label: "In Tab öffnen", icon: <ExternalLink size={16} />, onClick: () => onOpenInTab(feature) }] : []),
              { label: "Löschen", icon: <Trash2 size={16} />, onClick: () => onDelete(feature), danger: true }
            ]} />}
            actionsIncludeObjectReference
            onOpen={open}
          />
        </div>
      </>
    );
  }

  return (
    <ItemCard
      accentColor={statusColor}
      objectReference={objectReference("feature", feature.id)}
      onOpen={open}
      onEdit={open}
      extraMenuItems={onOpenInTab ? [{ label: "In Tab öffnen", icon: <ExternalLink size={16} />, onClick: () => onOpenInTab(feature) }] : []}
      onDelete={() => onDelete(feature)}
      header={<FeatureCardHeader feature={feature} onStatusChange={onStatusChange} />}
      body={description ? <p className="line-clamp-3 text-sm text-steel-600">{description}</p> : null}
      footer={
        <div className="grid gap-3">
          <FeatureCardFooter feature={feature} />
          <CardFooterBar tags={[]} attachmentCount={feature.attachmentCount} noteCount={feature.noteCount} commentCount={feature.commentCount} />
        </div>
      }
    />
  );
}

function FeatureCardHeader({ feature, onStatusChange }: { feature: Feature; onStatusChange?: (feature: Feature, status: Feature["status"]) => void | Promise<unknown> }) {
  return (
    <div className="grid gap-2">
      <span className="line-clamp-2 text-base font-semibold text-ink">{feature.title}</span>
      <StatusPill kind="featureStatus" value={feature.status} onChange={onStatusChange ? (status) => onStatusChange(feature, status) : undefined} />
    </div>
  );
}

function FeatureCardFooter({ feature }: { feature: Feature }) {
  return (
    <div className="group flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-steel-700">
        <Layers3 size={14} />
        {feature.useCaseCount} Use Cases
      </span>
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-steel-100 text-steel-700 transition group-hover:bg-steel-700 group-hover:text-white" aria-hidden="true">
        <ArrowRight size={16} />
      </span>
    </div>
  );
}
