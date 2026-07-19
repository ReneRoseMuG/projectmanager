import type { Attachment } from "@taskmanager/shared-types";
import { Paperclip } from "lucide-react";
import { useHasPermission } from "../../hooks/usePermissions";
import { EmptyState } from "../ui/EmptyState";
import { AttachmentPreview } from "./AttachmentPreview";

interface AttachmentListProps {
  attachments: Attachment[];
  onUnlink: (attachment: Attachment) => Promise<void>;
  onDeletePermanently: (attachment: Attachment) => Promise<void>;
  onOpen: (attachment: Attachment) => Promise<void>;
  openingAttachmentId?: number | null;
}

export function AttachmentList({ attachments, onUnlink, onDeletePermanently, onOpen, openingAttachmentId = null }: AttachmentListProps) {
  const canDelete = useHasPermission("attachments", "delete");
  if (attachments.length === 0) {
    return <EmptyState icon={<Paperclip size={22} />} title="Noch keine Dateien" body="Hochgeladene Dateien erscheinen hier mit Vorschau und Aktionen." tone="teal" variant="tinted" />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {attachments.map((attachment) => (
        <AttachmentPreview
          key={attachment.id}
          attachment={attachment}
          onUnlink={onUnlink}
          onDeletePermanently={canDelete ? onDeletePermanently : undefined}
          onOpen={onOpen}
          opening={openingAttachmentId === attachment.id}
        />
      ))}
    </div>
  );
}
