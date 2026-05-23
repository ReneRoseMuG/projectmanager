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
// components/ui/CommentThread.tsx                 | comment.body readOnly    | comment-thread-comment-${comment.id}-body
// components/ui/CommentThread.tsx                 | draft body               | comment-thread-body
// components/usecases/UseCaseForm.tsx             | description              | use-case-description
// components/usecases/UseCaseForm.tsx             | content                  | use-case-content
// components/wiki/WikiPageDetail.tsx              | content                  | wiki-page-detail-content
// components/wiki/WikiPageForm.tsx                | content                  | wiki-page-form-content

import type { Editor } from "@tiptap/core";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
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
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImageIcon,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Loader2,
  PenLine,
  Pencil,
  Quote,
  RemoveFormatting,
  Strikethrough,
  Text,
  Underline as UnderlineIcon
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Markdown } from "tiptap-markdown";
import { errorMessage } from "../../hooks/errors";
import { hasVisibleHtmlContent } from "../../lib/html-utils";
import { useToast } from "./ToastProvider";
import { TldrawNode } from "./tldraw-node";

interface RichTextInlineFieldProps {
  /** Current HTML value for the controlled field. */
  value: string | null | undefined;
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
  /** Additional classes for the outer container. */
  className?: string;
  /** Unique prefix for data-testid attributes at each usage site. */
  testIdPrefix?: string;
  /** Optional image upload handler for clipboard images and toolbar file picker. */
  onImageUpload?: (file: File) => Promise<string>;
}

interface RichTextInlineEditorProps {
  value: string;
  originalValue: string;
  placeholder?: string;
  minRows?: number;
  toolbar: RichTextToolbarVariant;
  clickPosition: ClickPosition | null;
  testIdPrefix?: string;
  onImageUpload?: (file: File) => Promise<string>;
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

interface ClickPosition {
  left: number;
  top: number;
}

const IMAGE_UPLOAD_PLACEHOLDER = "[Bild wird hochgeladen...]";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function RichTextInlineField({ value, onChange, placeholder, minRows, toolbar = "full", readOnly = false, className = "", testIdPrefix, onImageUpload }: RichTextInlineFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [originalValue, setOriginalValue] = useState("");
  const [clickPosition, setClickPosition] = useState<ClickPosition | null>(null);
  const hasContent = hasVisibleHtmlContent(value);
  const minRowsStyle = useMemo(() => (minRows ? ({ "--rich-text-field-min-rows": minRows } as React.CSSProperties) : undefined), [minRows]);
  const minRowsClassName = minRows ? "rich-text-inline-min-rows" : "";
  const fieldChromeClassName = readOnly ? "" : "border border-line bg-shell/70 shadow-sm";
  const fieldHoverClassName = !readOnly && "cursor-text hover:border-steel-300 hover:bg-white";

  const handleActivate = (event: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) {
      return;
    }

    setOriginalValue(value ?? "");
    setClickPosition({ left: event.clientX, top: event.clientY });
    setIsEditing(true);
  };

  const handleCommit = (html: string) => {
    setIsEditing(false);
    setClickPosition(null);
    onChange(html);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setClickPosition(null);
    onChange(originalValue);
  };

  return (
    <div className={cn("relative group", className)}>
      {isEditing ? (
        <RichTextInlineEditor
          value={value ?? ""}
          originalValue={originalValue}
          placeholder={placeholder}
          minRows={minRows}
          toolbar={toolbar}
          clickPosition={clickPosition}
          testIdPrefix={testIdPrefix}
          onImageUpload={onImageUpload}
          onCommit={handleCommit}
          onCancel={handleCancel}
        />
      ) : hasContent ? (
        <div
          className={cn(
            "rich-text-surface max-w-none rounded-md px-3 py-2 text-sm leading-relaxed transition-colors [&_li]:mb-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4",
            minRowsClassName,
            fieldChromeClassName,
            fieldHoverClassName
          )}
          data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined}
          style={minRowsStyle}
          onClick={readOnly ? undefined : handleActivate}
          dangerouslySetInnerHTML={{ __html: value ?? "" }}
        />
      ) : (
        <div
          className={cn("rounded-md px-3 py-2 text-sm italic text-steel-500 transition-colors", minRowsClassName, fieldChromeClassName, fieldHoverClassName)}
          data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined}
          style={minRowsStyle}
          onClick={readOnly ? undefined : handleActivate}
        >
          {placeholder}
        </div>
      )}

      {!readOnly && !isEditing ? (
        <div className="pointer-events-none absolute right-1 top-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Pencil className="h-3 w-3 text-steel-500" />
        </div>
      ) : null}
    </div>
  );
}

