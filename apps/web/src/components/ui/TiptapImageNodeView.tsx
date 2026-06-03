import type { ReactNodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { AlignCenter, AlignLeft, GripVertical } from "lucide-react";
import { useRef } from "react";
import type { ImageAlign, ImageFloat } from "./tiptap-image-node";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function ToolbarBtn({
  active,
  title,
  onClick,
  children
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded transition-colors",
        active ? "bg-steel-700 text-white" : "text-steel-500 hover:bg-line/50 hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

export function TiptapImageNodeView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const src = node.attrs.src as string;
  const alt = node.attrs.alt as string | null;
  const float = (node.attrs.float as ImageFloat) ?? "none";
  const align = (node.attrs.align as ImageAlign) ?? "left";
  const storedWidth = node.attrs.width as number | null;

  const imgRef = useRef<HTMLImageElement>(null);

  const isFloatLeft = float === "left";
  const isFloatRight = float === "right";
  const isCenter = float === "none" && align === "center";
  const isInline = float === "none" && align !== "center";

  const nodeViewStyle: React.CSSProperties = {
    float: float !== "none" ? float : undefined,
    marginRight: isFloatLeft ? "1rem" : isCenter ? "auto" : undefined,
    marginLeft: isFloatRight ? "1rem" : isCenter ? "auto" : undefined,
    marginBottom: float !== "none" ? "0.5rem" : undefined,
    display: isCenter ? "block" : undefined,
    width: storedWidth ? `${storedWidth}px` : "fit-content",
    maxWidth: "100%",
    position: "relative"
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const img = imgRef.current;
    if (!img) return;

    const startX = e.clientX;
    const startWidth = img.offsetWidth || img.naturalWidth || 400;

    const onMove = (me: MouseEvent) => {
      const delta = me.clientX - startX;
      const newWidth = Math.max(80, startWidth + delta);
      img.style.width = `${newWidth}px`;
    };

    const onUp = () => {
      const finalWidth = img.offsetWidth;
      if (finalWidth > 0) {
        updateAttributes({ width: finalWidth });
      }
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <NodeViewWrapper style={nodeViewStyle}>
      {/* Selection ring */}
      {selected && (
        <div className="pointer-events-none absolute inset-0 z-10 rounded ring-2 ring-steel-600" />
      )}

      {/* Alignment toolbar */}
      {selected && (
        <div className="absolute -top-8 left-0 z-20 flex items-center gap-0.5 rounded-md border border-line bg-white px-1 py-0.5 shadow-md">
          <ToolbarBtn
            active={isInline}
            title="Inline (links)"
            onClick={() => updateAttributes({ float: "none", align: "left" })}
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            active={isCenter}
            title="Zentriert"
            onClick={() => updateAttributes({ float: "none", align: "center" })}
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <div className="mx-0.5 h-4 w-px bg-line" />
          <ToolbarBtn
            active={isFloatLeft}
            title="Links – Text fließt rechts"
            onClick={() => updateAttributes({ float: "left", align: "left" })}
          >
            <span className="text-[11px] font-bold leading-none">◧</span>
          </ToolbarBtn>
          <ToolbarBtn
            active={isFloatRight}
            title="Rechts – Text fließt links"
            onClick={() => updateAttributes({ float: "right", align: "right" })}
          >
            <span className="text-[11px] font-bold leading-none">◨</span>
          </ToolbarBtn>
          <div className="mx-0.5 h-4 w-px bg-line" />
          <div
            data-drag-handle
            className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-steel-500 hover:bg-line/50 hover:text-ink"
            title="Verschieben"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
        </div>
      )}

      <img
        ref={imgRef}
        src={src}
        alt={alt ?? ""}
        className="block max-w-full rounded"
        style={{ width: storedWidth ? `${storedWidth}px` : undefined }}
        draggable={false}
      />

      {/* Resize handle */}
      {selected && (
        <div
          className="absolute bottom-0 right-0 z-20 h-4 w-4 cursor-nwse-resize rounded-tl-sm bg-steel-600 opacity-70 hover:opacity-100"
          onMouseDown={handleResizeStart}
          title="Größe ändern"
        />
      )}
    </NodeViewWrapper>
  );
}
