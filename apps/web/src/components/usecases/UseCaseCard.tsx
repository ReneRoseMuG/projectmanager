import type { UseCase } from "@taskmanager/shared-types";
import { Edit3 } from "lucide-react";
import { richTextToPlainText } from "../../utils/richText";
import { ActionMenu } from "../ui/ActionMenu";
import { ItemCard } from "../ui/ItemCard";
import { ItemRow } from "../ui/ItemRow";
import { StatusPill } from "../ui/StatusPill";

interface UseCaseCardProps {
  useCase: UseCase;
  variant?: "card" | "row";
  onOpen: (useCase: UseCase) => void;
}

const statusAccent: Record<string, string> = {
  draft: "var(--color-mustard)",
  active: "var(--color-fern)",
  done: "var(--color-violet)",
  archived: "var(--color-steel-400)"
};

export function UseCaseCard({ useCase, variant = "card", onOpen }: UseCaseCardProps) {
  const description = richTextToPlainText(useCase.description);

  if (variant === "row") {
    return (
      <>
        <div className="md:hidden">
          <UseCaseCard useCase={useCase} onOpen={onOpen} />
        </div>
        <div className="hidden md:block">
          <ItemRow
            accentColor={statusAccent[useCase.status] ?? "var(--color-steel-400)"}
            title={useCase.title}
            description={description}
            pills={<StatusPill kind="featureStatus" value={useCase.status} />}
            actions={<ActionMenu items={[{ label: "Bearbeiten", icon: <Edit3 size={16} />, onClick: () => onOpen(useCase) }]} />}
            onOpen={() => onOpen(useCase)}
          />
        </div>
      </>
    );
  }

  return (
    <ItemCard
      accentColor={statusAccent[useCase.status] ?? "var(--color-steel-400)"}
      header={
        <div className="grid gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-ink">{useCase.title}</h3>
          <StatusPill kind="featureStatus" value={useCase.status} />
        </div>
      }
      body={description ? <p className="line-clamp-3 text-xs text-slate-600">{description}</p> : null}
      footer={
        <div className="flex items-center justify-between border-t border-line pt-2 text-[11px] font-semibold text-slate-500">
          <span>Doppelklick zum Öffnen</span>
          <span>#{useCase.sortOrder}</span>
        </div>
      }
      onOpen={() => onOpen(useCase)}
      onEdit={() => onOpen(useCase)}
    />
  );
}
