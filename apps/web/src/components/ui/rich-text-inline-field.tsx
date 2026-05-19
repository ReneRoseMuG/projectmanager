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
// components/tasks/TaskModal.tsx                  | description              | task-description
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
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { BubbleMenu, EditorContent, FloatingMenu, useEditor } from "@tiptap/react";
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
  Pencil,
  Quote,
  RemoveFormatting,
  Strikethrough,
  Text,
  Underline as UnderlineIcon
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Markdown } from "tiptap-markdown";
import { hasVisibleHtmlContent } from "../../lib/html-utils";

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
}

interface RichTextInlineEditorProps {
  value: string;
  originalValue: string;
  placeholder?: string;
  minRows?: number;
  toolbar: RichTextToolbarVariant;
  clickPosition: ClickPosition | null;
  testIdPrefix?: string;
  onCommit: (html: string) => void;
  onCancel: () => void;
}

interface ToolbarButtonProps {
  onClick: () => void;
  active: boolean;
  title: string;
  icon: React.ReactElement<{ className?: string }>;
}

type RichTextToolbarVariant = "full" | "minimal" | "none";

interface ClickPosition {
  left: number;
  top: number;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function RichTextInlineField({ value, onChange, placeholder, minRows, toolbar = "full", readOnly = false, className = "", testIdPrefix }: RichTextInlineFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [originalValue, setOriginalValue] = useState("");
  const [clickPosition, setClickPosition] = useState<ClickPosition | null>(null);
  const hasContent = hasVisibleHtmlContent(value);
  const minRowsStyle = useMemo(() => (minRows ? ({ "--rich-text-field-min-rows": minRows } as React.CSSProperties) : undefined), [minRows]);
  const minRowsClassName = minRows ? "rich-text-inline-min-rows" : "";

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
        <RichTextInlineEditor value={value ?? ""} originalValue={originalValue} placeholder={placeholder} minRows={minRows} toolbar={toolbar} clickPosition={clickPosition} testIdPrefix={testIdPrefix} onCommit={handleCommit} onCancel={handleCancel} />
      ) : hasContent ? (
        <div
          className={cn(
            "rich-text-surface max-w-none rounded-md px-3 py-2 text-sm leading-relaxed transition-colors [&_li]:mb-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4",
            minRowsClassName,
            !readOnly && "cursor-text hover:bg-shell/80"
          )}
          data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined}
          style={minRowsStyle}
          onClick={readOnly ? undefined : handleActivate}
          dangerouslySetInnerHTML={{ __html: value ?? "" }}
        />
      ) : (
        <div
          className={cn("rounded-md px-3 py-2 text-sm italic text-slate-500 transition-colors", minRowsClassName, !readOnly && "cursor-text hover:bg-shell/80")}
          data-testid={testIdPrefix ? `${testIdPrefix}-view` : undefined}
          style={minRowsStyle}
          onClick={readOnly ? undefined : handleActivate}
        >
          {placeholder}
        </div>
      )}

      {!readOnly && !isEditing ? (
        <div className="pointer-events-none absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Pencil className="h-3 w-3 text-slate-500" />
        </div>
      ) : null}
    </div>
  );
}

function RichTextInlineEditor({ value, originalValue, placeholder, minRows, toolbar, clickPosition, testIdPrefix, onCommit, onCancel }: RichTextInlineEditorProps) {
  const cancellingRef = useRef(false);
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
      attributes: editorAttributes
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
    <div className="rounded-md ring-1 ring-steel-600" data-testid={testIdPrefix ? `${testIdPrefix}-editor` : undefined}>
      {toolbar !== "none" ? <RichTextToolbar editor={editor} variant={toolbar} /> : null}
      <EditorContent editor={editor} />
      <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
        <div data-testid="bubble-menu" className="flex items-center gap-0.5 rounded-lg border border-line bg-white p-1 shadow-panel">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Fett" icon={<Bold />} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Kursiv" icon={<Italic />} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Unterstrichen" icon={<UnderlineIcon />} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Durchgestrichen" icon={<Strikethrough />} />
          <Separator />
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Überschrift 1" icon={<Heading1 />} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Überschrift 2" icon={<Heading2 />} />
          <Separator />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Aufzählung" icon={<List />} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Nummerierte Liste" icon={<ListOrdered />} />
          <Separator />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Links" icon={<AlignLeft />} />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Mitte" icon={<AlignCenter />} />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Rechts" icon={<AlignRight />} />
        </div>
      </BubbleMenu>
      <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }}>
        <div data-testid="floating-menu" className="flex items-center gap-0.5 rounded-lg border border-line bg-white p-1 shadow-panel">
          <ToolbarButton onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph")} title="Absatz" icon={<Text />} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Überschrift 1" icon={<Heading1 />} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Überschrift 2" icon={<Heading2 />} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Aufzählung" icon={<List />} />
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Nummeriert" icon={<ListOrdered />} />
        </div>
      </FloatingMenu>
    </div>
  );
}

function RichTextToolbar({ editor, variant }: { editor: Editor; variant: Exclude<RichTextToolbarVariant, "none"> }) {
  const showFullToolbar = variant === "full";

  return (
    <div data-testid="rich-text-toolbar" className="flex flex-wrap items-center gap-1 rounded-t-md border-b border-line bg-shell p-1.5">
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
          <ToolbarButton onClick={() => setImage(editor)} active={false} title="Bild" icon={<ImageIcon />} />
          <Separator />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Links" icon={<AlignLeft />} />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Mitte" icon={<AlignCenter />} />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Rechts" icon={<AlignRight />} />
          <Separator />
          <ToolbarButton onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} active={false} title="Formatierung entfernen" icon={<RemoveFormatting />} />
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

function setImage(editor: Editor) {
  const src = window.prompt("Bild-URL");

  if (!src?.trim()) {
    return;
  }

  editor.chain().focus().setImage({ src: src.trim() }).run();
}

function ToolbarButton({ onClick, active, title, icon }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={title}
      className={cn("flex h-7 w-7 items-center justify-center rounded transition-colors", active ? "bg-steel-700 text-white" : "text-slate-500 hover:bg-line/50 hover:text-ink")}
    >
      {React.cloneElement(icon, { className: "h-3.5 w-3.5" })}
    </button>
  );
}

function Separator() {
  return <div className="mx-0.5 h-5 w-px bg-line" />;
}
