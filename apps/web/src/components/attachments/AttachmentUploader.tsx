import { Upload } from "lucide-react";
import type { AttachmentLibrarySelection } from "@taskmanager/shared-types";
import type { DragEvent } from "react";
import { useId, useRef, useState } from "react";
import { Button } from "../ui/Button";

interface AttachmentUploaderBaseProps {
  size?: "default" | "sm";
  tone?: "light" | "dark";
}

type AttachmentUploaderProps = AttachmentUploaderBaseProps & (
  | { visibilityMode: "owner"; onUpload: (file: File, librarySelection: AttachmentLibrarySelection) => Promise<unknown> }
  | { visibilityMode?: "library"; onUpload: (file: File) => Promise<unknown> }
);

export function AttachmentUploader(props: AttachmentUploaderProps) {
  const { size = "default", tone = "light" } = props;
  const visibilityMode = props.visibilityMode ?? "library";
  const inputRef = useRef<HTMLInputElement | null>(null);
  const radioName = useId();
  const [active, setActive] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);
  const [librarySelection, setLibrarySelection] = useState<AttachmentLibrarySelection | null>(null);
  const [selectionMissing, setSelectionMissing] = useState(false);
  const compact = size === "sm";
  const dark = tone === "dark";

  const uploadFiles = async (files: FileList | File[]) => {
    if (visibilityMode === "owner" && librarySelection === null) {
      setSelectionMissing(true);
      return;
    }
    const fileArray = Array.from(files);
    setUploading(fileArray.map((file) => file.name));
    try {
      for (const file of fileArray) {
        if (props.visibilityMode === "owner") {
          await props.onUpload(file, librarySelection!);
        } else {
          await props.onUpload(file);
        }
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
      {visibilityMode === "owner" ? (
        <fieldset className={`grid w-full max-w-xl gap-2 text-left ${dark ? "text-white" : "text-ink"}`}>
          <legend className="mb-1 text-sm font-semibold">Wo soll dieser Upload erscheinen?</legend>
          <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${dark ? "border-white/15 bg-white/[0.04]" : "border-line bg-white"}`}>
            <input
              type="radio"
              name={radioName}
              value="attachment-only"
              checked={librarySelection === "attachment-only"}
              onChange={() => {
                setLibrarySelection("attachment-only");
                setSelectionMissing(false);
              }}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-medium">Nur als Anhang</span>
              <span className={`block text-xs ${dark ? "text-white/55" : "text-steel-500"}`}>
                Die Datei bleibt ausschließlich an diesem Element verknüpft.
              </span>
            </span>
          </label>
          <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${dark ? "border-white/15 bg-white/[0.04]" : "border-line bg-white"}`}>
            <input
              type="radio"
              name={radioName}
              value="document-library"
              checked={librarySelection === "document-library"}
              onChange={() => {
                setLibrarySelection("document-library");
                setSelectionMissing(false);
              }}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-medium">Zusätzlich in der Dokumentenbibliothek</span>
              <span className={`block text-xs ${dark ? "text-white/55" : "text-steel-500"}`}>
                Dieselbe Datei erscheint außerdem zentral im Dokumentenmanagement.
              </span>
            </span>
          </label>
          {selectionMissing ? (
            <p className="text-xs text-crimson">Bitte wählen Sie vor dem Upload eine der beiden Optionen.</p>
          ) : null}
        </fieldset>
      ) : null}
      <div className={`flex items-center justify-center rounded-lg text-white shadow-steel-icon ${dark ? "border border-white/15 bg-white/10" : "bg-steel-700"} ${compact ? "h-10 w-10" : "h-14 w-14"}`}>
        <Upload size={compact ? 18 : 22} />
      </div>
      <div>
        <h3 className={`${compact ? "text-sm" : "text-base"} font-bold ${dark ? "text-white" : "text-ink"}`}>Dateien hier ablegen</h3>
        <p className={`text-sm ${dark ? "text-white/55" : "text-steel-500"}`}>oder über den Button auswählen - max. 25 MB pro Datei</p>
      </div>
      <div>
        <Button
          variant="primary"
          icon={<Upload size={16} />}
          disabled={visibilityMode === "owner" && librarySelection === null}
          onClick={() => inputRef.current?.click()}
        >
          Auswählen
        </Button>
      </div>
      {uploading.length > 0 ? (
        <div className={`text-xs ${dark ? "text-white/55" : "text-steel-500"}`}>
          <p>{uploading.join(", ")}</p>
          {visibilityMode === "owner" ? (
            <p className="mt-1 font-medium">
              {librarySelection === "document-library" ? "Zusätzlich in der Dokumentenbibliothek" : "Nur als Anhang"}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
