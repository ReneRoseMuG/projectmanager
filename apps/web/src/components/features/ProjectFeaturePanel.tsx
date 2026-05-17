import type { Feature, FeatureStatus } from "@taskmanager/shared-types";
import { BookOpen, Columns3, Edit3, ListTodo, Plus } from "lucide-react";
import type { ViewMode } from "../../types";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Pill, type PillTone } from "../ui/Pill";

interface ProjectFeaturePanelProps {
  features: Feature[];
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
  onCreate: () => void;
  onOpen: (feature: Feature) => void;
}

interface FeatureColumn {
  value: FeatureStatus;
  label: string;
  wrapperClassName: string;
  bulletClassName: string;
}

const statusLabels: Record<FeatureStatus, string> = {
  draft: "Entwurf",
  active: "Aktiv",
  done: "Erledigt",
  archived: "Archiviert"
};

const statusTones: Record<FeatureStatus, PillTone> = {
  draft: "mustard",
  active: "fern",
  done: "violet",
  archived: "steel"
};

const columns: FeatureColumn[] = [
  {
    value: "draft",
    label: "Entwurf",
    wrapperClassName: "border-mustard/30 bg-gradient-to-b from-mustard/10 to-mustard/[0.02]",
    bulletClassName: "bg-mustard"
  },
  {
    value: "active",
    label: "Aktiv",
    wrapperClassName: "border-fern/25 bg-gradient-to-b from-fern/10 to-fern/[0.02]",
    bulletClassName: "bg-fern"
  },
  {
    value: "done",
    label: "Erledigt",
    wrapperClassName: "border-violet/30 bg-gradient-to-b from-violet/10 to-violet/[0.02]",
    bulletClassName: "bg-violet"
  },
  {
    value: "archived",
    label: "Archiviert",
    wrapperClassName: "border-steel-300 bg-gradient-to-b from-steel-100 to-steel-50/30",
    bulletClassName: "bg-steel-500"
  }
];

function sortFeatures(features: Feature[]) {
  return [...features].sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title));
}

/** Read-only project feature surface. Relations are edited from the feature context. */
export function ProjectFeaturePanel({ features, viewMode, onViewModeChange, onCreate, onOpen }: ProjectFeaturePanelProps) {
  const sortedFeatures = sortFeatures(features);
  const visibleColumns = columns.filter((column) => column.value !== "archived" || sortedFeatures.some((feature) => feature.status === "archived"));

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-sm">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink">Features · {features.length}</h2>
          <p className="text-xs font-semibold text-slate-500">Projektverknüpfungen werden im Feature-Kontext gepflegt.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-line bg-white p-1">
            <Button className="h-8 px-2" icon={<Columns3 size={16} />} variant={viewMode === "kanban" ? "primary" : "ghost"} onClick={() => onViewModeChange("kanban")}>
              Board
            </Button>
            <Button className="h-8 px-2" icon={<ListTodo size={16} />} variant={viewMode === "list" ? "primary" : "ghost"} onClick={() => onViewModeChange("list")}>
              Liste
            </Button>
          </div>
          <Button variant="primary" icon={<Plus size={16} />} onClick={onCreate}>
            Neues Feature
          </Button>
        </div>
      </div>

      {features.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={22} />}
          title="Keine Features verknüpft"
          body="Öffne ein Feature und füge dieses Projekt im Tab Projekte hinzu."
          tone="violet"
          variant="tinted"
          actions={[{ label: "Neues Feature", onClick: onCreate, primary: true, icon: <Plus size={17} /> }]}
        />
      ) : null}

      {features.length > 0 && viewMode === "kanban" ? (
        <div className={`grid gap-4 ${visibleColumns.length === 4 ? "xl:grid-cols-4" : "lg:grid-cols-3"}`}>
          {visibleColumns.map((column) => {
            const columnFeatures = sortedFeatures.filter((feature) => feature.status === column.value);

            return (
              <section key={column.value} className={`grid min-h-80 min-w-0 content-start gap-3 rounded-xl border p-4 ${column.wrapperClassName}`}>
                <header className="flex min-w-0 items-center justify-between gap-3 px-1 pb-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${column.bulletClassName}`} />
                    <h3 className="truncate text-xs font-bold uppercase tracking-wide text-ink">{column.label}</h3>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-ink shadow-sm">{columnFeatures.length}</span>
                </header>

                {columnFeatures.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line bg-white/70 p-4 text-center text-sm text-slate-500">Keine Einträge</p>
                ) : null}

                {columnFeatures.map((feature) => (
                  <FeatureBoardCard key={feature.id} feature={feature} onOpen={onOpen} />
                ))}
              </section>
            );
          })}
        </div>
      ) : null}

      {features.length > 0 && viewMode === "list" ? <FeatureTable features={sortedFeatures} onOpen={onOpen} /> : null}
    </section>
  );
}

function FeatureBoardCard({ feature, onOpen }: { feature: Feature; onOpen: (feature: Feature) => void }) {
  return (
    <article
      className="grid min-w-0 max-w-full cursor-pointer gap-3 overflow-hidden rounded-xl border border-line bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-steel-300 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-steel-600/10"
      tabIndex={0}
      onDoubleClick={() => onOpen(feature)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onOpen(feature);
        }
      }}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="line-clamp-2 text-sm font-bold text-ink">{feature.title}</h4>
          <p className="mt-1 truncate font-mono text-[11px] text-slate-500">/features/{feature.slug}</p>
        </div>
        <span className="shrink-0">
          <Pill tone={statusTones[feature.status]}>{statusLabels[feature.status]}</Pill>
        </span>
      </div>
      <p className="line-clamp-3 min-w-0 text-sm text-slate-600">{feature.description || "Keine Kurzbeschreibung"}</p>
      <footer className="flex min-w-0 items-center justify-between gap-3 border-t border-dashed border-line pt-3 text-xs font-semibold text-slate-500">
        <span className="min-w-0 truncate">{feature.useCaseCount} Use Cases</span>
        <Button
          aria-label="Bearbeiten"
          title="Bearbeiten"
          className="h-8 w-8 shrink-0"
          icon={<Edit3 size={15} />}
          variant="ghost"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(feature);
          }}
        />
      </footer>
    </article>
  );
}

function FeatureTable({ features, onOpen }: { features: Feature[]; onOpen: (feature: Feature) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b border-line bg-steel-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Titel</th>
              <th className="px-4 py-3">Slug</th>
              <th className="w-32 px-4 py-3">Status</th>
              <th className="w-28 px-4 py-3 text-right">Use Cases</th>
              <th className="w-32 px-4 py-3 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => (
              <tr
                key={feature.id}
                className="cursor-pointer border-t border-line transition hover:bg-steel-50 focus:outline-none focus:ring-4 focus:ring-steel-600/10"
                tabIndex={0}
                onDoubleClick={() => onOpen(feature)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onOpen(feature);
                  }
                }}
              >
                <td className="px-4 py-3 text-sm font-semibold text-ink">{feature.title}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">/features/{feature.slug}</td>
                <td className="px-4 py-3">
                  <Pill tone={statusTones[feature.status]}>{statusLabels[feature.status]}</Pill>
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-slate-600">{feature.useCaseCount}</td>
                <td className="px-4 py-3 text-right">
                  <Button aria-label="Bearbeiten" title="Bearbeiten" className="h-8 w-8" icon={<Edit3 size={15} />} variant="ghost" onClick={() => onOpen(feature)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
