import type { Attachment } from "@taskmanager/shared-types";
import { Paperclip } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { AttachmentPreview } from "./AttachmentPreview";

interface AttachmentListProps {
  attachments: Attachment[];
  onDelete: (attachment: Attachment) => void;
  onOpen: (attachment: Attachment) => Promise<void>;
  openingAttachmentId?: number | null;
}

export function AttachmentList({ attachments, onDelete, onOpen, openingAttachmentId = null }: AttachmentListProps) {
  if (attachments.length === 0) {
    return <EmptyState icon={<Paperclip size={22} />} title="Noch keine Dateien" body="Hochgeladene Dateien erscheinen hier mit Vorschau und Aktionen." tone="teal" variant="tinted" />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {attachments.map((attachment) => (
        <AttachmentPreview key={attachment.id} attachment={attachment} onDelete={onDelete} onOpen={onOpen} opening={openingAttachmentId === attachment.id} />
      ))}
    </div>
  );
}
