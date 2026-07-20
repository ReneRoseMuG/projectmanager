import type { AttachmentOwner, DocumentDuplicateCheck as DuplicateCheck } from "@taskmanager/shared-types";
import { AlertTriangle, CheckCircle2, Files, ScanSearch } from "lucide-react";
import { useState } from "react";
import { useDocumentDuplicateCheck } from "../../hooks/useDocuments";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { useToast } from "../ui/ToastProvider";

const ownerLabels: Record<AttachmentOwner["type"], string> = {
  project: "Projekt",
  milestone: "Meilenstein",
  task: "Aufgabe",
  feature: "Feature",
  wikiPage: "Wiki-Seite",
  ticket: "Ticket"
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return "–";
  }
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resultSummary(check: DuplicateCheck): string {
  const duplicateCount = check.groups.reduce((sum, group) => sum + group.documents.length, 0);
  if (check.groups.length === 0) {
    return "Keine Dateiduplikate gefunden.";
  }
  return `${check.groups.length} Duplikatgruppen mit ${duplicateCount} Dokumenten gefunden.`;
}

export function DocumentDuplicateCheck() {
  const [open, setOpen] = useState(false);
  const { check, loading, starting, error, startCheck } = useDocumentDuplicateCheck();
  const { showToast } = useToast();
  const running = check?.status === "running";
  const progress = check && check.total > 0 ? Math.min(100, Math.round((check.processed / check.total) * 100)) : 0;

  const start = async () => {
    setOpen(true);
    try {
      await startCheck();
    } catch {
      showToast({ title: "Die Duplikatprüfung konnte nicht gestartet werden.", tone: "error" });
    }
  };

  const openOrStart = () => {
    if (running) {
      setOpen(true);
      return;
    }
    void start();
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        icon={<ScanSearch size={16} />}
        loading={starting}
        disabled={loading}
        onClick={openOrStart}
      >
        {running ? "Prüfung läuft" : "Duplikate prüfen"}
      </Button>

      <Modal open={open} title="Duplikate prüfen" size="xl" onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-5">
          {error ? (
            <div className="rounded-lg border border-crimson/20 bg-crimson/10 p-3 text-sm text-crimson">{error}</div>
          ) : null}

          {check?.status === "running" ? (
            <section className="flex flex-col gap-3" aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-sm text-steel-600">
                <span>Bibliothek wird inhaltsbasiert geprüft…</span>
                <span className="tabular-nums">{check.processed} / {check.total}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-steel-100">
                <div className="h-full rounded-full bg-fern transition-[width]" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-steel-500">Gestartet: {formatDateTime(check.startedAt)}</p>
            </section>
          ) : null}

          {check?.status === "failed" ? (
            <div className="flex items-start gap-3 rounded-lg border border-crimson/20 bg-crimson/10 p-4 text-sm text-crimson">
              <AlertTriangle className="mt-0.5 shrink-0" size={18} />
              <span>{check.error ?? "Die Duplikatprüfung ist fehlgeschlagen."}</span>
            </div>
          ) : null}

          {check?.status === "completed" ? (
            <>
              <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-shell p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-fern" size={20} />
                  <div>
                    <p className="font-medium text-ink">{resultSummary(check)}</p>
                    <p className="mt-1 text-xs text-steel-500">
                      {check.processed} Dokumente geprüft · abgeschlossen am {formatDateTime(check.completedAt)}
                    </p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" icon={<ScanSearch size={16} />} onClick={() => void start()}>
                  Erneut prüfen
                </Button>
              </section>

              {check.groups.length > 0 ? (
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-ink">Duplikatgruppen</h3>
                  {check.groups.map((group, groupIndex) => (
                    <div key={group.hash} className="overflow-hidden rounded-lg border border-line">
                      <div className="flex items-center gap-2 border-b border-line bg-shell px-4 py-2 text-sm font-medium text-ink">
                        <Files size={16} />
                        Gruppe {groupIndex + 1} · {group.documents.length} Dokumente
                      </div>
                      <div className="divide-y divide-line">
                        {group.documents.map((document) => (
                          <div key={document.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[minmax(0,1fr)_auto]">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-ink">{document.displayName ?? document.originalName}</p>
                              <p className="mt-1 text-xs text-steel-500">
                                ID {document.id} · {formatBytes(document.size)} · {formatDateTime(document.createdAt)}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-1 md:justify-end">
                              <Badge muted>{document.folder?.name ?? "Nicht einsortiert"}</Badge>
                              {document.owners.length === 0 ? (
                                <Badge muted>Ohne Verknüpfung</Badge>
                              ) : document.owners.map((owner) => (
                                <Badge key={`${owner.type}-${owner.id}`} tone="steel">
                                  {ownerLabels[owner.type]} {owner.id}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              ) : null}

              {check.issues.length > 0 ? (
                <section className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-ink">Prüfprobleme</h3>
                  <div className="overflow-hidden rounded-lg border border-mustard/25">
                    {check.issues.map((issue) => (
                      <div key={issue.attachmentId} className="flex items-start gap-3 border-b border-mustard/15 bg-mustard/10 px-4 py-3 text-sm last:border-b-0">
                        <AlertTriangle className="mt-0.5 shrink-0 text-mustard-dark" size={16} />
                        <div>
                          <p className="font-medium text-ink">{issue.originalName} · ID {issue.attachmentId}</p>
                          <p className="mt-0.5 text-xs text-steel-600">{issue.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
