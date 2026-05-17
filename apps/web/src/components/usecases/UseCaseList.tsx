import type { FeatureStatus, UseCase } from "@taskmanager/shared-types";
import { Columns3, ListTodo, Plus } from "lucide-react";
import type { ViewMode } from "../../types";
import { Button } from "../ui/Button";
import { Pill, type PillTone } from "../ui/Pill";

interface UseCaseListProps {
  useCases: UseCase[];
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
  onCreate: () => void;
  onOpen: (useCase: UseCase) => void;
}

interface UseCaseColumn {
  value: FeatureStatus;
  label: string;
  wrapperClassName: string;
  bulletClassName: string;
}

const statusLabels: Record<UseCase["status"], string> = {
  draft: "Entwurf",
  active: "Aktiv",
  done: "Erledigt",
  archived: "Archiviert"
};

const statusTones: Record<UseCase["status"], PillTone> = {
  draft: "mustard",
  active: "fern",
  done: "violet",
  archived: "steel"
};

const columns: UseCaseColumn[] = [
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

const badgeClassNames: Record<UseCase["status"], string> = {
  draft: "bg-mustard text-white",
  active: "bg-fern text-white",
  done: "bg-violet text-white",
  archived: "bg-steel-500 text-white"
};

function sortUseCases(useCases: UseCase[]) {
  return [...useCases].sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title));
}

export function UseCaseList({ useCases, viewMode, onViewModeChange, onCreate, onOpen }: UseCaseListProps) {
  const sortedUseCases = sortUseCases(useCases);
  const visibleColumns = columns.filter((column) => column.value !== "archived" || sortedUseCases.some((useCase) => useCase.status === "archived"));

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink">Use Cases · {useCases.length}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-line bg-white p-1">
            <Button
              className="h-8 px-2"
              icon={<Columns3 size={16} />}
              variant={viewMode === "kanban" ? "primary" : "ghost"}
              onClick={() => onViewModeChange("kanban")}
            >
              Board
            </Button>
            <Button
              className="h-8 px-2"
              icon={<ListTodo size={16} />}
              variant={viewMode === "list" ? "primary" : "ghost"}
              onClick={() => onViewModeChange("list")}
            >
              Liste
            </Button>
          </div>
          <Button variant="primary" icon={<Plus size={16} />} onClick={onCreate}>
            Neu
          </Button>
        </div>
      </div>

      {useCases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-sm text-slate-500">Keine Use Cases</div>
      ) : null}

      {useCases.length > 0 && viewMode === "kanban" ? (
        <div className={`grid gap-4 ${visibleColumns.length === 4 ? "xl:grid-cols-4" : "lg:grid-cols-3"}`}>
          {visibleColumns.map((column) => {
            const columnUseCases = sortedUseCases.filter((useCase) => useCase.status === column.value);

            return (
              <section key={column.value} className={`grid min-h-80 content-start gap-3 rounded-xl border p-4 ${column.wrapperClassName}`}>
                <header className="flex items-center justify-between gap-3 px-1 pb-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${column.bulletClassName}`} />
                    <h3 className="text-xs font-bold uppercase tracking-wide text-ink">{column.label}</h3>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-ink shadow-sm">{columnUseCases.length}</span>
                </header>

                {columnUseCases.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line bg-white/70 p-4 text-center text-sm text-slate-500">Keine Einträge</p>
                ) : null}

                {columnUseCases.map((useCase) => (
                  <UseCaseCard key={useCase.id} useCase={useCase} onOpen={onOpen} />
                ))}
              </section>
            );
          })}
        </div>
      ) : null}

      {useCases.length > 0 && viewMode === "list" ? <UseCaseTable useCases={sortedUseCases} onOpen={onOpen} /> : null}
    </section>
  );
}

function UseCaseCard({ useCase, onOpen }: { useCase: UseCase; onOpen: (useCase: UseCase) => void }) {
  return (
    <article
      className="grid cursor-pointer gap-2 rounded-xl border border-line bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-steel-300 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-steel-600/10"
      tabIndex={0}
      onDoubleClick={() => onOpen(useCase)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onOpen(useCase);
        }
      }}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className={`flex h-7 w-10 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold ${badgeClassNames[useCase.status]}`}>
          UC{useCase.sortOrder}
        </span>
        <span className="min-w-0 text-sm font-semibold leading-5 text-ink">{useCase.title}</span>
      </span>
      <span className="truncate font-mono text-[11px] text-slate-500">/uc/{useCase.slug}</span>
      <span className="flex items-center justify-between gap-3 border-t border-dashed border-line pt-2 text-[11px] font-semibold text-slate-500">
        <span>Doppelklick zum Öffnen</span>
        <span>#{useCase.sortOrder}</span>
      </span>
    </article>
  );
}

function UseCaseTable({ useCases, onOpen }: { useCases: UseCase[]; onOpen: (useCase: UseCase) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-line bg-steel-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="w-20 px-4 py-3">#</th>
              <th className="px-4 py-3">Titel</th>
              <th className="px-4 py-3">Slug</th>
              <th className="w-32 px-4 py-3">Status</th>
              <th className="w-28 px-4 py-3 text-right">Sortierung</th>
            </tr>
          </thead>
          <tbody>
            {useCases.map((useCase) => (
              <tr
                key={useCase.id}
                className="cursor-pointer border-t border-line transition hover:bg-steel-50 focus:outline-none focus:ring-4 focus:ring-steel-600/10"
                tabIndex={0}
                onDoubleClick={() => onOpen(useCase)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onOpen(useCase);
                  }
                }}
              >
                <td className="px-4 py-3">
                  <span className={`flex h-7 w-10 items-center justify-center rounded-lg text-[11px] font-extrabold ${badgeClassNames[useCase.status]}`}>
                    UC{useCase.sortOrder}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-ink">{useCase.title}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">/uc/{useCase.slug}</td>
                <td className="px-4 py-3">
                  <Pill tone={statusTones[useCase.status]}>{statusLabels[useCase.status]}</Pill>
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-slate-600">{useCase.sortOrder}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
