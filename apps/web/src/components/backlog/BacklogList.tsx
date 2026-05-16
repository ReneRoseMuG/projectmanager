import type { BacklogItem, BacklogStatus, Feature } from "@taskmanager/shared-types";
import { Edit3, Inbox, Plus, Trash2 } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Pill, type PillTone } from "../ui/Pill";

interface BacklogListProps {
  items: BacklogItem[];
  features: Feature[];
  statusFilter: BacklogStatus | "all";
  onStatusFilterChange: (status: BacklogStatus | "all") => void;
  onCreate: () => void;
  onEdit: (item: BacklogItem) => void;
  onDelete: (item: BacklogItem) => void;
}

const statusLabels: Record<BacklogStatus, string> = {
  open: "Offen",
  in_progress: "In Arbeit",
  done: "Erledigt",
  rejected: "Verworfen"
};

const priorityLabels: Record<BacklogItem["priority"], string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  urgent: "Dringend"
};

const statusTone: Record<BacklogStatus, PillTone> = {
  open: "steel",
  in_progress: "tangerine",
  done: "fern",
  rejected: "crimson"
};

const priorityTone = {
  low: "steel",
  medium: "mustard",
  high: "tangerine",
  urgent: "crimson"
} as const;

export function BacklogList({ items, features, statusFilter, onStatusFilterChange, onCreate, onEdit, onDelete }: BacklogListProps) {
  const featureNames = new Map(features.map((feature) => [feature.id, feature.title]));

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "open", "in_progress", "done", "rejected"] as const).map((status) => (
            <button
              key={status}
              type="button"
              className={`h-8 rounded-full border-[1.5px] px-3.5 text-[13px] font-semibold transition ${
                statusFilter === status ? "border-steel-700 bg-steel-700 text-white" : "border-line bg-white text-slate-500 hover:border-steel-500 hover:text-ink"
              }`}
              onClick={() => onStatusFilterChange(status)}
            >
              {status === "all" ? "Alle" : statusLabels[status]}
            </button>
          ))}
        </div>
        <Button variant="primary" icon={<Plus size={17} />} onClick={onCreate}>
          Neues Item
        </Button>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<Inbox size={22} />} title="Keine Backlog-Items" body="Sammle Ideen und spätere Aufgaben hier, bevor sie umgesetzt werden." tone="tangerine" variant="tinted" actions={[{ label: "Backlog-Item", onClick: onCreate, primary: true, icon: <Plus size={16} /> }]} />
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <article
              key={item.id}
              className={`grid gap-2.5 rounded-xl border border-line bg-white p-4 shadow-sm transition hover:border-steel-300 hover:shadow-md ${item.status === "rejected" ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className={`text-[15px] font-semibold ${item.status === "rejected" ? "text-slate-500 line-through" : "text-ink"}`}>{item.title}</h3>
                  <p className="text-[13px] text-slate-500">{item.description || "Keine Beschreibung"}</p>
                </div>
                <div className="flex gap-1">
                  <Button aria-label="Bearbeiten" title="Bearbeiten" className="h-8 w-8" icon={<Edit3 size={15} />} variant="ghost" onClick={() => onEdit(item)} />
                  <Button aria-label="Löschen" title="Löschen" className="h-8 w-8" icon={<Trash2 size={15} />} variant="ghost" onClick={() => onDelete(item)} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Pill tone={statusTone[item.status]}>{statusLabels[item.status]}</Pill>
                <Badge tone={priorityTone[item.priority]}>
                  <span className="uppercase">{priorityLabels[item.priority]}</span>
                </Badge>
                {item.featureId ? <Badge tone="teal">Feature: {featureNames.get(item.featureId) ?? item.featureId}</Badge> : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
