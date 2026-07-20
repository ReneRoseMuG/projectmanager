import type { AttachmentLibrarySelection } from "@taskmanager/shared-types";

export type ViewMode = "list" | "kanban";

export type DraftFile = {
  file: File;
  previewUrl?: string;
  librarySelection: AttachmentLibrarySelection;
};
