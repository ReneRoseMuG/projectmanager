import type { CatalogEntry, CatalogKind } from "@taskmanager/shared-types";
import { Check, ListChecks, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { errorMessage } from "../../hooks/errors";
import { useCatalogs } from "../../hooks/useCatalogs";
import { useHasPermission } from "../../hooks/usePermissions";
import { defaultCatalogColor } from "../../utils/catalogs";
import { Button } from "../ui/Button";
import { ColorPicker } from "../ui/ColorPicker";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { FormField } from "../ui/FormField";
import { Input } from "../ui/Input";
import { Section } from "../ui/Section";
import { useToast } from "../ui/ToastProvider";

const groups: Array<{ kind: CatalogKind; title: string; createLabel: string }> =
  [
    {
      kind: "workStatus",
      title: "Status: Projekte, Meilensteine, Aufgaben, Backlog, Tickets",
      createLabel: "Neuer Arbeitsstatus",
    },
    {
      kind: "featureStatus",
      title: "Status: Features und Use Cases",
      createLabel: "Neuer Feature-Status",
    },
    {
      kind: "priority",
      title: "Prioritäten: Aufgaben und Tickets",
      createLabel: "Neue Priorität",
    },
    {
      kind: "ticketType",
      title: "Ticket-Typen",
      createLabel: "Neuer Ticket-Typ",
    },
  ];

interface CatalogGroupProps {
  kind: CatalogKind;
  title: string;
  createLabel: string;
  entries: CatalogEntry[];
  canWrite: boolean;
  canDelete: boolean;
  onCreate: (
    kind: CatalogKind,
    input: {
      key: string;
      label: string;
      sortOrder?: number;
      isClosed?: boolean;
      color?: string;
    },
  ) => Promise<void>;
  onUpdate: (
    kind: CatalogKind,
    entry: CatalogEntry,
    input: { label: string; sortOrder: number; isClosed: boolean; color: string },
  ) => Promise<void>;
  onDelete: (kind: CatalogKind, entry: CatalogEntry) => Promise<void>;
}

function CatalogGroup({
  kind,
  title,
  createLabel,
  entries,
  canWrite,
  canDelete,
  onCreate,
  onUpdate,
  onDelete,
}: CatalogGroupProps) {
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [isClosed, setIsClosed] = useState(false);
  const [color, setColor] = useState(defaultCatalogColor(kind, ""));
  const canMarkClosed = kind === "workStatus" || kind === "featureStatus";
  const trimmedKey = key.trim();
  const trimmedLabel = label.trim();

  const submit = async () => {
    if (!trimmedKey || !trimmedLabel) {
      return;
    }
    await onCreate(kind, {
      key: trimmedKey,
      label: trimmedLabel,
      sortOrder: sortOrder === "" ? undefined : Number(sortOrder),
      isClosed: canMarkClosed ? isClosed : false,
      color,
    });
    setKey("");
    setLabel("");
    setSortOrder("");
    setIsClosed(false);
    setColor(defaultCatalogColor(kind, ""));
  };

  return (
    <Section title={title}>
      <div className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-[minmax(8rem,0.7fr)_minmax(10rem,1fr)_8rem_minmax(13rem,1fr)_auto_auto] md:items-end">
          <FormField label="Schlüssel" required>
            <Input
              value={key}
              placeholder="z_b_status"
              onChange={(event) => setKey(event.target.value)}
            />
          </FormField>
          <FormField label="Label" required>
            <Input
              value={label}
              placeholder={createLabel}
              onChange={(event) => setLabel(event.target.value)}
            />
          </FormField>
          <FormField label="Sortierung">
            <Input
              type="number"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />
          </FormField>
          <FormField label="Farbe">
            <ColorPicker value={color} onChange={setColor} />
          </FormField>
          {canMarkClosed ? (
            <label className="flex h-11 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={isClosed}
                onChange={(event) => setIsClosed(event.target.checked)}
              />
              Geschlossen
            </label>
          ) : (
            <span />
          )}
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            disabled={!canWrite || !trimmedKey || !trimmedLabel}
            onClick={() => void submit()}
          >
            Anlegen
          </Button>
        </div>

        <div className="hidden grid-cols-[minmax(8rem,0.7fr)_minmax(10rem,1fr)_8rem_minmax(13rem,1fr)_8rem_auto] gap-3 border-b border-line pb-2 text-xs font-bold uppercase text-slate-500 md:grid">
          <span>Schlüssel</span>
          <span>Label</span>
          <span>Sortierung</span>
          <span>Farbe</span>
          <span>Status</span>
          <span className="text-right">Aktionen</span>
        </div>
        {entries.map((entry) => (
          <CatalogRow
            key={entry.id}
            entry={entry}
            canMarkClosed={canMarkClosed}
            canWrite={canWrite}
            canDelete={canDelete}
            onUpdate={(input) => onUpdate(kind, entry, input)}
            onDelete={() => onDelete(kind, entry)}
          />
        ))}
      </div>
    </Section>
  );
}

function CatalogRow({
  entry,
  canMarkClosed,
  canWrite,
  canDelete,
  onUpdate,
  onDelete,
}: {
  entry: CatalogEntry;
  canMarkClosed: boolean;
  canWrite: boolean;
  canDelete: boolean;
  onUpdate: (input: {
    label: string;
    sortOrder: number;
    isClosed: boolean;
    color: string;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(entry.label);
  const [sortOrder, setSortOrder] = useState(String(entry.sortOrder));
  const [isClosed, setIsClosed] = useState(entry.isClosed);
  const [color, setColor] = useState(entry.color);

  const cancel = () => {
    setLabel(entry.label);
    setSortOrder(String(entry.sortOrder));
    setIsClosed(entry.isClosed);
    setColor(entry.color);
    setEditing(false);
  };

  const save = async () => {
    await onUpdate({ label, sortOrder: Number(sortOrder), isClosed, color });
    setEditing(false);
  };

  return (
    <div className="grid gap-3 border-b border-line py-3 text-sm md:grid-cols-[minmax(8rem,0.7fr)_minmax(10rem,1fr)_8rem_minmax(13rem,1fr)_8rem_auto] md:items-center">
      <span className="truncate font-mono text-xs font-semibold text-slate-500">
        {entry.key}
      </span>
      {editing ? (
        <Input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      ) : (
        <span className="min-w-0 truncate font-semibold text-ink">
          {entry.label}
        </span>
      )}
      {editing ? (
        <Input
          type="number"
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
        />
      ) : (
        <span className="text-slate-600">{entry.sortOrder}</span>
      )}
      {editing ? (
        <ColorPicker value={color} onChange={setColor} />
      ) : (
        <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="h-6 w-6 shrink-0 rounded-full border border-white shadow-sm" style={{ backgroundColor: entry.color }} />
          <span className="truncate">{entry.color}</span>
        </span>
      )}
      {canMarkClosed ? (
        editing ? (
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={isClosed}
              onChange={(event) => setIsClosed(event.target.checked)}
            />
            Ja
          </label>
        ) : (
          <span
            className={`rounded-full px-2 py-1 text-center text-xs font-semibold ${entry.isClosed ? "bg-steel-700 text-white" : "bg-fern/10 text-fern"}`}
          >
            {entry.isClosed ? "Geschlossen" : "Offen"}
          </span>
        )
      ) : (
        <span className="text-xs font-semibold text-slate-400">-</span>
      )}
      <div className="flex justify-end gap-1">
        {editing ? (
          <>
            <Button
              aria-label="Speichern"
              title="Speichern"
              icon={<Check size={18} />}
              className="h-10 w-10"
              onClick={() => void save()}
            />
            <Button
              aria-label="Abbrechen"
              title="Abbrechen"
              icon={<X size={18} />}
              variant="ghost"
              className="h-10 w-10"
              onClick={cancel}
            />
          </>
        ) : (
          <>
            {canWrite ? (
            <Button
              aria-label="Bearbeiten"
              title="Bearbeiten"
              icon={<Pencil size={18} />}
              variant="ghost"
              className="h-10 w-10"
              onClick={() => setEditing(true)}
            />
            ) : null}
            {canDelete ? (
            <Button
              aria-label="Löschen"
              title="Löschen"
              icon={<Trash2 size={18} />}
              variant="ghost"
              className="h-10 w-10 text-crimson hover:bg-crimson/10"
              onClick={() => void onDelete()}
            />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export function CatalogManager() {
  const catalogs = useCatalogs();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canWrite = useHasPermission("catalogs", "write");
  const canDelete = useHasPermission("catalogs", "delete");
  const grouped = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        entries: catalogs.entries
          .filter((entry) => entry.kind === group.kind)
          .sort(
            (left, right) =>
              left.sortOrder - right.sortOrder ||
              left.label.localeCompare(right.label),
          ),
      })),
    [catalogs.entries],
  );

  const createEntry = async (
    kind: CatalogKind,
    input: {
      key: string;
      label: string;
      sortOrder?: number;
      isClosed?: boolean;
      color?: string;
    },
  ) => {
    try {
      await catalogs.createEntry(kind, input);
      showToast({ tone: "success", title: "Katalogeintrag angelegt" });
    } catch (catalogError) {
      showToast({
        tone: "error",
        title: "Katalogeintrag konnte nicht angelegt werden",
        message: errorMessage(catalogError),
      });
    }
  };

  const updateEntry = async (
    kind: CatalogKind,
    entry: CatalogEntry,
    input: { label: string; sortOrder: number; isClosed: boolean; color: string },
  ) => {
    try {
      await catalogs.updateEntry(kind, entry.id, {
        ...input,
        expectedVersion: entry.version,
      });
      showToast({ tone: "success", title: "Katalogeintrag gespeichert" });
    } catch (catalogError) {
      showToast({
        tone: "error",
        title: "Katalogeintrag konnte nicht gespeichert werden",
        message: errorMessage(catalogError),
      });
    }
  };

  const deleteEntry = async (kind: CatalogKind, entry: CatalogEntry) => {
    const approved = await confirm({
      title: "Katalogeintrag löschen?",
      body: `"${entry.label}" wird entfernt. Betroffene Objekte wechseln auf den niedrigsten Sortierwert dieses Katalogs.`,
      severity: "danger",
      confirmLabel: "Löschen",
    });
    if (!approved) {
      return;
    }
    try {
      await catalogs.deleteEntry(kind, entry.id);
      showToast({ tone: "info", title: "Katalogeintrag gelöscht" });
    } catch (catalogError) {
      showToast({
        tone: "error",
        title: "Katalogeintrag konnte nicht gelöscht werden",
        message: errorMessage(catalogError),
      });
    }
  };

  return (
    <div className="mx-auto grid max-w-[1080px] gap-4">
      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
        <header className="bg-gradient-to-br from-steel-700 to-teal px-5 py-5 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/12">
              <ListChecks size={21} />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-normal">
                Kataloge verwalten
              </h1>
              <p className="text-sm text-white/75">
                {catalogs.entries.length} Einträge
              </p>
            </div>
          </div>
        </header>
        <div className="grid gap-5 p-4 md:p-5">
          {catalogs.error ? (
            <div className="rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">
              {catalogs.error}
            </div>
          ) : null}
          {catalogs.loading ? (
            <div className="rounded-lg border border-dashed border-line bg-shell/60 p-8 text-center text-sm text-slate-500">
              Kataloge werden geladen.
            </div>
          ) : null}
          {!catalogs.loading
            ? grouped.map((group) => (
                <CatalogGroup
                  key={group.kind}
                  kind={group.kind}
                  title={group.title}
                  createLabel={group.createLabel}
                  entries={group.entries}
                  canWrite={canWrite}
                  canDelete={canDelete}
                  onCreate={createEntry}
                  onUpdate={updateEntry}
                  onDelete={deleteEntry}
                />
              ))
            : null}
        </div>
      </section>
    </div>
  );
}
