import { Upload } from "lucide-react";
import type { DragEvent } from "react";
import { useRef, useState } from "react";
import { Button } from "../ui/Button";

interface AttachmentUploaderProps {
  onUpload: (file: File) => Promise<unknown>;
  size?: "default" | "sm";
}

export function AttachmentUploader({ onUpload, size = "default" }: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [active, setActive] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);
  const compact = size === "sm";

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
      className={`grid place-items-center gap-3 rounded-2xl border-2 border-dashed px-6 text-center transition ${compact ? "py-5" : "py-9"} ${
        active ? "border-steel-600 bg-steel-100/60" : "border-steel-300 bg-gradient-to-b from-steel-100/50 to-white"
      }`}
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
      <div className={`flex items-center justify-center rounded-2xl bg-steel-700 text-white shadow-steel-icon ${compact ? "h-10 w-10" : "h-14 w-14"}`}>
        <Upload size={compact ? 18 : 22} />
      </div>
      <div>
        <h3 className={`${compact ? "text-sm" : "text-base"} font-bold text-ink`}>Dateien hier ablegen</h3>
        <p className="text-sm text-slate-500">oder über den Button auswählen - max. 25 MB pro Datei</p>
      </div>
      <div>
        <Button variant="primary" icon={<Upload size={16} />} onClick={() => inputRef.current?.click()}>
          Auswählen
        </Button>
      </div>
      {uploading.length > 0 ? <p className="text-xs text-slate-500">{uploading.join(", ")}</p> : null}
    </div>
  );
}
