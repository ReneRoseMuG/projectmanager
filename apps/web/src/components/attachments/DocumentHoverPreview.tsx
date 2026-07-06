import type { Attachment } from "@taskmanager/shared-types";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { describeAttachmentType } from "./attachmentTypes";
import { DocumentPreviewBody, prettyBytes } from "./DocumentPreviewBody";

// Hover-Vorschau für die Dokumente-Bibliothek (MS-75). Beim Verweilen auf einer Zeile
// erscheint verzögert ein schwebendes Popover mit der kompakten Vorschau. Die Vorschau
// (und damit die evtl. teure Office-Konvertierung) wird ERST beim Öffnen gemountet, nicht
// für jede Listenzeile — zusammen mit dem Server-/Query-Cache lädt jedes Dokument so höchstens
// einmal.
//
// Positionierung dicht am Mauszeiger: In der oberen Bildschirmhälfte öffnet das Popover per
// top-Anker nach UNTEN, in der unteren Hälfte per bottom-Anker nach OBEN. Dadurch bleibt die
// dem Cursor zugewandte Kante IMMER `GAP` px entfernt — unabhängig von der erst nach dem Laden
// bekannten Inhaltshöhe. (Ein maxHeight-basierter Offset ließ das Popover früher mehrere hundert
// Pixel entfernt erscheinen, weil er die maximale statt der tatsächlichen Höhe reservierte.)

const POPOVER_WIDTH = 400;
const MARGIN = 12;
const GAP = 14;
const MAX_HEIGHT = 460;
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
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState<{
    left: number;
    width: number;
    maxHeight: number;
    top?: number;
    bottom?: number;
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

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), Math.max(min, max));

  const computeAndOpen = () => {
    const node = wrapperRef.current;
    if (!node) {
      return;
    }
    const rect = node.getBoundingClientRect();
    const cursor = cursorRef.current ?? {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    const width = Math.min(
      POPOVER_WIDTH,
      Math.max(0, window.innerWidth - MARGIN * 2),
    );

    // Horizontal: bevorzugt dicht rechts neben dem Cursor, sonst links — nah dran (GAP).
    let left = cursor.x + GAP;
    if (left + width + MARGIN > window.innerWidth) {
      left = cursor.x - width - GAP;
    }
    left = clamp(
      left,
      MARGIN,
      Math.max(MARGIN, window.innerWidth - width - MARGIN),
    );

    // Vertikal: obere Hälfte → nach unten (top-Anker), untere Hälfte → nach oben (bottom-Anker).
    // Die cursornahe Kante liegt so immer GAP px vom Zeiger, egal wie hoch der Inhalt wird.
    if (cursor.y <= window.innerHeight / 2) {
      const top = cursor.y + GAP;
      const maxHeight = Math.min(MAX_HEIGHT, window.innerHeight - top - MARGIN);
      setPosition({ left, width, top, maxHeight });
    } else {
      const bottom = window.innerHeight - cursor.y + GAP;
      const maxHeight = Math.min(
        MAX_HEIGHT,
        window.innerHeight - bottom - MARGIN,
      );
      setPosition({ left, width, bottom, maxHeight });
    }
  };

  const rememberCursor = (event: MouseEvent<HTMLDivElement>) => {
    cursorRef.current = { x: event.clientX, y: event.clientY };
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
      onMouseEnter={(event) => {
        rememberCursor(event);
        scheduleOpen();
      }}
      onMouseMove={rememberCursor}
      onMouseLeave={scheduleClose}
    >
      {children}
      {position ? (
        <div
          className="fixed z-40 flex flex-col overflow-auto rounded-lg border border-line bg-white p-3 shadow-panel"
          style={{
            left: position.left,
            width: position.width,
            maxHeight: position.maxHeight,
            ...(position.top !== undefined
              ? { top: position.top }
              : { bottom: position.bottom }),
          }}
          role="tooltip"
          onMouseEnter={scheduleOpen}
          onMouseLeave={scheduleClose}
        >
          <div className="mb-2 flex shrink-0 items-center gap-2">
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
