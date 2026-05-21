import { ExternalLink, Save, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  breadcrumb?: string[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  saving?: boolean;
  submitLabel?: string;
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
  icon,
  breadcrumb = [],
  onSubmit,
  saving = false,
  submitLabel = "Speichern",
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
          ? "flex min-h-[calc(100dvh-4rem)] flex-col bg-shell shadow-panel"
          : "flex max-h-[calc(100vh-64px)] flex-col bg-shell"
      }
      onSubmit={submit}
    >
      <header
        className={`relative overflow-hidden bg-gradient-to-br from-steel-700 to-steel-600 px-5 py-5 text-white md:px-6 ${isPage ? "" : "shrink-0"}`}
      >
        <div className="pointer-events-none absolute -right-8 -top-32 h-80 w-80 rounded-full bg-white/12 blur-sm" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="grid gap-2">
            {breadcrumb.length > 0 ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                {breadcrumb.join(" · ")}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              {icon ? (
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/12 text-white">
                  {icon}
                </span>
              ) : null}
              <div>
                <h2 className="text-2xl font-bold tracking-normal">{title}</h2>
                {headerMeta ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {headerMeta}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
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
          </div>
        </div>
      </header>

      {tabBar ? (
        <div
          className={
            isPage
              ? "sticky top-[-1rem] z-20 shadow-sm md:top-[-1.5rem]"
              : "shrink-0"
          }
        >
          {tabBar}
        </div>
      ) : null}

      <div
        className={`${isPage ? "flex min-h-0 flex-1 flex-col gap-4 px-4 pt-4 md:px-5 md:pt-5" : "grid min-h-0 flex-1 content-start gap-4 overflow-auto p-4 md:p-5"} ${contentClassName}`}
      >
        {children}
      </div>

      <footer
        className={`flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white px-5 py-4 ${isPage ? "sticky bottom-[-1rem] z-10 rounded-b-2xl md:bottom-[-1.5rem]" : "shrink-0"}`}
      >
        <div className="flex flex-wrap items-center gap-2">{footerStart}</div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button onClick={onClose}>Abbrechen</Button>
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
