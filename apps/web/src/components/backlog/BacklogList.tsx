import type { BacklogItem, BacklogStatus, Feature } from "@taskmanager/shared-types";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

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
              className={`h-9 rounded-md px-3 text-sm font-medium ${statusFilter === status ? "bg-ink text-white" : "border border-line bg-white hover:border-teal"}`}
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
        <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-sm text-slate-600">Keine Backlog-Items</div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <article key={item.id} className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.description || "Keine Beschreibung"}</p>
                </div>
                <div className="flex gap-1">
                  <Button aria-label="Bearbeiten" title="Bearbeiten" icon={<Edit3 size={16} />} variant="ghost" onClick={() => onEdit(item)} />
                  <Button aria-label="Löschen" title="Löschen" icon={<Trash2 size={16} />} variant="ghost" onClick={() => onDelete(item)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge muted>{statusLabels[item.status]}</Badge>
                <Badge muted>{priorityLabels[item.priority]}</Badge>
                {item.featureId ? <Badge muted>{featureNames.get(item.featureId) ?? `Feature ${item.featureId}`}</Badge> : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
