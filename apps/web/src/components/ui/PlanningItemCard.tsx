import { Edit3, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";
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

function PlanningAvatar({ accentColor, icon }: { accentColor: string; icon: ReactNode }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm" style={{ backgroundColor: accentColor }} aria-hidden="true">
      {icon}
    </span>
  );
}

function PlanningHeader({ title, subtitle, accentColor, icon, pills }: Pick<PlanningItemCardProps, "title" | "subtitle" | "accentColor" | "icon" | "pills">) {
  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <PlanningAvatar accentColor={accentColor} icon={icon} />
        <div className="min-w-0">
          <h2 className="line-clamp-2 break-words text-base font-semibold text-ink">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</p> : null}
        </div>
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
            statusIndicator={<PlanningAvatar accentColor={accentColor} icon={icon} />}
            title={title}
            description={description}
            pills={pills}
            pillsClassName="max-w-64 flex-wrap justify-end"
            meta={<TaskMeta stats={taskStats} />}
            actions={
              <>
                <Button aria-label="Bearbeiten" title="Bearbeiten" className="h-10 w-10" icon={<Edit3 size={18} />} variant="ghost" onClick={onEdit} />
                <Button aria-label="Löschen" title="Löschen" className="h-10 w-10" icon={<Trash2 size={18} />} variant="ghost" onClick={onDelete} />
              </>
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
      header={<PlanningHeader title={title} subtitle={subtitle} accentColor={accentColor} icon={icon} pills={pills} />}
      body={description ? <p className="line-clamp-3 text-sm text-slate-600">{description}</p> : null}
      footer={<TaskProgress stats={taskStats} accentColor={accentColor} />}
      onOpen={onOpen}
      onEdit={onEdit}
      onDelete={onDelete}
      className="h-full min-h-60"
    />
  );
}
