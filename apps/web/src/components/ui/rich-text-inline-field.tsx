// MIGRATION INVENTORY (RichTextEditor -> RichTextInlineField)
// File                                             | Field                    | testIdPrefix
// -------------------------------------------------|--------------------------|---------------------------------------
// components/backlog/BacklogItemForm.tsx          | description              | backlog-item-description
// components/calendar/EventForm.tsx               | description              | event-description
// components/features/FeatureDetail.tsx           | description              | feature-detail-description
// components/features/FeatureDetail.tsx           | content                  | feature-detail-content
// components/features/FeatureForm.tsx             | description              | feature-form-description
// components/features/FeatureForm.tsx             | content                  | feature-form-content
// components/milestones/MilestoneForm.tsx         | description              | milestone-description
// components/notes/NoteEditor.tsx                 | content                  | note-editor-content
// components/projects/ProjectForm.tsx             | description              | project-description
// components/tasks/TaskForm.tsx                   | description              | task-description
// components/tickets/TicketForm.tsx               | description              | ticket-description
// components/ui/CommentThread.tsx                 | comment.body             | comment-thread-comment-${comment.id}-body
// components/ui/CommentThread.tsx                 | draft body               | comment-thread-body
// components/usecases/UseCaseForm.tsx             | description              | use-case-description
// components/usecases/UseCaseForm.tsx             | content                  | use-case-content
// components/wiki/WikiPageForm.tsx                | content                  | wiki-page-form-content

import type { Editor } from "@tiptap/core";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Code2,
  Columns2,
  Copy,
  Download,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Highlighter,
  ImageIcon,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Minus,
  PenLine,
  Quote,
  RemoveFormatting,
  Strikethrough,
  Text,
  Underline as UnderlineIcon
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Markdown } from "tiptap-markdown";
import { errorMessage } from "../../hooks/errors";
import { useStandaloneView } from "../../hooks/useStandaloneView";
import { hasVisibleHtmlContent } from "../../lib/html-utils";
import { exportRichTextDocument, type RichTextExportFormat } from "../../utils/richTextExport";
import { withStandaloneView } from "../../utils/standalone";
import { useToast } from "./ToastProvider";
import { Column, ColumnBlock } from "./tiptap-column-node";
import { ResizableImage } from "./tiptap-image-node";
import { TldrawNode } from "./tldraw-node";

interface RichTextInlineFieldProps {
  /** Current HTML value for the controlled field. */
  value: string | null | undefined;
  /** Declares whether the value is already HTML or raw markdown/plain text. */
  valueFormat?: RichTextValueFormat;
  /** Called on blur with the new HTML string. Does not persist directly. */
  onChange: (html: string) => void;
  /** Plain text placeholder shown when the field is empty. */
  placeholder?: string;
  /** Minimum visible height in text rows. */
  minRows?: number;
  /** Toolbar shown after the field enters edit mode. */
  toolbar?: RichTextToolbarVariant;
  /** Pure read view without editor mount or edit affordances. */
  readOnly?: boolean;
  /** Keep the active editor mounted when focus leaves the field. */
  commitOnBlur?: boolean;
  /** Report editor HTML while typing instead of only on blur. */
  liveUpdate?: boolean;
  /** Additional classes for the outer container. */
  className?: string;
  /** Stretch the editor to fill a flex/grid parent. */
  fill?: boolean;
  /** Unique prefix for data-testid attributes at each usage site. */
  testIdPrefix?: string;
  /** Optional image upload handler for clipboard images and toolbar file picker. */
  onImageUpload?: (file: File) => Promise<string>;
  /** When provided, enables the wiki-page-link button in the toolbar. */
  wikiPages?: Array<{ id: number; title: string }>;
  /** When false, mounts TipTap in non-editable mode: no toolbar interaction. Wiki links navigate on click in both modes. */
  editable?: boolean;
  /** Optional title used for DOCX/PDF/Markdown exports from the toolbar. */
  exportTitle?: string;
  /**
   * Runs before a wiki link inside the content navigates away. Lets the host
   * complete a pending auto-save first; navigation proceeds only when it resolves true.
   */
  onBeforeNavigate?: () => boolean | void | Promise<boolean | void>;
}

