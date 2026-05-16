import type { Feature } from "@taskmanager/shared-types";
import { Plus } from "lucide-react";
import { Button } from "../ui/Button";
import { FeatureCard } from "./FeatureCard";

interface FeatureListProps {
  features: Feature[];
  onCreate: () => void;
  onDelete: (feature: Feature) => void;
}

export function FeatureList({ features, onCreate, onDelete }: FeatureListProps) {
  if (features.length === 0) {
    return (
      <div className="grid gap-4 rounded-lg border border-dashed border-line bg-white p-8 text-center">
        <p className="text-sm text-slate-600">Keine Features</p>
        <div>
          <Button variant="primary" icon={<Plus size={17} />} onClick={onCreate}>
            Neues Feature
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {features.map((feature) => (
        <FeatureCard key={feature.id} feature={feature} onDelete={onDelete} />
      ))}
    </div>
  );
}
