import type { JsonObject, JsonValue } from "@taskmanager/shared-types";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImageIcon,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Maximize2,
  Redo2,
  Strikethrough,
  Table2,
  Underline as UnderlineIcon,
  Undo2,
  Unlink
} from "lucide-react";
import { useEffect } from "react";
import { Markdown } from "tiptap-markdown";
import { Button } from "./Button";

interface RichTextEditorProps {
  value?: JsonObject;
  markdown?: string;
  placeholder?: string;
  fullscreen?: boolean;
  onChange?: (value: JsonObject) => void;
  onMarkdownChange?: (value: string) => void;
  onFullscreenChange?: (value: boolean) => void;
}

type EditorJsonContent = {
  type?: string;
  attrs?: Record<string, JsonValue>;
  content?: EditorJsonContent[];
  marks?: EditorJsonContent[];
  text?: string;
};

interface MarkdownStorage {
  markdown: {
    getMarkdown: () => string;
  };
}

const emptyDoc: EditorJsonContent = {
  type: "doc",
  content: [{ type: "paragraph" }]
};

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toContent(value: JsonObject): EditorJsonContent {
  return isRecord(value) && typeof value.type === "string" ? (value as unknown as EditorJsonContent) : emptyDoc;
}

function getMarkdown(editor: { storage: unknown }) {
  const storage = editor.storage as MarkdownStorage;
  return storage.markdown.getMarkdown();
}

export function RichTextEditor({ value, markdown, placeholder = "Notiz", fullscreen = false, onChange, onMarkdownChange, onFullscreenChange }: RichTextEditorProps) {
  const usesMarkdown = markdown !== undefined;
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image,
      Link.configure({ openOnClick: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({ placeholder }),
      Color,
      TextStyle,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: "-",
        linkify: true,
        breaks: false,
        transformPastedText: true,
        transformCopiedText: true
      })
    ],
    content: usesMarkdown ? markdown : toContent(value ?? {}),
    onUpdate: ({ editor: activeEditor }: { editor: { getJSON: () => unknown; storage: unknown } }) => {
      onChange?.(activeEditor.getJSON() as JsonObject);
      onMarkdownChange?.(getMarkdown(activeEditor));
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none rounded-md border border-line bg-white p-4"
      }
    }
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    if (usesMarkdown) {
      if (getMarkdown(editor) !== markdown) {
        editor.commands.setContent(markdown ?? "");
      }
      return;
    }
    const next = toContent(value ?? {});
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(next)) {
      editor.commands.setContent(next);
    }
  }, [editor, markdown, usesMarkdown, value]);

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const url = window.prompt("URL");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  const setImage = () => {
    const src = window.prompt("Bild-URL");
    if (src) {
      editor.chain().focus().setImage({ src }).run();
    }
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-1 rounded-md border border-line bg-shell p-1">
        <Button title="Fett" aria-label="Fett" icon={<Bold size={16} />} variant={editor.isActive("bold") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleBold().run()} />
        <Button title="Kursiv" aria-label="Kursiv" icon={<Italic size={16} />} variant={editor.isActive("italic") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <Button title="Unterstrichen" aria-label="Unterstrichen" icon={<UnderlineIcon size={16} />} variant={editor.isActive("underline") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleUnderline().run()} />
        <Button title="Durchgestrichen" aria-label="Durchgestrichen" icon={<Strikethrough size={16} />} variant={editor.isActive("strike") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleStrike().run()} />
        <Button title="H1" aria-label="H1" icon={<Heading1 size={16} />} variant={editor.isActive("heading", { level: 1 }) ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
        <Button title="H2" aria-label="H2" icon={<Heading2 size={16} />} variant={editor.isActive("heading", { level: 2 }) ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <Button title="H3" aria-label="H3" icon={<Heading3 size={16} />} variant={editor.isActive("heading", { level: 3 }) ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
        <Button title="Liste" aria-label="Liste" icon={<List size={16} />} variant={editor.isActive("bulletList") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <Button title="Nummeriert" aria-label="Nummeriert" icon={<ListOrdered size={16} />} variant={editor.isActive("orderedList") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        <Button title="Checkliste" aria-label="Checkliste" icon={<CheckSquare size={16} />} variant={editor.isActive("taskList") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleTaskList().run()} />
        <Button title="Tabelle" aria-label="Tabelle" icon={<Table2 size={16} />} variant="ghost" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
        <Button title="Link" aria-label="Link" icon={<LinkIcon size={16} />} variant={editor.isActive("link") ? "primary" : "ghost"} onClick={setLink} />
        <Button title="Link entfernen" aria-label="Link entfernen" icon={<Unlink size={16} />} variant="ghost" onClick={() => editor.chain().focus().unsetLink().run()} />
        <Button title="Bild" aria-label="Bild" icon={<ImageIcon size={16} />} variant="ghost" onClick={setImage} />
        <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md hover:bg-line/50" title="Textfarbe">
          <span className="sr-only">Textfarbe</span>
          <input className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0" type="color" onInput={(event) => editor.chain().focus().setColor(event.currentTarget.value).run()} />
        </label>
        <Button title="Markieren" aria-label="Markieren" icon={<Highlighter size={16} />} variant="ghost" onClick={() => editor.chain().focus().toggleHighlight({ color: "#ffe08a" }).run()} />
        <Button title="Rückgängig" aria-label="Rückgängig" icon={<Undo2 size={16} />} variant="ghost" onClick={() => editor.chain().focus().undo().run()} />
        <Button title="Wiederholen" aria-label="Wiederholen" icon={<Redo2 size={16} />} variant="ghost" onClick={() => editor.chain().focus().redo().run()} />
        {onFullscreenChange ? (
          <Button
            title="Vollbild"
            aria-label="Vollbild"
            icon={<Maximize2 size={16} />}
            variant={fullscreen ? "primary" : "ghost"}
            onClick={() => onFullscreenChange(!fullscreen)}
          />
        ) : null}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
