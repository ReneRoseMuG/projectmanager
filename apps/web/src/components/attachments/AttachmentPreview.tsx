import type { Attachment } from "@taskmanager/shared-types";
import { Download, FolderOpen, Trash2 } from "lucide-react";
import { assetUrl } from "../../api/client";
import { errorMessageAsync } from "../../hooks/errors";
import { formatHumanDate } from "../../utils/date";
import { Button } from "../ui/Button";
import { useToast } from "../ui/ToastProvider";
import { describeAttachmentType } from "./attachmentTypes";
import { DocumentPreviewBody, prettyBytes } from "./DocumentPreviewBody";

interface AttachmentPreviewProps {
  attachment: Attachment;
  onDelete: (attachment: Attachment) => void;
  onOpen: (attachment: Attachment) => Promise<void>;
  opening?: boolean;
}

export function AttachmentPreview({
  attachment,
  onDelete,
  onOpen,
  opening = false,
}: AttachmentPreviewProps) {
  const { showToast } = useToast();
  const meta = describeAttachmentType(attachment);
  const url = assetUrl(attachment.url);
  const Icon = meta.Icon;

  const openLocally = async () => {
    try {
      await onOpen(attachment);
    } catch (openError) {
      showToast({
        tone: "error",
        title: "Datei konnte nicht geöffnet werden",
        message: await errorMessageAsync(openError),
      });
    }
  };

  return (
    <article className="grid gap-3.5 rounded-lg border border-line bg-white p-3.5 shadow-sm">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-lg ${meta.toneClassName}`}
          title={meta.label}
        >
          <Icon size={21} />
        </span>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-ink">
              {attachment.originalName}
            </h3>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${meta.toneClassName}`}
            >
              {meta.badge}
            </span>
          </div>
          <p className="truncate text-xs text-steel-500">
            {prettyBytes(attachment.size)} ·{" "}
            {formatHumanDate(attachment.createdAt)} · {attachment.mimetype}
          </p>
        </div>
        <div className="flex gap-1">
          <a
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink transition hover:bg-line/50"
            href={url}
            target="_blank"
            rel="noreferrer"
            title="Öffnen"
            aria-label="Öffnen"
          >
            <Download size={16} />
          </a>
          <Button
            aria-label="Lokal öffnen"
            title="Lokal öffnen"
            className="h-10 w-10"
            icon={<FolderOpen size={18} />}
            variant="ghost"
            disabled={opening}
            onClick={() => void openLocally()}
          />
          <Button
            aria-label="Löschen"
            title="Löschen"
            className="h-10 w-10"
            icon={<Trash2 size={18} />}
            variant="ghost"
            onClick={() => onDelete(attachment)}
          />
        </div>
      </div>

      <DocumentPreviewBody attachment={attachment} />
    </article>
  );
}
