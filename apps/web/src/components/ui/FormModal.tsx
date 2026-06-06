import { ExternalLink, Save, Trash2, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { Button } from "./Button";
import { CopyReferenceButton } from "./CopyReferenceButton";
import { Modal } from "./Modal";
import { PageHero } from "./PageHero";

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** When set, shown as the main header title; `title` moves into the breadcrumb. */
  entityTitle?: string;
  objectReference?: string;
  icon?: ReactNode;
  breadcrumb?: string[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  saving?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  footerStart?: ReactNode;
  /** When true the footer with Save/Cancel buttons is hidden (used in auto-save edit mode). */
  hideFooter?: boolean;
  /** When provided a delete icon button is rendered in the header. */
  onDelete?: () => void;
  /** Auto-save status indicator rendered in the header next to the action buttons. */
  saveStatus?: ReactNode;
  headerMeta?: ReactNode;
  variant?: "modal" | "page";
  onOpenInTab?: () => void;
  tabBar?: ReactNode;
  contentLayout?: "default" | "flush";
  contentClassName?: string;
  modalZIndexClassName?: string;
  children: ReactNode;
}

/** Shared form template; renders either as modal chrome or as full page content. */
export function FormModal({
  open,
  onClose,
  title,
  entityTitle,
  objectReference,
  icon,
  breadcrumb = [],
  onSubmit,
  saving = false,
  submitLabel = "Speichern",
  cancelLabel = "Abbrechen",
  footerStart,
  hideFooter = false,
  onDelete,
  saveStatus,
  headerMeta,
  variant = "modal",
  onOpenInTab,
  tabBar,
  contentLayout = "default",
  contentClassName = "",
  modalZIndexClassName,
  children,
}: FormModalProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    return onSubmit(event);
  };

  if (!open) {
    return null;
  }

  const isPage = variant === "page";

  const form = (
    <form
      className={
        isPage
          ? "flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-shell shadow-panel"
          : "flex max-h-[calc(100vh-64px)] flex-col bg-shell"
      }
      onSubmit={submit}
    >
      <PageHero
        variant="detail"
        title={entityTitle ?? title}
        breadcrumb={entityTitle ? [...breadcrumb, title] : breadcrumb}
        icon={icon}
        metaPills={headerMeta}
        fixedHeight={isPage}
        actions={
          <>
            {saveStatus ? (
              <div className="flex items-center pr-1">{saveStatus}</div>
            ) : null}
            {objectReference ? (
              <CopyReferenceButton
                reference={objectReference}
                variant="hero"
              />
            ) : null}
            {onOpenInTab ? (
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/12 hover:text-white"
                aria-label="In neuem Tab öffnen"
                title="In neuem Tab öffnen"
                onClick={onOpenInTab}
              >
                <ExternalLink size={18} />
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-crimson/30 hover:text-white"
                aria-label="Löschen"
                title="Löschen"
                onClick={onDelete}
              >
                <Trash2 size={18} />
              </button>
            ) : null}
            <button
              type="button"
              className={
                isPage
                  ? "flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-white/80 hover:bg-white/12 hover:text-white"
                  : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/12 hover:text-white"
              }
              aria-label="Schließen"
              title="Schließen"
              onClick={onClose}
            >
              <X size={18} />
              {isPage ? <span>Zurück</span> : null}
            </button>
          </>
        }
      />

      {tabBar ? (
        <div
          className={
            isPage
              ? "shrink-0 shadow-sm"
              : "shrink-0"
          }
        >
          {tabBar}
        </div>
      ) : null}

      <div
        data-testid={isPage ? "form-page-body" : undefined}
        className={`${
          contentLayout === "flush"
            ? "flex min-h-0 w-full flex-1 overflow-hidden"
            : isPage
              ? "flex min-h-0 w-full flex-1 flex-col gap-4 overflow-auto px-4 py-4 md:px-5 md:py-5"
              : "grid min-h-0 flex-1 content-start gap-4 overflow-auto p-4 md:p-5"
        } ${contentClassName}`}
      >
        {children}
      </div>

      {!hideFooter ? (
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-white px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">{footerStart}</div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button onClick={onClose}>{cancelLabel}</Button>
            <Button
              type="submit"
              variant="primary"
              icon={<Save size={16} />}
              disabled={saving}
            >
              {submitLabel}
            </Button>
          </div>
        </footer>
      ) : null}
    </form>
  );

  if (variant === "page") {
    return form;
  }

  return (
    <Modal
      open={open}
      title={title}
      size="xl"
      showHeader={false}
      bodyClassName="p-0"
      zIndexClassName={modalZIndexClassName}
      onClose={onClose}
    >
      {form}
    </Modal>
  );
}
