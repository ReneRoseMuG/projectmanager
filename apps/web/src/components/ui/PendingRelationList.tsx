import { Link2, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { ItemRow } from "./ItemRow";
import { Pill, type PillTone } from "./Pill";

interface PendingExistingItem {
  id: number;
  title: string;
  statusLabel?: string;
  statusTone?: PillTone;
}

interface PendingDraftItem {
  title: string;
  badge?: string;
}

interface PendingRelationListProps<TItem extends PendingExistingItem = PendingExistingItem> {
  existingItems: TItem[];
  draftItems: PendingDraftItem[];
  emptyIcon: ReactNode;
  emptyTitle: string;
  showLinkExisting?: boolean;
  showCreateNew?: boolean;
  linkExistingLabel?: string;
  createNewLabel?: string;
  onLinkExisting?: () => void;
  onCreateNew?: () => void;
  onRemoveExisting: (index: number) => void;
  onRemoveDraft: (index: number) => void;
}

export function PendingRelationList<TItem extends PendingExistingItem = PendingExistingItem>({
  existingItems,
  draftItems,
  emptyIcon,
  emptyTitle,
  showLinkExisting = true,
  showCreateNew = true,
  linkExistingLabel = "Verknüpfen",
  createNewLabel = "Neu erstellen",
  onLinkExisting,
  onCreateNew,
  onRemoveExisting,
  onRemoveDraft
}: PendingRelationListProps<TItem>) {
  const hasItems = existingItems.length > 0 || draftItems.length > 0;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        {showLinkExisting ? (
          <Button variant="secondary" icon={<Link2 size={17} />} onClick={onLinkExisting}>
            {linkExistingLabel}
          </Button>
        ) : null}
        {showCreateNew ? (
          <Button variant="primary" icon={<Plus size={17} />} onClick={onCreateNew}>
            {createNewLabel}
          </Button>
        ) : null}
      </div>

      {!hasItems ? <EmptyState icon={emptyIcon} title={emptyTitle} body="Noch keine Zuordnungen vorgemerkt." tone="neutral" variant="tinted" /> : null}

      {hasItems ? (
        <div className="grid gap-2">
          {existingItems.map((item, index) => (
            <ItemRow
              key={`existing-${item.id}`}
              title={item.title}
              pills={item.statusLabel && item.statusTone ? <Pill tone={item.statusTone}>{item.statusLabel}</Pill> : <Badge tone="steel">Bestehend</Badge>}
              actions={
                <Button aria-label={`${item.title} entfernen`} title="Entfernen" variant="ghost" icon={<Trash2 size={16} />} onClick={() => onRemoveExisting(index)} />
              }
            />
          ))}
          {draftItems.map((item, index) => (
            <ItemRow
              key={`draft-${item.title}-${index}`}
              title={item.title}
              pills={<Badge tone="fern">{item.badge ?? "Wird erstellt"}</Badge>}
              actions={
                <Button aria-label={`${item.title} entfernen`} title="Entfernen" variant="ghost" icon={<Trash2 size={16} />} onClick={() => onRemoveDraft(index)} />
              }
            />
          ))}
        </div>
      ) : null}

      <p className="rounded-md border border-line bg-shell px-3 py-2 text-xs font-semibold text-slate-600">Diese Zuordnungen werden nach dem Speichern verknüpft.</p>
    </div>
  );
}
