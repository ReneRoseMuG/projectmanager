import type { UseCase } from "@taskmanager/shared-types";
import { BookOpen } from "lucide-react";
import { featureStatusLabels, featureStatusTones } from "../../utils/domainLabels";
import { ItemCard } from "../ui/ItemCard";
import { ItemRow } from "../ui/ItemRow";
import { Pill } from "../ui/Pill";

interface UseCaseCardProps {
  useCase: UseCase;
  variant?: "card" | "row";
  onOpen: (useCase: UseCase) => void;
}

const statusAccent: Record<UseCase["status"], string> = {
  draft: "var(--color-mustard)",
  active: "var(--color-fern)",
  done: "var(--color-violet)",
  archived: "var(--color-steel-400)"
};

export function UseCaseCard({ useCase, variant = "card", onOpen }: UseCaseCardProps) {
  if (variant === "row") {
    return (
      <>
        <div className="md:hidden">
          <UseCaseCard useCase={useCase} onOpen={onOpen} />
        </div>
        <div className="hidden md:block">
          <ItemRow
            accentColor={statusAccent[useCase.status]}
            statusIndicator={<UseCaseBadge useCase={useCase} />}
            title={useCase.title}
            description={useCase.description || "Keine Beschreibung"}
            pills={<Pill tone={featureStatusTones[useCase.status]}>{featureStatusLabels[useCase.status]}</Pill>}
            meta={<span className="font-mono text-xs font-semibold text-slate-500">/uc/{useCase.slug}</span>}
            onOpen={() => onOpen(useCase)}
          />
        </div>
      </>
    );
  }

  return (
    <ItemCard
      accentColor={statusAccent[useCase.status]}
      header={
        <div className="grid gap-2">
          <div className="flex items-start gap-3">
            <UseCaseBadge useCase={useCase} />
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-sm font-semibold text-ink">{useCase.title}</h3>
              <p className="mt-1 truncate font-mono text-[11px] text-slate-500">/uc/{useCase.slug}</p>
            </div>
          </div>
          <Pill tone={featureStatusTones[useCase.status]}>{featureStatusLabels[useCase.status]}</Pill>
        </div>
      }
      body={useCase.description ? <p className="line-clamp-3 text-xs text-slate-600">{useCase.description}</p> : null}
      footer={
        <div className="flex items-center justify-between border-t border-line pt-2 text-[11px] font-semibold text-slate-500">
          <span>Doppelklick zum Öffnen</span>
          <span>#{useCase.sortOrder}</span>
        </div>
      }
      onOpen={() => onOpen(useCase)}
    />
  );
}

function UseCaseBadge({ useCase }: { useCase: UseCase }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: statusAccent[useCase.status] }}>
      <BookOpen size={18} />
    </span>
  );
}
