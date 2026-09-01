import type { DraftFile } from "../../types";
import { FilePlus2, Image, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

const maxFileSize = 25 * 1024 * 1024;

interface PendingFileListProps {
  files: DraftFile[];
  onAdd: (files: DraftFile[]) => void;
  onRemove: (index: number) => void;
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${size} B`;
}

export function PendingFileList({ files, onAdd, onRemove }: PendingFileListProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) {
      return;
    }
    const accepted: DraftFile[] = [];
    const rejected: string[] = [];
    Array.from(selectedFiles).forEach((file) => {
      if (file.size > maxFileSize) {
        rejected.push(file.name);
        return;
      }
      accepted.push({
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined
      });
    });

    setError(rejected.length > 0 ? `Datei zu groß: ${rejected.join(", ")}. Maximal erlaubt sind 25 MB.` : null);
    if (accepted.length > 0) {
      onAdd(accepted);
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="grid gap-4">
      <p className="rounded-md border border-line bg-shell px-3 py-2 text-xs text-steel-600">
        Diese Dateien werden ausschließlich als Anhänge des neuen Elements gespeichert. DMS-Dokumente werden separat im Dokumentenmanagement importiert und können anschließend verknüpft werden.
      </p>
      <div className="flex justify-end">
        <input ref={inputRef} className="sr-only" type="file" multiple onChange={(event) => addFiles(event.target.files)} />
        <Button
          variant="primary"
          icon={<FilePlus2 size={17} />}
          onClick={() => inputRef.current?.click()}
        >
          Dateien auswählen
        </Button>
      </div>

      {error ? <div className="rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{error}</div> : null}

      {files.length === 0 ? (
        <EmptyState icon={<FilePlus2 size={22} />} title="Keine Dateien vorgemerkt" body="Dateien werden lokal gesammelt." tone="tangerine" variant="tinted" />
      ) : (
        <div className="grid gap-2">
          {files.map((draftFile, index) => (
            <div key={`${draftFile.file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-md border border-line bg-white p-3 shadow-sm">
              <div className="flex min-w-0 items-center gap-3">
                {draftFile.previewUrl ? (
                  <img className="h-12 w-12 rounded-md border border-line object-cover" src={draftFile.previewUrl} alt="" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-md border border-line bg-shell text-steel-500">
                    <Image size={18} />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{draftFile.file.name}</p>
                  <p className="text-xs font-semibold text-steel-500">{formatFileSize(draftFile.file.size)}</p>
                  <p className="text-xs text-steel-500">Exklusiver Parent-Anhang</p>
                </div>
              </div>
              <Button aria-label={`${draftFile.file.name} entfernen`} title="Entfernen" variant="ghost" icon={<Trash2 size={16} />} onClick={() => onRemove(index)} />
            </div>
          ))}
        </div>
      )}

      <p className="rounded-md border border-line bg-shell px-3 py-2 text-xs font-semibold text-steel-600">Dateien werden nach dem Speichern hochgeladen.</p>
    </div>
  );
}
