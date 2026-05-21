import { Edit3, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { ActionMenu } from "./ActionMenu";
import { ItemCard } from "./ItemCard";
import { ItemRow } from "./ItemRow";
import { ProgressBar } from "./ProgressBar";

export interface PlanningTaskStats {
  openTasks: number;
  doneTasks: number;
  totalTasks: number;
}

interface PlanningItemCardProps {
  title: string;
  description: string;
  accentColor: string;
  icon: ReactNode;
  subtitle?: string;
  pills?: ReactNode;
  taskStats: PlanningTaskStats;
  variant?: "card" | "row";
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function progressValue(stats: PlanningTaskStats) {
  return stats.totalTasks > 0 ? Math.round((stats.doneTasks / stats.totalTasks) * 100) : 0;
}

function TaskProgress({ stats, accentColor }: { stats: PlanningTaskStats; accentColor: string }) {
  return (
    <div className="grid gap-2 border-t border-line pt-3">
      <div className="flex min-w-0 items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-ink">Aufgaben</span>
        <span className="min-w-0 truncate font-medium text-slate-500">{stats.totalTasks > 0 ? `${stats.doneTasks} / ${stats.totalTasks} erledigt` : "Keine Aufgaben"}</span>
      </div>
      <ProgressBar value={progressValue(stats)} color={accentColor} />
      <span className="justify-self-end text-xs font-semibold text-slate-500">{stats.openTasks} offen</span>
    </div>
  );
}

function TaskMeta({ stats }: { stats: PlanningTaskStats }) {
  return (
    <span className="grid justify-items-end gap-0.5 text-xs font-semibold text-slate-500">
      <span className="text-[11px] uppercase tracking-wide text-slate-400">Aufgaben</span>
      <span>{stats.openTasks} offen</span>
    </span>
  );
}

function PlanningHeader({ title, subtitle, pills }: Pick<PlanningItemCardProps, "title" | "subtitle" | "pills">) {
  return (
    <div className="grid min-w-0 gap-3">
      <div className="min-w-0">
        <h2 className="line-clamp-2 break-words text-base font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</p> : null}
      </div>
      {pills ? <div className="flex min-w-0 flex-wrap items-center gap-2">{pills}</div> : null}
    </div>
  );
}

export function PlanningItemCard({ title, description, accentColor, icon, subtitle, pills, taskStats, variant = "card", onOpen, onEdit, onDelete }: PlanningItemCardProps) {
  if (variant === "row") {
    return (
      <>
        <div className="md:hidden">
          <PlanningItemCard
            title={title}
            description={description}
            accentColor={accentColor}
            icon={icon}
            subtitle={subtitle}
            pills={pills}
            taskStats={taskStats}
            onOpen={onOpen}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
        <div className="hidden md:block">
          <ItemRow
            accentColor={accentColor}
            title={title}
            description={description}
            pills={pills}
            pillsClassName="max-w-64 flex-wrap justify-end"
            meta={<TaskMeta stats={taskStats} />}
            actions={
              <ActionMenu
                items={[
                  { label: "Bearbeiten", icon: <Edit3 size={16} />, onClick: onEdit },
                  { label: "Löschen", icon: <Trash2 size={16} />, onClick: onDelete, danger: true }
                ]}
              />
            }
            onOpen={onOpen}
          />
        </div>
      </>
    );
  }

  return (
    <ItemCard
      accentColor={accentColor}
      header={<PlanningHeader title={title} subtitle={subtitle} pills={pills} />}
      body={description ? <p className="line-clamp-3 text-sm text-slate-600">{description}</p> : null}
      footer={<TaskProgress stats={taskStats} accentColor={accentColor} />}
      onOpen={onOpen}
      onEdit={onEdit}
      onDelete={onDelete}
      className="h-full min-h-60"
    />
  );
}
