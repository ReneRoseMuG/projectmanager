import type { Attachment, AttachmentPreviewInfo } from "@taskmanager/shared-types";
import { Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { assetUrl } from "../../api/client";
import { useAttachmentPreview } from "../../hooks/useAttachmentPreview";
import { formatHumanDate } from "../../utils/date";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import { describeAttachmentType } from "./attachmentTypes";

interface AttachmentPreviewProps {
  attachment: Attachment;
  onDelete: (attachment: Attachment) => void;
}

function prettyBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function needsServerPreview(family: ReturnType<typeof describeAttachmentType>["family"]): boolean {
  return family === "text" || family === "code" || family === "csv" || family === "word" || family === "spreadsheet" || family === "presentation" || family === "opendocument";
}

function parseDelimitedRows(content: string, delimiter: "," | "\t"): string[][] {
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .slice(0, 12)
    .map((line) => parseDelimitedLine(line, delimiter).slice(0, 8));
}

function parseDelimitedLine(line: string, delimiter: "," | "\t"): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index] ?? "";
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

function PreviewMessage({ children }: { children: string }) {
  return (
    <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-line bg-shell px-4 text-center text-sm text-slate-500">
      <span>{children}</span>
    </div>
  );
}

function LoadingPreview() {
  return (
    <div className="flex h-28 items-center justify-center rounded-md border border-line bg-shell text-steel-700">
      <Spinner size="sm" />
    </div>
  );
}

function TextPreview({ preview }: { preview: AttachmentPreviewInfo }) {
  if (!preview.text) {
    return <PreviewMessage>{preview.message ?? "Keine Textvorschau verfügbar."}</PreviewMessage>;
  }

  return (
    <div className="grid gap-2">
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border border-line bg-shell p-3 font-mono text-xs leading-relaxed text-ink">{preview.text.content}</pre>
      {preview.text.truncated ? <p className="text-xs text-slate-500">Vorschau gekürzt nach {prettyBytes(preview.text.bytesRead)}.</p> : null}
    </div>
  );
}

function CsvPreview({ preview, delimiter }: { preview: AttachmentPreviewInfo; delimiter: "," | "\t" }) {
  if (!preview.text) {
    return <PreviewMessage>{preview.message ?? "Keine Tabellenvorschau verfügbar."}</PreviewMessage>;
  }

  const rows = parseDelimitedRows(preview.text.content, delimiter);
  if (rows.length === 0) {
    return <PreviewMessage>Keine Tabellendaten gefunden.</PreviewMessage>;
  }

  return (
    <div className="grid gap-2">
      <div className="max-h-72 overflow-auto rounded-md border border-line bg-white">
        <table className="min-w-full border-collapse text-left text-xs">
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${rowIndex}-${row.join("|")}`} className={rowIndex === 0 ? "bg-steel-100 font-semibold text-ink" : "text-slate-600"}>
                {row.map((cell, cellIndex) => (
                  <td key={`${cellIndex}-${cell}`} className="max-w-48 border-b border-r border-line px-2 py-1.5 align-top">
                    <span className="line-clamp-3 break-words">{cell}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {preview.text.truncated ? <p className="text-xs text-slate-500">Vorschau gekürzt nach {prettyBytes(preview.text.bytesRead)}.</p> : null}
    </div>
  );
}

export function AttachmentPreview({ attachment, onDelete }: AttachmentPreviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const meta = describeAttachmentType(attachment);
  const serverPreviewEnabled = needsServerPreview(meta.family);
  const { preview, loading, error } = useAttachmentPreview(attachment.id, serverPreviewEnabled);
  const url = assetUrl(attachment.url);
  const previewUrl = preview?.previewUrl ? assetUrl(preview.previewUrl) : url;
  const Icon = meta.Icon;

  const renderPreview = () => {
    if (meta.family === "image") {
      return (
        <>
          <button type="button" className="overflow-hidden rounded-md border border-line bg-shell" onClick={() => setLightboxOpen(true)}>
            <img className="h-48 w-full object-contain" src={url} alt={attachment.originalName} />
          </button>
          <dialog open={lightboxOpen} className="fixed inset-0 z-50 h-screen w-screen bg-steel-900/80 p-8" onClick={() => setLightboxOpen(false)}>
            <img className="mx-auto max-h-full max-w-full rounded-lg bg-white object-contain" src={url} alt={attachment.originalName} />
          </dialog>
        </>
      );
    }

    if (meta.family === "pdf") {
      return <embed className="h-72 rounded-md border border-line" src={url} type="application/pdf" />;
    }

    if (meta.family === "audio") {
      return (
        <div className="rounded-md border border-line bg-shell p-3">
          <audio className="w-full" src={url} controls />
        </div>
      );
    }

    if (meta.family === "video") {
      return <video className="max-h-72 w-full rounded-md border border-line bg-black" src={url} controls />;
    }

    if (!serverPreviewEnabled) {
      return <PreviewMessage>Für diesen Dateityp ist keine sichere Vorschau verfügbar.</PreviewMessage>;
    }

    if (loading) {
      return <LoadingPreview />;
    }

    if (error) {
      return <PreviewMessage>{error}</PreviewMessage>;
    }

    if (!preview || preview.status !== "available") {
      return <PreviewMessage>{preview?.message ?? "Vorschau nicht verfügbar."}</PreviewMessage>;
    }

    if (preview.kind === "text") {
      return <TextPreview preview={preview} />;
    }

    if (preview.kind === "csv") {
      return <CsvPreview preview={preview} delimiter={meta.badge === "TSV" ? "\t" : ","} />;
    }

    if (preview.kind === "generatedPdf" && preview.previewUrl) {
      return <embed className="h-72 rounded-md border border-line" src={previewUrl} type="application/pdf" />;
    }

    return <PreviewMessage>{preview.message ?? "Vorschau nicht verfügbar."}</PreviewMessage>;
  };

  return (
    <article className="grid gap-3.5 rounded-xl border border-line bg-white p-3.5 shadow-sm">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${meta.toneClassName}`} title={meta.label}>
          <Icon size={21} />
        </span>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-ink">{attachment.originalName}</h3>
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${meta.toneClassName}`}>{meta.badge}</span>
          </div>
          <p className="truncate text-xs text-slate-500">
            {prettyBytes(attachment.size)} · {formatHumanDate(attachment.createdAt)} · {attachment.mimetype}
          </p>
        </div>
        <div className="flex gap-1">
          <a className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink transition hover:bg-line/50" href={url} target="_blank" rel="noreferrer" title="Öffnen" aria-label="Öffnen">
            <Download size={16} />
          </a>
          <Button aria-label="Löschen" title="Löschen" className="h-9 w-9" icon={<Trash2 size={16} />} variant="ghost" onClick={() => onDelete(attachment)} />
        </div>
      </div>

      {renderPreview()}
    </article>
  );
}
