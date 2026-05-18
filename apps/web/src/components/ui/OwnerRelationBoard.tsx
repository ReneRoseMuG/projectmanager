import { Link2 } from "lucide-react";
import type { ReactNode } from "react";
import { errorMessageAsync } from "../../hooks/errors";
import { Button } from "./Button";
import { useConfirm } from "./ConfirmDialogProvider";
import { useToast } from "./ToastProvider";

export interface RelationBoardViewSlotProps<TItem> {
  items: TItem[];
  loading: boolean;
  onAdd: () => void;
  onAddStatus?: (status: string) => void;
  onOpen: (item: TItem) => void;
  onDelete: (item: TItem) => void;
  linkAction: ReactNode;
}

interface OwnerRelationBoardProps<TItem extends { id: number }> {
  items: TItem[];
  loading?: boolean;
  onCreateItem: (status?: string) => void;
  onLinkItem: () => void;
  onUnlinkItem: (item: TItem) => Promise<void>;
  onOpenItem: (item: TItem) => void;
  renderListBoardView: (props: RelationBoardViewSlotProps<TItem>) => ReactNode;
  confirmUnlinkTitle: (item: TItem) => string;
  confirmUnlinkBody: (item: TItem) => string;
}

export function OwnerRelationBoard<TItem extends { id: number }>({
  items,
  loading = false,
  onCreateItem,
  onLinkItem,
  onUnlinkItem,
  onOpenItem,
  renderListBoardView,
  confirmUnlinkTitle,
  confirmUnlinkBody
}: OwnerRelationBoardProps<TItem>) {
  const { confirm } = useConfirm();
  const { showToast } = useToast();

  const unlinkItem = async (item: TItem) => {
    const approved = await confirm({
      title: confirmUnlinkTitle(item),
      body: confirmUnlinkBody(item),
      severity: "danger",
      confirmLabel: "Entfernen"
    });
    if (!approved) {
      return;
    }

    try {
      await onUnlinkItem(item);
      showToast({ tone: "success", title: "Zuordnung entfernt" });
    } catch (unlinkError) {
      showToast({ tone: "error", title: "Zuordnung konnte nicht entfernt werden", message: await errorMessageAsync(unlinkError) });
    }
  };

  return (
    <>
      {renderListBoardView({
        items,
        loading,
        onAdd: () => onCreateItem(),
        onAddStatus: (status) => onCreateItem(status),
        onOpen: onOpenItem,
        onDelete: (item) => void unlinkItem(item),
        linkAction: (
          <Button variant="secondary" icon={<Link2 size={17} />} onClick={onLinkItem}>
            Verknüpfen
          </Button>
        )
      })}
    </>
  );
}