function RichTextInlineEditor({ value, originalValue, placeholder, minRows, toolbar, clickPosition, testIdPrefix, onImageUpload, onCommit, onCancel }: RichTextInlineEditorProps) {
  const cancellingRef = useRef(false);
  const [imageUploadCount, setImageUploadCount] = useState(0);
  const { showToast } = useToast();
  const editorAttributes = useMemo(() => {
    const attributes: Record<string, string> = {
      class: cn("rich-text-surface max-w-none", Boolean(minRows) && "rich-text-inline-min-rows")
    };

    if (minRows) {
      attributes.style = `--rich-text-field-min-rows: ${minRows};`;
    }

    return attributes;
  }, [minRows]);
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] }
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      TldrawNode,
      Markdown.configure({ html: true }),
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
    editorProps: {
      attributes: editorAttributes,
      transformPastedText(text: string): string {
        return text.replace(/\n{3,}/g, "\n\n");
      },
      handlePaste(view, event): boolean {
        if (!onImageUpload) {
          return false;
        }

        const imageItem = Array.from(event.clipboardData?.items ?? []).find((item) => item.type.startsWith("image/"));
        if (!imageItem) {
          return false;
        }

        const file = imageItem.getAsFile();
        if (!file) {
          return false;
        }

        event.preventDefault();
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
    onBlur: ({ editor: activeEditor }: { editor: Editor }) => {
      if (cancellingRef.current) {
        cancellingRef.current = false;
        onCancel();
        return;
      }

      onCommit(activeEditor.getHTML());
    }
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      if (clickPosition) {
        const position = editor.view.posAtCoords(clickPosition);
        if (position) {
          editor.commands.setTextSelection(position.pos);
          editor.commands.focus();
          return;
        }
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

  if (!editor) {
    return null;
  }

  return (
    <div className="overflow-clip rounded-md border border-steel-600 bg-white shadow-sm ring-2 ring-steel-700/10" data-testid={testIdPrefix ? `${testIdPrefix}-editor` : undefined}>
      {toolbar !== "none" ? <RichTextToolbar editor={editor} variant={toolbar} onImageUpload={onImageUpload} imageUploading={imageUploadCount > 0} /> : null}
      <EditorContent editor={editor} />
    </div>
  );
}

function RichTextToolbar({ editor, variant, onImageUpload, imageUploading }: { editor: Editor; variant: Exclude<RichTextToolbarVariant, "none">; onImageUpload?: ImageUploadHandler; imageUploading: boolean }) {
  const showFullToolbar = variant === "full";
  const [pickerUploading, setPickerUploading] = useState(false);
  const { showToast } = useToast();

  return (
    <div data-testid="rich-text-toolbar" className="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-t-md border-b border-line bg-shell p-1.5">
      <ToolbarButton onClick={() => editor.chain().focus().unsetHighlight().run()} active={false} title="Hervorhebungen entfernen" icon={<RemoveFormatting />} />
      <Separator />
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Fett" icon={<Bold />} />
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Kursiv" icon={<Italic />} />
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Unterstrichen" icon={<UnderlineIcon />} />
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Durchgestrichen" icon={<Strikethrough />} />
      <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight({ color: "#fff3bf" }).run()} active={editor.isActive("highlight")} title="Hervorheben" icon={<Highlighter />} />
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
          <Separator />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Zitat" icon={<Quote />} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Codeblock" icon={<Code2 />} />
          <ToolbarButton onClick={() => setLink(editor)} active={editor.isActive("link")} title="Link" icon={<LinkIcon />} />
          <ToolbarButton onClick={() => handleImageInsert(editor, onImageUpload, setPickerUploading, showToast)} active={false} disabled={imageUploading || pickerUploading} title="Bild" icon={imageUploading || pickerUploading ? <Loader2 /> : <ImageIcon />} />
          <Separator />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Links" icon={<AlignLeft />} />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Mitte" icon={<AlignCenter />} />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Rechts" icon={<AlignRight />} />
          <Separator />
          <ToolbarButton onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} active={false} title="Formatierung entfernen" icon={<RemoveFormatting />} />
          <ToolbarButton onClick={() => editor.chain().focus().insertContent({ type: "tldraw", attrs: { snapshot: "" } }).run()} active={false} title="Zeichnung einfügen" icon={<PenLine />} />
        </>
      ) : null}
    </div>
  );
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
  if (onImageUpload) {
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
    return;
  }

  const src = window.prompt("Bild-URL");

  if (!src?.trim()) {
    return;
  }

  editor.chain().focus().setImage({ src: src.trim() }).run();
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
