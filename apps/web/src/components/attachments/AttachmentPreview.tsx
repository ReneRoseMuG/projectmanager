import type { Attachment } from "@taskmanager/shared-types";
import { Download, FolderOpen, Trash2, X } from "lucide-react";
import { assetUrl } from "../../api/client";
import { errorMessageAsync } from "../../hooks/errors";
import { formatHumanDate } from "../../utils/date";
import { Button } from "../ui/Button";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { useToast } from "../ui/ToastProvider";
import { describeAttachmentType } from "./attachmentTypes";
import { DocumentPreviewBody, prettyBytes } from "./DocumentPreviewBody";

interface AttachmentPreviewProps {
  attachment: Attachment;
  onUnlink: (attachment: Attachment) => Promise<void>;
  onDeletePermanently?: (attachment: Attachment) => Promise<void>;
  onOpen: (attachment: Attachment) => Promise<void>;
  opening?: boolean;
}

export function AttachmentPreview({
  attachment,
  onUnlink,
  onDeletePermanently,
  onOpen,
  opening = false,
}: AttachmentPreviewProps) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const meta = describeAttachmentType(attachment);
  const url = assetUrl(attachment.url);
  const Icon = meta.Icon;

  const openLocally = async () => {
    try {
      await onOpen(attachment);
    } catch (openError) {
      showToast({
        tone: "error",
        title: "Datei konnte nicht geöffnet werden",
        message: await errorMessageAsync(openError),
      });
    }
  };

  const unlink = async () => {
    const promotesToLibrary = !attachment.isInDocumentLibrary && attachment.owners.length <= 1;
    const approved = await confirm({
      title: promotesToLibrary ? "Verknüpfung lösen und Datei behalten?" : "Verknüpfung lösen?",
      body: promotesToLibrary
        ? "Dies ist die letzte Owner-Verknüpfung. Beim Lösen wird die Datei in die Dokumentenbibliothek aufgenommen, damit sie nicht verborgen und ownerlos zurückbleibt."
        : "Nur die Verknüpfung zu diesem Element wird gelöst. Bibliothekssichtbarkeit, andere Owner und die physische Datei bleiben unverändert.",
      severity: "warn",
      confirmLabel: promotesToLibrary ? "Lösen & aufnehmen" : "Verknüpfung lösen"
    });
    if (!approved) {
      return;
    }
    try {
      await onUnlink(attachment);
      showToast({ tone: "success", title: "Verknüpfung gelöst" });
    } catch (unlinkError) {
      showToast({
        tone: "error",
        title: "Verknüpfung konnte nicht gelöst werden",
        message: await errorMessageAsync(unlinkError)
      });
    }
  };

  const deletePermanently = async () => {
    if (!onDeletePermanently) {
      return;
    }
    const approved = await confirm({
      title: "Datei endgültig löschen?",
      body: "Die physische Datei, alle Owner-Verknüpfungen sowie alle DMS-Zuordnungen werden dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.",
      severity: "danger",
      confirmLabel: "Endgültig löschen",
      requireCheck: "Ich bestätige das endgültige Löschen."
    });
    if (!approved) {
      return;
    }
    try {
      await onDeletePermanently(attachment);
      showToast({ tone: "success", title: "Datei endgültig gelöscht" });
    } catch (deleteError) {
      showToast({
        tone: "error",
        title: "Datei konnte nicht endgültig gelöscht werden",
        message: await errorMessageAsync(deleteError)
      });
    }
  };

  return (
    <article className="grid gap-3.5 rounded-lg border border-line bg-white p-3.5 shadow-sm">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-lg ${meta.toneClassName}`}
          title={meta.label}
        >
          <Icon size={21} />
        </span>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-ink">
              {attachment.originalName}
            </h3>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${meta.toneClassName}`}
            >
              {meta.badge}
            </span>
          </div>
          <p className="truncate text-xs text-steel-500">
            {prettyBytes(attachment.size)} ·{" "}
            {formatHumanDate(attachment.createdAt)} · {attachment.mimetype}
          </p>
        </div>
        <div className="flex gap-1">
          <a
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink transition hover:bg-line/50"
            href={url}
            target="_blank"
            rel="noreferrer"
            title="Öffnen"
            aria-label="Öffnen"
          >
            <Download size={16} />
          </a>
          <Button
            aria-label="Lokal öffnen"
            title="Lokal öffnen"
            className="h-10 w-10"
            icon={<FolderOpen size={18} />}
            variant="ghost"
            disabled={opening}
            onClick={() => void openLocally()}
          />
          <Button
            aria-label="Verknüpfung lösen"
            title="Verknüpfung lösen"
            className="h-10 w-10"
            icon={<X size={18} />}
            variant="ghost"
            onClick={() => void unlink()}
          />
          {onDeletePermanently ? (
            <Button
              aria-label="Endgültig löschen"
              title="Endgültig löschen"
              className="h-10 w-10"
              icon={<Trash2 size={18} />}
              variant="ghost"
              onClick={() => void deletePermanently()}
            />
          ) : null}
        </div>
      </div>

      <DocumentPreviewBody attachment={attachment} />
    </article>
  );
}
