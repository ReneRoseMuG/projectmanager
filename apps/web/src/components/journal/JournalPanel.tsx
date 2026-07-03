import type { JournalContextRelation, JournalEntry, JournalObjectType, JournalOperation } from "@taskmanager/shared-types";
import { Activity, Clock3, GitCommitHorizontal, UserRound } from "lucide-react";
import { useObjectJournalEntries } from "../../hooks/useJournal";
import { formatHumanDateTime } from "../../utils/date";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Spinner } from "../ui/Spinner";

export const journalObjectLabels: Record<JournalObjectType, string> = {
  project: "Projekt",
  milestone: "Meilenstein",
  task: "Aufgabe",
  feature: "Feature",
  useCase: "Use Case",
  wikiPage: "Wiki-Seite",
  backlogItem: "Backlog-Eintrag",
  ticket: "Ticket",
  event: "Termin",
  dayPlan: "Persönliche Planung",
  tag: "Tag",
  note: "Notiz",
  attachment: "Datei",
  comment: "Kommentar"
};

export const journalOperationLabels: Record<JournalOperation, string> = {
  create: "Erstellt",
  update: "Geändert",
  delete: "Gelöscht",
  link: "Verknüpft",
  unlink: "Getrennt"
};

const relationLabels: Record<JournalContextRelation, string> = {
  self: "Objekt",
  owner: "Gehört zu",
  parent: "Übergeordnet",
  related: "Bezug"
};

function OperationPill({ operation }: { operation: JournalOperation }) {
  return <span className="inline-flex h-6 items-center rounded-md bg-steel-100 px-2 text-xs font-semibold text-steel-700">{journalOperationLabels[operation]}</span>;
}

function JournalContextList({ entry }: { entry: JournalEntry }) {
  const contexts = entry.contexts.filter((context) => context.relation !== "self");
  if (contexts.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {contexts.map((context) => (
        <span key={`${entry.id}-${context.id}`} className="inline-flex min-h-6 items-center rounded-md border border-line bg-white px-2 text-xs font-medium text-steel-600">
          {relationLabels[context.relation]}: {journalObjectLabels[context.objectType]} "{context.objectLabel}"
        </span>
      ))}
    </div>
  );
}

function JournalEntryRow({ entry }: { entry: JournalEntry }) {
  return (
    <article className="grid gap-3 border-b border-line bg-white px-4 py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <OperationPill operation={entry.operation} />
            <span className="text-xs font-semibold uppercase text-steel-400">{journalObjectLabels[entry.objectType]}</span>
          </div>
          <p className="text-sm font-semibold leading-6 text-ink">{entry.summary}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-steel-500">
          <span className="inline-flex items-center gap-1">
            <Clock3 size={13} />
            {formatHumanDateTime(entry.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1">
            <UserRound size={13} />
            {entry.actorName}
          </span>
        </div>
      </div>

      {entry.changes.length > 0 ? (
        <div className="grid gap-1.5">
          {entry.changes.map((change) => (
            <div key={change.id} className="flex flex-wrap items-center gap-2 text-xs text-steel-600">
              <GitCommitHorizontal size={13} className="text-steel-500" />
              <span className="font-semibold text-steel-700">{change.fieldLabel}</span>
              <span>{change.oldValueLabel ?? "leer"}</span>
              <span className="text-steel-400">→</span>
              <span>{change.newValueLabel ?? "leer"}</span>
            </div>
          ))}
        </div>
      ) : null}

      <JournalContextList entry={entry} />
    </article>
  );
}

interface JournalEntryListProps {
  entries: JournalEntry[];
  loading: boolean;
  error: string | null;
  onReload?: () => void;
}

export function JournalEntryList({ entries, loading, error, onReload }: JournalEntryListProps) {
  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-md border border-line bg-white">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-crimson/25 bg-crimson/5 p-4 text-sm text-crimson">
        <div className="mb-3 font-semibold">{error}</div>
        {onReload ? (
          <Button type="button" variant="secondary" onClick={onReload}>
            Erneut laden
          </Button>
        ) : null}
      </div>
    );
  }

  if (entries.length === 0) {
    return <EmptyState icon={<Activity size={22} />} title="Keine Journal-Einträge" tone="neutral" variant="tinted" />;
  }

  return (
    <div className="overflow-hidden rounded-md border border-line bg-white">
      {entries.map((entry) => (
        <JournalEntryRow key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

interface JournalPanelProps {
  objectType: JournalObjectType;
  objectId?: number | null;
}

export function JournalPanel({ objectType, objectId }: JournalPanelProps) {
  const journal = useObjectJournalEntries(objectType, objectId, { limit: 50 });

  if (!journal.canReadJournal || objectId === undefined || objectId === null) {
    return null;
  }

  return <JournalEntryList entries={journal.entries} loading={journal.loading} error={journal.error} onReload={() => void journal.reload()} />;
}
