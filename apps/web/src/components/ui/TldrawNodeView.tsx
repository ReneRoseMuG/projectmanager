import type { ReactNodeViewProps } from "@tiptap/react";
import * as TiptapReact from "@tiptap/react";
import { exportToBlob, Tldraw, type Editor, type TLEditorSnapshot } from "@tldraw/tldraw";
import { Loader2, PenLine } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

function parseSnapshot(rawSnapshot: string): TLEditorSnapshot | null {
  if (!rawSnapshot) {
    return null;
  }

  try {
    return JSON.parse(rawSnapshot) as TLEditorSnapshot;
  } catch {
    return null;
  }
}

export function TldrawNodeView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const NodeViewWrapper = TiptapReact.NodeViewWrapper;
  const [isEditing, setIsEditing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const previewSvgRef = useRef<string | null>(null);
  const rawSnapshot = typeof node.attrs.snapshot === "string" ? node.attrs.snapshot : "";
  const snapshot = useMemo(() => parseSnapshot(rawSnapshot), [rawSnapshot]);

  useEffect(() => {
    return () => {
      if (previewSvgRef.current) {
        URL.revokeObjectURL(previewSvgRef.current);
      }
    };
  }, []);

  const replacePreviewSvg = (nextPreviewSvg: string | null) => {
    if (previewSvgRef.current) {
      URL.revokeObjectURL(previewSvgRef.current);
    }

    previewSvgRef.current = nextPreviewSvg;
    setPreviewSvg(nextPreviewSvg);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleCommit = async () => {
    const editor = editorRef.current;
    if (!editor || isCommitting) {
      return;
    }

    setIsCommitting(true);
    const shapeIds = [...editor.getCurrentPageShapeIds()];

    try {
      if (shapeIds.length === 0) {
        updateAttributes({ snapshot: "" });
        replacePreviewSvg(null);
        return;
      }

      updateAttributes({ snapshot: JSON.stringify(editor.getSnapshot()) });

      try {
        const svgBlob = await exportToBlob({
          editor,
          ids: shapeIds,
          format: "svg",
          opts: { background: false }
        });
        replacePreviewSvg(URL.createObjectURL(svgBlob));
      } catch {
        replacePreviewSvg(null);
      }
    } finally {
      setIsCommitting(false);
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <NodeViewWrapper>
        <div
          className={[
            "my-2 rounded-md border border-line bg-shell",
            selected ? "ring-1 ring-steel-600" : ""
          ].join(" ")}
          data-testid="tldraw-node-preview"
          onDoubleClick={() => setIsEditing(true)}
        >
          {previewSvg ? (
            <img src={previewSvg} alt="Zeichnung" className="w-full rounded-md" />
          ) : (
            <div className="flex h-32 items-center justify-center gap-2 text-sm text-slate-500">
              <PenLine className="h-4 w-4" />
              Zeichnung — Doppelklick zum Bearbeiten
            </div>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <div className="my-2 rounded-md border border-line" data-testid="tldraw-node-editor">
        <div className="h-[480px] w-full overflow-hidden rounded-t-md">
          <Tldraw
            snapshot={snapshot ?? undefined}
            onMount={(editor) => {
              editorRef.current = editor;
            }}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-line bg-shell px-3 py-2">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-line/50"
            data-testid="tldraw-node-cancel"
            disabled={isCommitting}
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleCommit}
            className="flex items-center gap-1.5 rounded bg-steel-700 px-3 py-1.5 text-sm text-white hover:bg-steel-800 disabled:cursor-not-allowed disabled:opacity-70"
            data-testid="tldraw-node-commit"
            disabled={isCommitting}
          >
            {isCommitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Übernehmen
          </button>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
