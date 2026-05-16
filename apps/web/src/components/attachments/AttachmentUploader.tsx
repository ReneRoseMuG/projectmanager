import { Upload } from "lucide-react";
import type { DragEvent } from "react";
import { useRef, useState } from "react";
import { Button } from "../ui/Button";

interface AttachmentUploaderProps {
  onUpload: (file: File) => Promise<unknown>;
}

export function AttachmentUploader({ onUpload }: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [active, setActive] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    setUploading(fileArray.map((file) => file.name));
    try {
      for (const file of fileArray) {
        await onUpload(file);
      }
    } catch {
      // Upload errors are surfaced by the caller via toast feedback.
    } finally {
      setUploading([]);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setActive(false);
    void uploadFiles(event.dataTransfer.files);
  };

  return (
    <div
      className={`grid gap-3 rounded-lg border border-dashed p-6 text-center ${active ? "border-teal bg-teal/5" : "border-line bg-white"}`}
      onDragOver={(event) => {
        event.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) {
            void uploadFiles(event.target.files);
          }
        }}
      />
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-shell text-teal">
        <Upload size={20} />
      </div>
      <div>
        <p className="text-sm font-medium text-ink">Dateien ablegen</p>
        <p className="text-xs text-slate-500">Max. 25 MB pro Datei</p>
      </div>
      <div>
        <Button icon={<Upload size={16} />} onClick={() => inputRef.current?.click()}>
          Auswählen
        </Button>
      </div>
      {uploading.length > 0 ? <p className="text-xs text-slate-500">{uploading.join(", ")}</p> : null}
    </div>
  );
}
