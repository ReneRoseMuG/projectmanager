import type { Attachment } from "@taskmanager/shared-types";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { describeAttachmentType } from "./attachmentTypes";
import { DocumentPreviewBody, prettyBytes } from "./DocumentPreviewBody";

// Hover-Vorschau für die Dokumente-Bibliothek (MS-75). Beim Verweilen auf einer Zeile
// erscheint verzögert ein schwebendes Popover mit der kompakten Vorschau. Die Vorschau
// (und damit die evtl. teure Office-Konvertierung) wird ERST beim Öffnen gemountet, nicht
// für jede Listenzeile — zusammen mit dem Server-/Query-Cache lädt jedes Dokument so höchstens
// einmal. Ein Öffnungs- und Schließ-Delay überbrückt den Spalt zwischen Zeile und Popover,
// damit die Maus hineinwandern (und in Text/PDF scrollen) kann.

const POPOVER_WIDTH = 340;
const MARGIN = 12;
const MAX_HEIGHT = 440;
const OPEN_DELAY_MS = 220;
const CLOSE_DELAY_MS = 140;

interface DocumentHoverPreviewProps {
  document: Attachment;
  children: ReactNode;
}

export function DocumentHoverPreview({
  document,
  children,
}: DocumentHoverPreviewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(
    () => () => {
      if (openTimer.current) {
        clearTimeout(openTimer.current);
      }
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
      }
    },
    [],
  );

  const computeAndOpen = () => {
    const node = wrapperRef.current;
    if (!node) {
      return;
    }
    const rect = node.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    const left =
      spaceRight >= POPOVER_WIDTH + MARGIN
        ? rect.right + MARGIN
        : Math.max(MARGIN, rect.left - POPOVER_WIDTH - MARGIN);
    const top = Math.max(
      MARGIN,
      Math.min(rect.top, window.innerHeight - MAX_HEIGHT - MARGIN),
    );
    setPosition({ top, left });
  };

  const scheduleOpen = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (position || openTimer.current) {
      return;
    }
    openTimer.current = setTimeout(() => {
      openTimer.current = null;
      computeAndOpen();
    }, OPEN_DELAY_MS);
  };

  const scheduleClose = () => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current) {
      return;
    }
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setPosition(null);
    }, CLOSE_DELAY_MS);
  };

  const meta = describeAttachmentType(document);
  const Icon = meta.Icon;

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
    >
      {children}
      {position ? (
        <div
          className="fixed z-40 w-[340px] overflow-auto rounded-lg border border-line bg-white p-3 shadow-panel"
          style={{
            top: position.top,
            left: position.left,
            maxHeight: MAX_HEIGHT,
          }}
          role="tooltip"
          onMouseEnter={scheduleOpen}
          onMouseLeave={scheduleClose}
        >
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${meta.toneClassName}`}
            >
              <Icon size={16} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-ink">
                {document.displayName ?? document.originalName}
              </p>
              <p className="truncate text-[11px] text-steel-500">
                {meta.label} · {prettyBytes(document.size)}
              </p>
            </div>
          </div>
          <DocumentPreviewBody attachment={document} compact />
        </div>
      ) : null}
    </div>
  );
}
