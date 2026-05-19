import type { Milestone } from "@taskmanager/shared-types";
import { Edit3, Flag, Trash2 } from "lucide-react";
import { milestoneStatusLabels, milestoneStatusTones } from "../../utils/domainLabels";
import { richTextToPlainText } from "../../utils/richText";
import { TagBadge } from "../tags/TagBadge";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ItemCard } from "../ui/ItemCard";
import { ItemRow } from "../ui/ItemRow";
import { Pill } from "../ui/Pill";

interface MilestoneCardProps {
  milestone: Milestone;
  variant?: "card" | "row";
  onEdit: (milestone: Milestone) => void;
  onDelete: (milestone: Milestone) => void;
}

export function MilestoneCard({ milestone, variant = "card", onEdit, onDelete }: MilestoneCardProps) {
  const accent = milestone.color ?? "var(--color-teal)";
  const description = richTextToPlainText(milestone.description);
  const openMilestone = () => onEdit(milestone);

  if (variant === "row") {
    return (
      <>
        <div className="md:hidden">
          <MilestoneCard milestone={milestone} onEdit={onEdit} onDelete={onDelete} />
        </div>
        <div className="hidden md:block">
          <ItemRow
            accentColor={accent}
            statusIndicator={<MilestoneAvatar milestone={milestone} />}
            title={milestone.name}
            description={description}
            pills={
              <>
                <Pill tone={milestoneStatusTones[milestone.status]}>{milestoneStatusLabels[milestone.status]}</Pill>
                {milestone.tags[0] ? <TagBadge tag={milestone.tags[0]} /> : null}
              </>
            }
            meta={<span className="text-xs font-semibold text-slate-500">{milestone.taskCount} Aufgaben</span>}
            actions={
              <>
                <Button aria-label="Bearbeiten" title="Bearbeiten" className="h-10 w-10" icon={<Edit3 size={18} />} variant="ghost" onClick={() => onEdit(milestone)} />
                <Button aria-label="Löschen" title="Löschen" className="h-10 w-10" icon={<Trash2 size={18} />} variant="ghost" onClick={() => onDelete(milestone)} />
              </>
            }
            onOpen={openMilestone}
          />
        </div>
      </>
    );
  }

  return (
    <ItemCard
      accentColor={accent}
      header={<MilestoneCardHeader milestone={milestone} />}
      body={description ? <p className="line-clamp-3 text-sm text-slate-600">{description}</p> : null}
      footer={<MilestoneCardFooter milestone={milestone} />}
      onOpen={openMilestone}
      onEdit={() => onEdit(milestone)}
      onDelete={() => onDelete(milestone)}
      className="min-h-56"
    />
  );
}

function MilestoneAvatar({ milestone }: { milestone: Milestone }) {
  const accent = milestone.color ?? "var(--color-teal)";
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm" style={{ backgroundColor: accent }}>
      <Flag size={20} />
    </span>
  );
}

function MilestoneCardHeader({ milestone }: { milestone: Milestone }) {
  return (
    <div className="grid gap-3">
      <div className="flex items-start gap-3">
        <MilestoneAvatar milestone={milestone} />
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-base font-semibold text-ink">{milestone.name}</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">{milestone.dueDate ? `Fällig ${milestone.dueDate}` : "Ohne Fälligkeit"}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={milestoneStatusTones[milestone.status]}>{milestoneStatusLabels[milestone.status]}</Pill>
        {milestone.tags.map((tag) => (
          <TagBadge key={tag.id} tag={tag} />
        ))}
      </div>
    </div>
  );
}

function MilestoneCardFooter({ milestone }: { milestone: Milestone }) {
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-3">
      <Badge tone="steel">{milestone.taskCount} Aufgaben</Badge>
      <Badge tone="violet">{milestone.ticketCount} Tickets</Badge>
      <Badge tone="teal">{milestone.featureCount} Features</Badge>
    </div>
  );
}
