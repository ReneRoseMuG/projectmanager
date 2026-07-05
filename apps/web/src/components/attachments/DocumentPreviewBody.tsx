import type {
  Attachment,
  AttachmentPreviewInfo,
} from "@taskmanager/shared-types";
import { useState } from "react";
import { assetUrl } from "../../api/client";
import { useAttachmentPreview } from "../../hooks/useAttachmentPreview";
import { Spinner } from "../ui/Spinner";
import { describeAttachmentType } from "./attachmentTypes";

// Geteilter Vorschau-Renderer für Anhänge (MS-75). Rendert je nach Dateifamilie die
// passende Vorschau: Bild/PDF/Audio/Video direkt als Asset, Text/CSV und Office-Dokumente
// über die serverseitige Vorschau (useAttachmentPreview → gecachte Konvertierung). Wird von
// der Anhang-Karte (AttachmentPreview) und der Hover-/Detail-Vorschau der Dokumente-Seite
// genutzt, damit die Vorschau-Logik nur an EINER Stelle lebt. `compact` verkleinert die
// Höhen für das Hover-Popover und lässt die Bild-Lightbox weg.

export function prettyBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function needsServerPreview(
  family: ReturnType<typeof describeAttachmentType>["family"],
): boolean {
  return (
    family === "text" ||
    family === "code" ||
    family === "csv" ||
    family === "word" ||
    family === "spreadsheet" ||
    family === "presentation" ||
    family === "opendocument"
  );
}

function parseDelimitedRows(
  content: string,
  delimiter: "," | "\t",
): string[][] {
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
    <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-line bg-shell px-4 text-center text-sm text-steel-500">
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
    return (
      <PreviewMessage>
        {preview.message ?? "Keine Textvorschau verfügbar."}
      </PreviewMessage>
    );
  }

  return (
    <div className="grid gap-2">
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border border-line bg-shell p-3 font-mono text-xs leading-relaxed text-ink">
        {preview.text.content}
      </pre>
      {preview.text.truncated ? (
        <p className="text-xs text-steel-500">
          Vorschau gekürzt nach {prettyBytes(preview.text.bytesRead)}.
        </p>
      ) : null}
    </div>
  );
}

function CsvPreview({
  preview,
  delimiter,
}: {
  preview: AttachmentPreviewInfo;
  delimiter: "," | "\t";
}) {
  if (!preview.text) {
    return (
      <PreviewMessage>
        {preview.message ?? "Keine Tabellenvorschau verfügbar."}
      </PreviewMessage>
    );
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
              <tr
                key={`${rowIndex}-${row.join("|")}`}
                className={
                  rowIndex === 0
                    ? "bg-steel-100 font-semibold text-ink"
                    : "text-steel-600"
                }
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${cellIndex}-${cell}`}
                    className="max-w-48 border-b border-r border-line px-2 py-1.5 align-top"
                  >
                    <span className="line-clamp-3 break-words">{cell}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {preview.text.truncated ? (
        <p className="text-xs text-steel-500">
          Vorschau gekürzt nach {prettyBytes(preview.text.bytesRead)}.
        </p>
      ) : null}
    </div>
  );
}

interface DocumentPreviewBodyProps {
  attachment: Attachment;
  compact?: boolean;
}

export function DocumentPreviewBody({
  attachment,
  compact = false,
}: DocumentPreviewBodyProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const meta = describeAttachmentType(attachment);
  const serverPreviewEnabled = needsServerPreview(meta.family);
  const { preview, loading, error } = useAttachmentPreview(
    attachment.id,
    serverPreviewEnabled,
  );
  const url = assetUrl(attachment.url);
  const previewUrl = preview?.previewUrl ? assetUrl(preview.previewUrl) : url;

  if (meta.family === "image") {
    if (compact) {
      return (
        <img
          className="h-40 w-full rounded-md border border-line bg-shell object-contain"
          src={url}
          alt={attachment.originalName}
        />
      );
    }
    return (
      <>
        <button
          type="button"
          className="overflow-hidden rounded-md border border-line bg-shell"
          onClick={() => setLightboxOpen(true)}
        >
          <img
            className="h-48 w-full object-contain"
            src={url}
            alt={attachment.originalName}
          />
        </button>
        <dialog
          open={lightboxOpen}
          className="fixed inset-0 z-50 h-screen w-screen bg-steel-900/80 p-8"
          onClick={() => setLightboxOpen(false)}
        >
          <img
            className="mx-auto max-h-full max-w-full rounded-lg bg-white object-contain"
            src={url}
            alt={attachment.originalName}
          />
        </dialog>
      </>
    );
  }

  if (meta.family === "pdf") {
    return (
      <embed
        className={
          compact
            ? "h-56 w-full rounded-md border border-line"
            : "h-72 rounded-md border border-line"
        }
        src={url}
        type="application/pdf"
      />
    );
  }

  if (meta.family === "audio") {
    return (
      <div className="rounded-md border border-line bg-shell p-3">
        <audio className="w-full" src={url} controls />
      </div>
    );
  }

  if (meta.family === "video") {
    return (
      <video
        className={`${compact ? "max-h-56" : "max-h-72"} w-full rounded-md border border-line bg-black`}
        src={url}
        controls
      />
    );
  }

  if (!serverPreviewEnabled) {
    return (
      <PreviewMessage>
        Für diesen Dateityp ist keine sichere Vorschau verfügbar.
      </PreviewMessage>
    );
  }

  if (loading) {
    return <LoadingPreview />;
  }

  if (error) {
    return <PreviewMessage>{error}</PreviewMessage>;
  }

  if (!preview || preview.status !== "available") {
    return (
      <PreviewMessage>
        {preview?.message ?? "Vorschau nicht verfügbar."}
      </PreviewMessage>
    );
  }

  if (preview.kind === "text") {
    return <TextPreview preview={preview} />;
  }

  if (preview.kind === "csv") {
    return (
      <CsvPreview
        preview={preview}
        delimiter={meta.badge === "TSV" ? "\t" : ","}
      />
    );
  }

  if (preview.kind === "generatedPdf" && preview.previewUrl) {
    return (
      <embed
        className={
          compact
            ? "h-56 w-full rounded-md border border-line"
            : "h-72 rounded-md border border-line"
        }
        src={previewUrl}
        type="application/pdf"
      />
    );
  }

  return (
    <PreviewMessage>
      {preview.message ?? "Vorschau nicht verfügbar."}
    </PreviewMessage>
  );
}