interface RichTextInlineEditorProps {
  value: string;
  valueFormat: RichTextValueFormat;
  originalValue: string;
  placeholder?: string;
  minRows?: number;
  toolbar: RichTextToolbarVariant;
  clickPosition: ClickPosition | null;
  testIdPrefix?: string;
  onImageUpload?: (file: File) => Promise<string>;
  wikiPages?: Array<{ id: number; title: string }>;
  fill: boolean;
  commitOnBlur: boolean;
  liveUpdate: boolean;
  editable?: boolean;
  exportTitle?: string;
  onBeforeNavigate?: () => boolean | void | Promise<boolean | void>;
  onLiveChange: (html: string) => void;
  onFocusStart: (html: string) => void;
  onCommit: (html: string) => void;
  onCancel: () => void;
}

interface ToolbarButtonProps {
  onClick: () => void;
  active: boolean;
  title: string;
  icon: React.ReactElement<{ className?: string }>;
  disabled?: boolean;
}

type RichTextToolbarVariant = "full" | "minimal" | "none";
type ImageUploadHandler = (file: File) => Promise<string>;
export type RichTextValueFormat = "html" | "markdown";

interface ClickPosition {
  left: number;
  top: number;
}

const IMAGE_UPLOAD_PLACEHOLDER = "[Bild wird hochgeladen...]";

const WikiAwareLink = Link.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      wikiPageId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-wiki-page-id"),
        renderHTML: (attributes: { wikiPageId?: unknown }) => {
          const wikiPageId = attributes.wikiPageId;
          if (typeof wikiPageId !== "string" || wikiPageId.trim() === "") {
            return {};
          }

          return { "data-wiki-page-id": wikiPageId };
        }
      }
    };
  }
});

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function wikiPageEditorHref(pageId: number): string {
  return `/wiki/${pageId}`;
}

function wikiPageLinkAttrs(pageId: number): { href: string; wikiPageId: string } {
  return {
    href: wikiPageEditorHref(pageId),
    wikiPageId: String(pageId)
  };
}

function parseWikiPageId(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getWikiPageIdFromHref(href: string | null | undefined): number | null {
  if (!href) {
    return null;
  }

  const wikiProtocolMatch = /^wiki:\/\/(\d+)$/.exec(href);
  if (wikiProtocolMatch) {
    return parseWikiPageId(wikiProtocolMatch[1]);
  }

  const routeMatch = /^\/wiki\/(\d+)(?:[?#].*)?$/.exec(href);
  if (routeMatch) {
    return parseWikiPageId(routeMatch[1]);
  }

  return null;
}

function getWikiPageIdFromAnchor(anchor: HTMLAnchorElement): number | null {
  return parseWikiPageId(anchor.getAttribute("data-wiki-page-id"))
    ?? getWikiPageIdFromHref(anchor.getAttribute("href"));
}

function closestWikiPageAnchor(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof Node)) {
    return null;
  }

  const targetElement = target instanceof Element ? target : target.parentElement;
  return targetElement?.closest<HTMLAnchorElement>('a[data-wiki-page-id], a[href^="wiki://"], a[href^="/wiki/"]') ?? null;
}

export function RichTextInlineField({ value, valueFormat = "html", onChange, placeholder, minRows, toolbar = "full", readOnly = false, commitOnBlur = true, liveUpdate = false, className = "", fill = false, testIdPrefix, onImageUpload, wikiPages, editable, exportTitle, onBeforeNavigate }: RichTextInlineFieldProps) {
  const [originalValue, setOriginalValue] = useState("");
  const hasContent = valueFormat === "markdown" ? Boolean(value?.trim()) : hasVisibleHtmlContent(value);
  const minRowsStyle = useMemo(() => (minRows ? ({ "--rich-text-field-min-rows": minRows } as React.CSSProperties) : undefined), [minRows]);
  const minRowsClassName = minRows ? "rich-text-inline-min-rows" : "";
  const fieldChromeClassName = readOnly ? "" : "border border-line bg-shell/70 shadow-sm";
  const fieldHoverClassName = !readOnly && "cursor-text hover:border-steel-300 hover:bg-white";

  const handleCommit = (html: string) => {
    onChange(html);
  };

  const handleCancel = () => {
    onChange(originalValue);
  };

  if (!readOnly) {
    return (
      <div className={cn("relative group", fill && "flex flex-1 flex-col", className)} data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined}>
        <RichTextInlineEditor
          value={value ?? ""}
          valueFormat={valueFormat}
          originalValue={originalValue}
          placeholder={placeholder}
          minRows={minRows}
          toolbar={toolbar}
          clickPosition={null}
          testIdPrefix={testIdPrefix}
          onImageUpload={onImageUpload}
          wikiPages={wikiPages}
          editable={editable}
          exportTitle={exportTitle}
          onBeforeNavigate={onBeforeNavigate}
          fill={fill}
          commitOnBlur={commitOnBlur}
          liveUpdate={liveUpdate}
          onLiveChange={onChange}
          onFocusStart={setOriginalValue}
          onCommit={handleCommit}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className={cn("relative group", className)}>
      {hasContent && valueFormat === "html" ? (
        <div
          className={cn(
            "rich-text-surface max-w-none rounded-md px-3 py-2 text-sm leading-relaxed transition-colors [&_li]:mb-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4",
            minRowsClassName,
            fieldChromeClassName,
            fieldHoverClassName
          )}
          data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined}
          style={minRowsStyle}
          dangerouslySetInnerHTML={{ __html: value ?? "" }}
        />
      ) : hasContent ? (
        <div
          className={cn(
            "rich-text-surface max-w-none whitespace-pre-wrap rounded-md px-3 py-2 text-sm leading-relaxed transition-colors",
            minRowsClassName,
            fieldChromeClassName,
            fieldHoverClassName
          )}
          data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined}
          style={minRowsStyle}
        >
          {value}
        </div>
      ) : (
        <div
          className={cn("rounded-md px-3 py-2 text-sm italic text-steel-500 transition-colors", minRowsClassName, fieldChromeClassName, fieldHoverClassName)}
          data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined}
          style={minRowsStyle}
        >
          {placeholder}
        </div>
      )}

    </div>
  );
}

