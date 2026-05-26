import { ExternalLink, Save, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { Button } from "./Button";
import { CopyReferenceButton } from "./CopyReferenceButton";
import { Modal } from "./Modal";
import { PageHero } from "./PageHero";

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  objectReference?: string;
  icon?: ReactNode;
  breadcrumb?: string[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  saving?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  footerStart?: ReactNode;
  headerMeta?: ReactNode;
  variant?: "modal" | "page";
  onOpenInTab?: () => void;
  tabBar?: ReactNode;
  contentClassName?: string;
  children: ReactNode;
}

/** Shared form template; renders either as modal chrome or as full page content. */
export function FormModal({
  open,
  onClose,
  title,
  objectReference,
  icon,
  breadcrumb = [],
  onSubmit,
  saving = false,
  submitLabel = "Speichern",
  cancelLabel = "Abbrechen",
  footerStart,
  headerMeta,
  variant = "modal",
  onOpenInTab,
  tabBar,
  contentClassName = "",
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
        title={title}
        breadcrumb={breadcrumb}
        icon={icon}
        metaPills={headerMeta}
        fixedHeight={isPage}
        actions={
          <>
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
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/12 hover:text-white"
              aria-label="Schließen"
              title="Schließen"
              onClick={onClose}
            >
              <X size={18} />
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
        className={`${isPage ? "flex min-h-0 w-full flex-1 flex-col gap-4 overflow-auto px-4 pt-4 md:px-5 md:pt-5" : "grid min-h-0 flex-1 content-start gap-4 overflow-auto p-4 md:p-5"} ${contentClassName}`}
      >
        {children}
      </div>

      <footer
        className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-white px-5 py-4"
      >
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
      onClose={onClose}
    >
      {form}
    </Modal>
  );
}
