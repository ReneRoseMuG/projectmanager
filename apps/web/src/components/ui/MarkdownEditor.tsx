import type { Editor } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading1, Heading2, Italic, List, ListOrdered, Redo2, Undo2 } from "lucide-react";
import { useEffect } from "react";
import { Markdown } from "tiptap-markdown";
import { Button } from "./Button";

interface MarkdownEditorProps {
  initialContent: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

interface MarkdownStorage {
  markdown: {
    getMarkdown: () => string;
  };
}

export function MarkdownEditor({ initialContent, onChange, placeholder = "Markdown", readOnly = false }: MarkdownEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
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
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor: activeEditor }: { editor: Editor }) => {
      const storage = activeEditor.storage as unknown as MarkdownStorage;
      onChange(storage.markdown.getMarkdown());
    },
    editorProps: {
      attributes: {
        class: "min-h-72 rounded-md border border-line bg-white p-4 text-sm leading-6 outline-none focus:border-teal"
      }
    }
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const storage = editor.storage as unknown as MarkdownStorage;
    if (storage.markdown.getMarkdown() !== initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  if (!editor) {
    return null;
  }

  return (
    <div className="grid gap-3">
      {!readOnly ? (
        <div className="flex flex-wrap gap-1 rounded-md border border-line bg-shell p-1">
          <Button title="Fett" aria-label="Fett" icon={<Bold size={16} />} variant={editor.isActive("bold") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleBold().run()} />
          <Button title="Kursiv" aria-label="Kursiv" icon={<Italic size={16} />} variant={editor.isActive("italic") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleItalic().run()} />
          <Button title="H1" aria-label="H1" icon={<Heading1 size={16} />} variant={editor.isActive("heading", { level: 1 }) ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
          <Button title="H2" aria-label="H2" icon={<Heading2 size={16} />} variant={editor.isActive("heading", { level: 2 }) ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
          <Button title="Liste" aria-label="Liste" icon={<List size={16} />} variant={editor.isActive("bulletList") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleBulletList().run()} />
          <Button title="Nummeriert" aria-label="Nummeriert" icon={<ListOrdered size={16} />} variant={editor.isActive("orderedList") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
          <Button title="Rückgängig" aria-label="Rückgängig" icon={<Undo2 size={16} />} variant="ghost" onClick={() => editor.chain().focus().undo().run()} />
          <Button title="Wiederholen" aria-label="Wiederholen" icon={<Redo2 size={16} />} variant="ghost" onClick={() => editor.chain().focus().redo().run()} />
        </div>
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}
