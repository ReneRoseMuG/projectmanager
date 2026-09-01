import type { Attachment } from "@taskmanager/shared-types";
import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
  Presentation,
  type LucideIcon,
} from "lucide-react";

export type AttachmentFamily =
  | "image"
  | "affinity"
  | "pdf"
  | "text"
  | "code"
  | "csv"
  | "word"
  | "spreadsheet"
  | "presentation"
  | "opendocument"
  | "archive"
  | "audio"
  | "video"
  | "other";

export interface AttachmentTypeMeta {
  family: AttachmentFamily;
  label: string;
  badge: string;
  toneClassName: string;
  Icon: LucideIcon;
  previewEnabled: boolean;
}

const textExtensions = new Set([
  "txt",
  "md",
  "markdown",
  "log",
  "xml",
  "html",
  "htm",
  "yaml",
  "yml",
  "ini",
  "env",
]);
const codeExtensions = new Set([
  "json",
  "js",
  "jsx",
  "ts",
  "tsx",
  "css",
  "sql",
]);
const csvExtensions = new Set(["csv", "tsv"]);
const wordExtensions = new Set(["doc", "docx", "dot", "dotx", "rtf"]);
const spreadsheetExtensions = new Set(["xls", "xlsx", "xlt", "xltx"]);
const presentationExtensions = new Set([
  "ppt",
  "pptx",
  "pot",
  "potx",
  "pps",
  "ppsx",
]);
const openDocumentExtensions = new Set([
  "odt",
  "ott",
  "ods",
  "ots",
  "odp",
  "otp",
  "odg",
  "otg",
  "odf",
  "fodt",
  "fods",
  "fodp",
]);
const archiveExtensions = new Set(["zip", "rar", "7z", "tar", "gz", "tgz"]);

function extensionOf(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function badgeFor(extension: string, fallback: string): string {
  return extension ? extension.toUpperCase().slice(0, 6) : fallback;
}

export function describeAttachmentType(
  attachment: Attachment,
): AttachmentTypeMeta {
  const mimetype = attachment.mimetype.toLowerCase();
  const extension = extensionOf(attachment.originalName);

  if (extension === "af") {
    return {
      family: "affinity",
      label: "Affinity",
      badge: "AF",
      toneClassName: "bg-violet text-white",
      Icon: FileImage,
      previewEnabled: false,
    };
  }
  if (mimetype.startsWith("image/")) {
    return {
      family: "image",
      label: "Bild",
      badge: badgeFor(extension, "IMG"),
      toneClassName: "bg-violet text-white",
      Icon: FileImage,
      previewEnabled: true,
    };
  }
  if (mimetype === "application/pdf" || extension === "pdf") {
    return {
      family: "pdf",
      label: "PDF",
      badge: "PDF",
      toneClassName: "bg-crimson text-white",
      Icon: FileText,
      previewEnabled: true,
    };
  }
  if (mimetype.startsWith("audio/")) {
    return {
      family: "audio",
      label: "Audio",
      badge: badgeFor(extension, "AUD"),
      toneClassName: "bg-teal text-white",
      Icon: FileAudio,
      previewEnabled: true,
    };
  }
  if (mimetype.startsWith("video/")) {
    return {
      family: "video",
      label: "Video",
      badge: badgeFor(extension, "VID"),
      toneClassName: "bg-magenta text-white",
      Icon: FileVideo,
      previewEnabled: true,
    };
  }
  if (
    mimetype === "text/csv" ||
    mimetype === "text/tab-separated-values" ||
    csvExtensions.has(extension)
  ) {
    return {
      family: "csv",
      label: extension === "tsv" ? "TSV" : "CSV",
      badge: badgeFor(extension, "CSV"),
      toneClassName: "bg-fern text-white",
      Icon: FileSpreadsheet,
      previewEnabled: true,
    };
  }
  if (mimetype === "application/json" || codeExtensions.has(extension)) {
    return {
      family: "code",
      label: "Code",
      badge: badgeFor(extension, "CODE"),
      toneClassName: "bg-steel-700 text-white",
      Icon: extension === "json" ? FileJson : FileCode,
      previewEnabled: true,
    };
  }
  if (
    mimetype.startsWith("text/") ||
    mimetype === "application/xml" ||
    mimetype === "application/yaml" ||
    textExtensions.has(extension)
  ) {
    const isMarkdown = extension === "md" || extension === "markdown";
    return {
      family: "text",
      label: isMarkdown ? "Markdown" : "Text",
      badge: badgeFor(extension, "TXT"),
      toneClassName: "bg-teal text-white",
      Icon: FileType,
      previewEnabled: true,
    };
  }
  if (isWordMimeType(mimetype) || wordExtensions.has(extension)) {
    return {
      family: "word",
      label: "Word",
      badge: badgeFor(extension, "DOC"),
      toneClassName: "bg-steel-600 text-white",
      Icon: FileText,
      previewEnabled: true,
    };
  }
  if (isSpreadsheetMimeType(mimetype) || spreadsheetExtensions.has(extension)) {
    return {
      family: "spreadsheet",
      label: "Tabelle",
      badge: badgeFor(extension, "XLS"),
      toneClassName: "bg-fern text-white",
      Icon: FileSpreadsheet,
      previewEnabled: true,
    };
  }
  if (
    isPresentationMimeType(mimetype) ||
    presentationExtensions.has(extension)
  ) {
    return {
      family: "presentation",
      label: "Präsentation",
      badge: badgeFor(extension, "PPT"),
      toneClassName: "bg-tangerine text-white",
      Icon: Presentation,
      previewEnabled: true,
    };
  }
  if (
    mimetype.startsWith("application/vnd.oasis.opendocument.") ||
    openDocumentExtensions.has(extension)
  ) {
    return {
      family: "opendocument",
      label: "LibreOffice",
      badge: badgeFor(extension, "ODF"),
      toneClassName: "bg-mustard text-mustard-dark",
      Icon: FileText,
      previewEnabled: true,
    };
  }
  if (archiveExtensions.has(extension)) {
    return {
      family: "archive",
      label: "Archiv",
      badge: badgeFor(extension, "ZIP"),
      toneClassName: "bg-mustard text-mustard-dark",
      Icon: FileArchive,
      previewEnabled: false,
    };
  }

  return {
    family: "other",
    label: "Datei",
    badge: badgeFor(extension, "FILE"),
    toneClassName: "bg-steel-500 text-white",
    Icon: File,
    previewEnabled: false,
  };
}

function isWordMimeType(mimetype: string): boolean {
  return (
    mimetype === "application/msword" ||
    mimetype === "application/rtf" ||
    mimetype.includes("wordprocessingml")
  );
}

function isSpreadsheetMimeType(mimetype: string): boolean {
  return (
    mimetype === "application/vnd.ms-excel" ||
    mimetype.includes("spreadsheetml")
  );
}

function isPresentationMimeType(mimetype: string): boolean {
  return (
    mimetype === "application/vnd.ms-powerpoint" ||
    mimetype.includes("presentationml")
  );
}
