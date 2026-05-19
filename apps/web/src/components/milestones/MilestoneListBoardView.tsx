import { PROJECT_STATUSES, type Milestone } from "@taskmanager/shared-types";
import { Flag } from "lucide-react";
import { useMemo, useState } from "react";
import { milestoneStatusLabels } from "../../utils/domainLabels";
import { richTextToPlainText } from "../../utils/richText";
import { EmptyState } from "../ui/EmptyState";
import { ListBoardView, type ListBoardMode } from "../ui/ListBoardView";
import { MilestoneCard } from "./MilestoneCard";

interface MilestoneListBoardViewProps {
  milestones: Milestone[];
  loading?: boolean;
  onCreate: () => void;
  onEdit: (milestone: Milestone) => void;
  onDelete: (milestone: Milestone) => void;
}

const statusColumns = PROJECT_STATUSES.map((status) => ({ value: status, label: milestoneStatusLabels[status] }));

function matchesSearch(milestone: Milestone, searchValue: string) {
  const normalized = searchValue.trim().toLocaleLowerCase("de-DE");
  if (!normalized) {
    return true;
  }

  const values = [milestone.name, richTextToPlainText(milestone.description), milestone.status, ...milestone.tags.map((tag) => tag.name)];
  return values.some((value) => value.toLocaleLowerCase("de-DE").includes(normalized));
}

export function MilestoneListBoardView({ milestones, loading = false, onCreate, onEdit, onDelete }: MilestoneListBoardViewProps) {
  const [mode, setMode] = useState<ListBoardMode>("board");
  const [searchValue, setSearchValue] = useState("");
  const visibleMilestones = useMemo(() => milestones.filter((milestone) => matchesSearch(milestone, searchValue)), [milestones, searchValue]);

  return (
    <ListBoardView
      items={visibleMilestones}
      mode={mode}
      onModeChange={setMode}
      onAdd={onCreate}
      onAddToColumn={onCreate}
      addLabel="Neuer Meilenstein"
      statusKey="status"
      statusColumns={statusColumns}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      loading={loading}
      emptyState={<EmptyState icon={<Flag size={22} />} title="Keine Meilensteine" body="Lege Meilensteine an, um Projektziele und abhängige Arbeit zu bündeln." tone="teal" variant="tinted" />}
      renderCard={(milestone) => <MilestoneCard milestone={milestone} onEdit={onEdit} onDelete={onDelete} />}
      renderRow={(milestone) => <MilestoneCard milestone={milestone} variant="row" onEdit={onEdit} onDelete={onDelete} />}
    />
  );
}
