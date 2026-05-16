import type { Attachment } from "@taskmanager/shared-types";
import { AttachmentPreview } from "./AttachmentPreview";

interface AttachmentListProps {
  attachments: Attachment[];
  onDelete: (attachment: Attachment) => void;
}

export function AttachmentList({ attachments, onDelete }: AttachmentListProps) {
  if (attachments.length === 0) {
    return <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-sm text-slate-600">Keine Dateien</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {attachments.map((attachment) => (
        <AttachmentPreview key={attachment.id} attachment={attachment} onDelete={onDelete} />
      ))}
    </div>
  );
}
