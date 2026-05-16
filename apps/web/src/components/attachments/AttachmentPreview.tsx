import type { Attachment } from "@taskmanager/shared-types";
import { Download, File, Trash2 } from "lucide-react";
import { useState } from "react";
import { assetUrl } from "../../api/client";
import { formatHumanDate } from "../../utils/date";
import { Button } from "../ui/Button";

interface AttachmentPreviewProps {
  attachment: Attachment;
  onDelete: (attachment: Attachment) => void;
}

const formatTone: Record<string, string> = {
  pdf: "bg-crimson text-white",
  fig: "bg-magenta text-white",
  png: "bg-violet text-white",
  jpg: "bg-violet text-white",
  jpeg: "bg-violet text-white",
  zip: "bg-mustard text-[#6E5800]",
  doc: "bg-teal text-white",
  docx: "bg-teal text-white",
  xls: "bg-fern text-white",
  xlsx: "bg-fern text-white"
};

function prettyBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentPreview({ attachment, onDelete }: AttachmentPreviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const url = assetUrl(attachment.url);
  const isImage = attachment.mimetype.startsWith("image/");
  const isPdf = attachment.mimetype === "application/pdf";
  const ext = attachment.originalName.split(".").pop()?.toLowerCase() ?? "";
  const tone = formatTone[ext] ?? "bg-steel-500 text-white";
  const label = ext ? ext.toUpperCase().slice(0, 4) : "FILE";

  return (
    <article className="grid gap-3.5 rounded-xl border border-line bg-white p-3.5 shadow-sm">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-[11px] font-bold ${tone}`}>{label}</span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-ink">{attachment.originalName}</h3>
          <p className="text-xs text-slate-500">
            {prettyBytes(attachment.size)} · {formatHumanDate(attachment.createdAt)}
          </p>
        </div>
        <div className="flex gap-1">
          <a className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink transition hover:bg-line/50" href={url} target="_blank" rel="noreferrer" title="Öffnen" aria-label="Öffnen">
            <Download size={16} />
          </a>
          <Button aria-label="Löschen" title="Löschen" className="h-9 w-9" icon={<Trash2 size={16} />} variant="ghost" onClick={() => onDelete(attachment)} />
        </div>
      </div>

      {isImage ? (
        <>
          <button type="button" className="overflow-hidden rounded-md border border-line bg-shell" onClick={() => setLightboxOpen(true)}>
            <img className="h-48 w-full object-contain" src={url} alt={attachment.originalName} />
          </button>
          <dialog open={lightboxOpen} className="fixed inset-0 z-50 h-screen w-screen bg-steel-900/80 p-8" onClick={() => setLightboxOpen(false)}>
            <img className="mx-auto max-h-full max-w-full rounded-lg bg-white object-contain" src={url} alt={attachment.originalName} />
          </dialog>
        </>
      ) : isPdf ? (
        <embed className="h-72 rounded-md border border-line" src={url} type="application/pdf" />
      ) : (
        <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-line bg-shell text-slate-500">
          <File size={28} />
        </div>
      )}
    </article>
  );
}