function RichTextInlineEditor({ value, valueFormat, originalValue, placeholder, minRows, toolbar, clickPosition, testIdPrefix, onImageUpload, wikiPages, editable, exportTitle, onBeforeNavigate, fill, commitOnBlur, liveUpdate, onLiveChange, onFocusStart, onCommit, onCancel }: RichTextInlineEditorProps) {
  const cancellingRef = useRef(false);
  const [imageUploadCount, setImageUploadCount] = useState(0);
  const [hasFocus, setHasFocus] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const standalone = useStandaloneView();
  const editorAttributes = useMemo(() => {
    const attributes: Record<string, string> = {
      class: cn("rich-text-surface max-w-none", Boolean(minRows) && "rich-text-inline-min-rows", fill && "min-h-full flex-1")
    };

    if (minRows) {
      attributes.style = `--rich-text-field-min-rows: ${minRows};`;
    }

    return attributes;
  }, [minRows]);
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: false
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      Underline,
      WikiAwareLink.configure({ openOnClick: false, protocols: ['wiki'] }),
      ResizableImage,
      TldrawNode,
      Column,
      ColumnBlock,
      Markdown.configure({ html: true, transformPastedText: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        placeholder: placeholder ?? "Text eingeben ...",
        showOnlyWhenEditable: true
      })
    ],
    [placeholder]
  );

  const editor = useEditor({
    extensions,
    content: value,
    autofocus: false,
    editable: editable ?? true,
    editorProps: {
      attributes: editorAttributes,
      transformPastedText(text: string): string {
        return text.replace(/\n{3,}/g, "\n\n");
      },
      handlePaste(view, event): boolean {
        const imageItem = Array.from(event.clipboardData?.items ?? []).find((item) => item.type.startsWith("image/"));
        if (!imageItem) {
          return false;
        }

        event.preventDefault();
        if (!onImageUpload) {
          showToast({ tone: "error", title: "Bild-Upload ist nicht verfügbar" });
          return true;
        }

        const file = imageItem.getAsFile();
        if (!file) {
          return true;
        }

        const placeholderFrom = view.state.selection.from;
        view.dispatch(view.state.tr.insertText(IMAGE_UPLOAD_PLACEHOLDER));
        setImageUploadCount((count) => count + 1);

        void onImageUpload(file)
          .then((url) => {
            const imageNode = view.state.schema.nodes.image?.create({ src: url });
            if (!imageNode) {
              return;
            }

            view.dispatch(view.state.tr.delete(placeholderFrom, placeholderFrom + IMAGE_UPLOAD_PLACEHOLDER.length).insert(placeholderFrom, imageNode));
          })
          .catch((uploadError) => {
            view.dispatch(view.state.tr.delete(placeholderFrom, placeholderFrom + IMAGE_UPLOAD_PLACEHOLDER.length));
            showToast({ tone: "error", title: "Bild konnte nicht hochgeladen werden", message: errorMessage(uploadError) });
          })
          .finally(() => setImageUploadCount((count) => Math.max(0, count - 1)));

        return true;
      }
    },
    onTransaction({ editor: activeEditor, transaction }) {
      if (!transaction.getMeta("paste")) {
        return;
      }

      const { from, to } = transaction.selection;
      activeEditor.chain().selectAll().unsetColor().unsetMark("textStyle").setTextSelection({ from, to }).run();
    },
    onUpdate: ({ editor: activeEditor }: { editor: Editor }) => {
      if (liveUpdate) {
        onLiveChange(activeEditor.getHTML());
      }
    },
    onFocus: ({ editor: activeEditor }: { editor: Editor }) => {
      setHasFocus(true);
      onFocusStart(activeEditor.getHTML());
    },
    onBlur: ({ editor: activeEditor }: { editor: Editor }) => {
      setHasFocus(false);
      if (cancellingRef.current) {
        cancellingRef.current = false;
        onCancel();
        return;
      }

      if (!commitOnBlur) {
        return;
      }

      onCommit(activeEditor.getHTML());
    }
  });

  useEffect(() => {
    if (!editor || editor.isFocused) {
      return;
    }

    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value, valueFormat]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (liveUpdate && valueFormat === "markdown") {
      onLiveChange(editor.getHTML());
    }
  }, [editor, liveUpdate, onLiveChange, valueFormat]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (!clickPosition) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const position = editor.view.posAtCoords(clickPosition);
      if (position) {
        editor.commands.setTextSelection(position.pos);
        editor.commands.focus();
        return;
      }

      editor.commands.focus("end");
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [clickPosition, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancellingRef.current = true;
        editor.commands.setContent(originalValue);
        editor.commands.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor, originalValue]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable ?? true);
  }, [editor, editable]);

  const handleContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const anchor = closestWikiPageAnchor(event.target);
    if (!anchor) return;
    const wikiPageId = getWikiPageIdFromAnchor(anchor);
    if (wikiPageId === null) return;
    event.preventDefault();
    const target = standalone ? withStandaloneView(`/wiki/${wikiPageId}`) : `/wiki/${wikiPageId}`;
    if (onBeforeNavigate) {
      // Persist any pending auto-save before navigating. A false result means the
      // host intentionally kept the user on the current page.
      void Promise.resolve(onBeforeNavigate()).then((approved) => {
        if (approved !== false) {
          navigate(target);
        }
      });
      return;
    }
    navigate(target);
  };

  if (!editor) {
    return null;
  }

  return (
    <div
      className={cn(
        fill ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "overflow-clip",
        "rounded-md border bg-white shadow-sm transition-colors",
        editable === false
          ? "border-transparent shadow-none"
          : hasFocus
            ? "border-steel-600 ring-2 ring-steel-700/10"
            : "border-line"
      )}
      data-testid={testIdPrefix ? `${testIdPrefix}-editor` : undefined}
      onClick={handleContainerClick}
    >
      {toolbar !== "none" ? (
        <div className={cn("sticky top-0 z-10 border-b border-line bg-white", editable === false ? "invisible pointer-events-none" : undefined)}>
          <RichTextToolbar editor={editor} variant={toolbar} focused={hasFocus} onImageUpload={onImageUpload} imageUploading={imageUploadCount > 0} wikiPages={wikiPages} exportTitle={exportTitle} />
        </div>
      ) : null}
      <EditorContent editor={editor} className={fill ? "flex min-h-0 flex-1 flex-col overflow-y-auto [&_.ProseMirror]:min-h-full [&_.ProseMirror]:flex-1" : undefined} />
    </div>
  );
}

