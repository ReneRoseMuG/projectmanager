import type { WikiImportAction, WikiImportItemResult, WikiImportReport } from "@taskmanager/shared-types";
import { Eye, Play, RefreshCw } from "lucide-react";
import { Button } from "../ui/Button";

interface WikiImportPanelProps {
  sourcePath: string;
  report: WikiImportReport | null;
  loading: boolean;
  error: string | null;
  onSourcePathChange: (sourcePath: string) => void;
  onPreview: () => void;
  onRun: () => void;
}

const actionLabels: Record<WikiImportAction, string> = {
  created: "Neu",
  updated: "Aktualisiert",
  skipped: "Unverändert",
  warning: "Warnung",
  error: "Fehler"
};

const actionClasses: Record<WikiImportAction, string> = {
  created: "bg-fern/10 text-fern",
  updated: "bg-violet/10 text-violet",
  skipped: "bg-slate-100 text-slate-600",
  warning: "bg-mustard/15 text-mustard",
  error: "bg-crimson/10 text-crimson"
};

export function WikiImportPanel({ sourcePath, report, loading, error, onSourcePathChange, onPreview, onRun }: WikiImportPanelProps) {
  const canRun = report !== null && report.summary.errors === 0 && !loading;
  const visibleItems = report?.items.slice(0, 80) ?? [];

  return (
    <section className="grid gap-4 rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-[280px] flex-1 gap-1 text-sm font-medium text-ink">
          Wiki-Ordner
          <input
            className="h-10 rounded-md border border-line bg-white px-3 text-sm font-normal outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10"
            placeholder="C:\\...\\docs\\wiki"
            value={sourcePath}
            onChange={(event) => onSourcePathChange(event.target.value)}
          />
        </label>
        <Button icon={loading ? <RefreshCw className="animate-spin" size={16} /> : <Eye size={16} />} onClick={onPreview} disabled={loading || !sourcePath.trim()}>
          Vorschau
        </Button>
        <Button variant="primary" icon={<Play size={16} />} onClick={onRun} disabled={!canRun}>
          Importieren
        </Button>
      </div>

      {error ? <div className="rounded-md border border-crimson/20 bg-crimson/5 px-3 py-2 text-sm text-crimson">{error}</div> : null}

      {report ? (
        <>
          <div className="grid gap-2 sm:grid-cols-5">
            <SummaryTile label="Neu" value={report.summary.created} />
            <SummaryTile label="Aktualisiert" value={report.summary.updated} />
            <SummaryTile label="Unverändert" value={report.summary.skipped} />
            <SummaryTile label="Warnungen" value={report.summary.warnings} />
            <SummaryTile label="Fehler" value={report.summary.errors} />
          </div>

          <div className="overflow-hidden rounded-lg border border-line">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Typ</th>
                  <th className="px-3 py-2 font-semibold">Titel</th>
                  <th className="px-3 py-2 font-semibold">Quelle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visibleItems.map((item, index) => (
                  <ImportRow key={`${item.type}-${item.slug ?? item.importKey ?? item.title}-${index}`} item={item} />
                ))}
              </tbody>
            </table>
          </div>
          {report.items.length > visibleItems.length ? <div className="text-sm text-slate-600">{report.items.length - visibleItems.length} weitere Einträge</div> : null}
        </>
      ) : null}
    </section>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 px-3 py-2">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="text-xl font-semibold text-ink">{value}</div>
    </div>
  );
}

function ImportRow({ item }: { item: WikiImportItemResult }) {
  return (
    <tr className="align-top">
      <td className="px-3 py-2">
        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${actionClasses[item.action]}`}>{actionLabels[item.action]}</span>
      </td>
      <td className="px-3 py-2 font-mono text-xs text-slate-500">{item.type}</td>
      <td className="px-3 py-2">
        <div className="font-medium text-ink">{item.title}</div>
        {item.message ? <div className="mt-1 text-xs text-slate-500">{item.message}</div> : null}
      </td>
      <td className="max-w-[360px] truncate px-3 py-2 text-xs text-slate-500">{item.sourcePath ?? item.slug ?? item.importKey ?? ""}</td>
    </tr>
  );
}
