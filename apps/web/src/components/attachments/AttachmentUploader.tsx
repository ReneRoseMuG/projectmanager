import { Upload } from "lucide-react";
import type { DragEvent } from "react";
import { useRef, useState } from "react";
import { Button } from "../ui/Button";

interface AttachmentUploaderProps {
  onUpload: (file: File) => Promise<unknown>;
  size?: "default" | "sm";
  tone?: "light" | "dark";
}

export function AttachmentUploader({ onUpload, size = "default", tone = "light" }: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [active, setActive] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);
  const compact = size === "sm";
  const dark = tone === "dark";

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
      className={`grid place-items-center gap-3 rounded-lg border-2 border-dashed px-6 text-center transition ${compact ? "py-5" : "py-9"} ${
        dark
          ? active
            ? "border-white/40 bg-white/10"
            : "border-white/20 bg-white/[0.04]"
          : active
            ? "border-steel-600 bg-steel-100/60"
            : "border-steel-300 bg-gradient-to-b from-steel-100/50 to-white"
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
      <div className={`flex items-center justify-center rounded-lg text-white shadow-steel-icon ${dark ? "border border-white/15 bg-white/10" : "bg-steel-700"} ${compact ? "h-10 w-10" : "h-14 w-14"}`}>
        <Upload size={compact ? 18 : 22} />
      </div>
      <div>
        <h3 className={`${compact ? "text-sm" : "text-base"} font-bold ${dark ? "text-white" : "text-ink"}`}>Dateien hier ablegen</h3>
        <p className={`text-sm ${dark ? "text-white/55" : "text-steel-500"}`}>oder über den Button auswählen - max. 25 MB pro Datei</p>
      </div>
      <div>
        <Button variant="primary" icon={<Upload size={16} />} onClick={() => inputRef.current?.click()}>
          Auswählen
        </Button>
      </div>
      {uploading.length > 0 ? <p className={`text-xs ${dark ? "text-white/55" : "text-steel-500"}`}>{uploading.join(", ")}</p> : null}
    </div>
  );
}