function RichTextToolbar({ editor, variant, focused, onImageUpload, imageUploading, wikiPages, exportTitle }: { editor: Editor; variant: Exclude<RichTextToolbarVariant, "none">; focused: boolean; onImageUpload?: ImageUploadHandler; imageUploading: boolean; wikiPages?: Array<{ id: number; title: string }>; exportTitle?: string }) {
  const showFullToolbar = variant === "full";
  const [pickerUploading, setPickerUploading] = useState(false);
  const [, setToolbarVersion] = useState(0);
  const [wikiPickerOpen, setWikiPickerOpen] = useState(false);
  const [wikiFilter, setWikiFilter] = useState("");
  const wikiPickerRef = React.useRef<HTMLDivElement>(null);
  const [exportPickerOpen, setExportPickerOpen] = useState(false);
  const exportPickerRef = React.useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const hasTextSelection = !editor.state.selection.empty;
  const [copied, setCopied] = useState(false);

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(editor.getHTML());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast({ tone: "error", title: "Kopieren fehlgeschlagen" });
    }
  };

  React.useEffect(() => {
    if (!wikiPickerOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (wikiPickerRef.current && !wikiPickerRef.current.contains(e.target as Node)) {
        setWikiPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [wikiPickerOpen]);

  React.useEffect(() => {
    if (!exportPickerOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (exportPickerRef.current && !exportPickerRef.current.contains(e.target as Node)) {
        setExportPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [exportPickerOpen]);

  const handleExport = (format: RichTextExportFormat) => {
    try {
      const fileName = exportRichTextDocument({ html: editor.getHTML(), title: exportTitle, format });
      setExportPickerOpen(false);
      showToast({ tone: "success", title: "Datei exportiert", message: fileName });
    } catch (exportError) {
      showToast({ tone: "error", title: "Export fehlgeschlagen", message: errorMessage(exportError) });
    }
  };

  useEffect(() => {
    const refreshToolbarState = () => setToolbarVersion((version) => version + 1);
    editor.on("selectionUpdate", refreshToolbarState);
    editor.on("transaction", refreshToolbarState);
    return () => {
      editor.off("selectionUpdate", refreshToolbarState);
      editor.off("transaction", refreshToolbarState);
    };
  }, [editor]);

  return (
    <div data-testid="rich-text-toolbar" className={cn("flex flex-wrap items-center gap-1 rounded-t-md border-b border-line bg-shell p-1.5 transition-opacity", (focused || wikiPickerOpen) ? "opacity-100" : "opacity-60")}>
      {!showFullToolbar ? (
        <>
          <ToolbarButton onClick={() => unsetSelectionHighlight(editor)} active={false} disabled={!hasTextSelection} title="Hervorhebungen entfernen" icon={<RemoveFormatting />} />
          <Separator />
        </>
      ) : null}
      <ToolbarButton onClick={() => toggleSelectionMark(editor, "bold")} active={editor.isActive("bold")} title="Fett" icon={<Bold />} />
      <ToolbarButton onClick={() => toggleSelectionMark(editor, "italic")} active={editor.isActive("italic")} title="Kursiv" icon={<Italic />} />
      <ToolbarButton onClick={() => toggleSelectionMark(editor, "underline")} active={editor.isActive("underline")} title="Unterstrichen" icon={<UnderlineIcon />} />
      <ToolbarButton onClick={() => toggleSelectionMark(editor, "strike")} active={editor.isActive("strike")} title="Durchgestrichen" icon={<Strikethrough />} />
      <ToolbarButton onClick={() => toggleSelectionHighlight(editor)} active={hasTextSelection && editor.isActive("highlight")} disabled={!hasTextSelection} title="Hervorheben" icon={<Highlighter />} />
      <Separator />
      <ToolbarButton onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph")} title="Absatz" icon={<Text />} />
      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Aufzählung" icon={<List />} />
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Nummerierte Liste" icon={<ListOrdered />} />

      {showFullToolbar ? (
        <>
          <Separator />
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Überschrift 1" icon={<Heading1 />} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Überschrift 2" icon={<Heading2 />} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Überschrift 3" icon={<Heading3 />} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} active={editor.isActive("heading", { level: 4 })} title="Überschrift 4" icon={<Heading4 />} />
          <Separator />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Zitat" icon={<Quote />} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Codeblock" icon={<Code2 />} />
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Trennlinie" icon={<Minus />} />
          <ToolbarButton onClick={() => editor.chain().focus().insertColumnBlock().run()} active={editor.isActive("columnBlock")} title="Spalten" icon={<Columns2 />} />
          <ToolbarButton onClick={() => setLink(editor)} active={editor.isActive("link")} title="Link" icon={<LinkIcon />} />
          <ToolbarButton onClick={() => handleImageInsert(editor, onImageUpload, setPickerUploading, showToast)} active={false} disabled={imageUploading || pickerUploading || !onImageUpload} title="Bild" icon={imageUploading || pickerUploading ? <Loader2 /> : <ImageIcon />} />
          {wikiPages && wikiPages.length > 0 ? (
            <div className="relative" ref={wikiPickerRef}>
              <ToolbarButton
                onClick={() => { setWikiPickerOpen((open) => !open); setWikiFilter(""); }}
                active={wikiPickerOpen}
                title="Wiki-Seiten-Link"
                icon={<FileText />}
              />
              {wikiPickerOpen ? (
                <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border border-line bg-white shadow-md">
                  <div className="border-b border-line p-1.5">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Seite suchen…"
                      value={wikiFilter}
                      onChange={(e) => setWikiFilter(e.target.value)}
                      className="w-full rounded border border-line px-2 py-1 text-xs outline-none focus:border-teal"
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  <ul className="max-h-48 overflow-y-auto py-1">
                    {wikiPages
                      .filter((p) => p.title.toLowerCase().includes(wikiFilter.toLowerCase()))
                      .map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-1.5 text-left text-xs text-ink hover:bg-shell"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              if (editor.state.selection.empty) {
                                editor.chain().focus().insertContent({
                                  type: 'text',
                                  text: p.title,
                                  marks: [{ type: 'link', attrs: wikiPageLinkAttrs(p.id) }],
                                }).run();
                              } else {
                                editor.chain().focus().setLink(wikiPageLinkAttrs(p.id)).run();
                              }
                              setWikiPickerOpen(false);
                            }}
                          >
                            {p.title}
                          </button>
                        </li>
                      ))}
                    {wikiPages.filter((p) => p.title.toLowerCase().includes(wikiFilter.toLowerCase())).length === 0 ? (
                      <li className="px-3 py-2 text-xs text-steel-500">Keine Treffer</li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
          <Separator />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Links" icon={<AlignLeft />} />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Mitte" icon={<AlignCenter />} />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Rechts" icon={<AlignRight />} />
          <Separator />
          <ToolbarButton onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} active={false} title="Formatierung entfernen" icon={<RemoveFormatting />} />
          <ToolbarButton onClick={() => editor.chain().focus().insertContent({ type: "tldraw", attrs: { snapshot: "" } }).run()} active={false} title="Zeichnung einfügen" icon={<PenLine />} />
          <Separator />
          <ToolbarButton onClick={() => void handleCopyHtml()} active={copied} title={copied ? "Kopiert" : "HTML kopieren"} icon={copied ? <Check /> : <Copy />} />
        </>
      ) : null}
      <Separator />
      <div className="relative" ref={exportPickerRef}>
        <ToolbarButton
          onClick={() => setExportPickerOpen((open) => !open)}
          active={exportPickerOpen}
          title="Als Datei exportieren"
          icon={<Download />}
        />
        {exportPickerOpen ? (
          <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-md border border-line bg-white py-1 shadow-md">
            {([
              ["docx", "DOCX"],
              ["pdf", "PDF"],
              ["markdown", "Markdown"],
            ] as Array<[RichTextExportFormat, string]>).map(([format, label]) => (
              <button
                key={format}
                type="button"
                className="w-full px-3 py-1.5 text-left text-xs font-medium text-ink hover:bg-shell"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleExport(format)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// posAtDOM(element, offset) treats offset as a child index, not a character offset.
// When ProseMirror re-renders the DOM selection it often places endpoints on parent
// element nodes (e.g. <p offset=1>) instead of text nodes. Resolve such containers
// by walking into the actual text descendant before delegating to posAtDOM.
function resolveEditorPos(editor: Editor, node: globalThis.Node, offset: number, toEnd: boolean): number {
  if (node.nodeType === Node.TEXT_NODE) {
    return editor.view.posAtDOM(node, offset);
  }
  const el = node as Element;
  if (toEnd && offset > 0) {
    const child = el.childNodes[offset - 1];
    if (!child) return editor.view.posAtDOM(node, offset);
    const childEnd = child.nodeType === Node.TEXT_NODE ? (child as Text).length : (child as Element).childNodes.length;
    return resolveEditorPos(editor, child, childEnd, true);
  }
  if (!toEnd && offset < el.childNodes.length) {
    const child = el.childNodes[offset];
    if (!child) return editor.view.posAtDOM(node, offset);
    return resolveEditorPos(editor, child, 0, false);
  }
  return editor.view.posAtDOM(node, offset);
}

function getSelectionRange(editor: Editor): { from: number; to: number } | null {
  const domSel = window.getSelection();
  if (domSel && !domSel.isCollapsed && domSel.rangeCount > 0) {
    const domRange = domSel.getRangeAt(0);
    try {
      const from = resolveEditorPos(editor, domRange.startContainer, domRange.startOffset, false);
      const to = resolveEditorPos(editor, domRange.endContainer, domRange.endOffset, true);
      const lo = Math.min(from, to);
      const hi = Math.max(from, to);
      if (hi > lo) return { from: lo, to: hi };
    } catch {
      // fall through to state-based fallback
    }
  }
  const { from, to, empty } = editor.state.selection;
  if (empty) return null;
  return { from, to };
}

// Toolbar marks must follow the visible DOM selection, not editor.state.selection,
// which can be stale after a toolbar interaction and otherwise spreads the mark
// across the whole block. Mirrors the highlight handler's range-based approach.
function toggleSelectionMark(editor: Editor, markName: string) {
  const range = getSelectionRange(editor);
  if (!range) {
    editor.chain().focus().toggleMark(markName).run();
    return;
  }

  const markType = editor.state.schema.marks[markName];
  if (!markType) return;

  const hasMark = editor.state.doc.rangeHasMark(range.from, range.to, markType);
  const transaction = hasMark
    ? editor.state.tr.removeMark(range.from, range.to, markType)
    : editor.state.tr.addMark(range.from, range.to, markType.create());
  editor.view.dispatch(transaction);
}

function toggleSelectionHighlight(editor: Editor) {
  const range = getSelectionRange(editor);
  if (!range) return;

  const highlightType = editor.state.schema.marks.highlight;
  if (!highlightType) return;

  const hasHighlight = editor.state.doc.rangeHasMark(range.from, range.to, highlightType);
  if (hasHighlight) {
    editor.view.dispatch(editor.state.tr.removeMark(range.from, range.to, highlightType));
  } else {
    editor.view.dispatch(editor.state.tr.addMark(range.from, range.to, highlightType.create({ color: "#fff3bf" })));
  }
}

function unsetSelectionHighlight(editor: Editor) {
  const range = getSelectionRange(editor);
  if (!range) return;

  const highlightType = editor.state.schema.marks.highlight;
  if (!highlightType) return;

  editor.view.dispatch(editor.state.tr.removeMark(range.from, range.to, highlightType));
}

function setLink(editor: Editor) {
  const currentHref = editor.getAttributes("link").href as string | undefined;
  const url = window.prompt("URL", currentHref ?? "");

  if (url === null) {
    return;
  }

  if (url.trim() === "") {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }

  editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
}

function handleImageInsert(editor: Editor, onImageUpload: ImageUploadHandler | undefined, setUploading: (uploading: boolean) => void, showToast: ReturnType<typeof useToast>["showToast"]) {
  if (!onImageUpload) {
    showToast({ tone: "error", title: "Bild-Upload ist nicht verfügbar" });
    return;
  }

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    void onImageUpload(file)
      .then((url) => {
        editor.chain().focus().setImage({ src: url }).run();
      })
      .catch((uploadError) => {
        showToast({ tone: "error", title: "Bild konnte nicht hochgeladen werden", message: errorMessage(uploadError) });
      })
      .finally(() => setUploading(false));
  };
  input.click();
}

function ToolbarButton({ onClick, active, title, icon, disabled = false }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn("flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50", active ? "bg-steel-700 text-white" : "text-steel-500 hover:bg-line/50 hover:text-ink")}
    >
      {React.cloneElement(icon, { className: cn("h-3.5 w-3.5", icon.type === Loader2 && "animate-spin") })}
    </button>
  );
}

function Separator() {
  return <div className="mx-0.5 h-5 w-px bg-line" />;
}
