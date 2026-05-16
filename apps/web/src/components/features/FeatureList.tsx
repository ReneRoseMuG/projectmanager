import type { Feature } from "@taskmanager/shared-types";
import { BookOpen, Plus } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { FeatureCard } from "./FeatureCard";

interface FeatureListProps {
  features: Feature[];
  onCreate: () => void;
  onDelete: (feature: Feature) => void;
}

export function FeatureList({ features, onCreate, onDelete }: FeatureListProps) {
  if (features.length === 0) {
    return <EmptyState icon={<BookOpen size={22} />} title="Keine Features" body="Lege ein Feature an, um Use Cases und Aufgaben fachlich zu gruppieren." tone="violet" variant="tinted" actions={[{ label: "Neues Feature", onClick: onCreate, primary: true, icon: <Plus size={17} /> }]} />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {features.map((feature) => (
        <FeatureCard key={feature.id} feature={feature} onDelete={onDelete} />
      ))}
    </div>
  );
}
