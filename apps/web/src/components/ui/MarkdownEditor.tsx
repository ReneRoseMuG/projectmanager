import type { Editor } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading1, Heading2, Italic, List, ListOrdered, Redo2, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
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

interface EditorStats {
  words: number;
  sections: number;
}

function getEditorStats(markdown: string): EditorStats {
  const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  const sections = markdown.split("\n").filter((line) => /^#{1,6}\s/.test(line.trim())).length;
  return { words, sections };
}

export function MarkdownEditor({ initialContent, onChange, placeholder = "Markdown", readOnly = false }: MarkdownEditorProps) {
  const [stats, setStats] = useState<EditorStats>(() => getEditorStats(initialContent));
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
      const markdown = storage.markdown.getMarkdown();
      setStats(getEditorStats(markdown));
      onChange(markdown);
    },
    editorProps: {
      attributes: {
        class: "prose prose-slate max-w-none min-h-[280px] px-5 py-5 text-sm leading-6 outline-none [&_code]:rounded [&_code]:bg-steel-100 [&_code]:px-1 [&_code]:py-0.5"
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
    setStats(getEditorStats(initialContent));
  }, [editor, initialContent]);

  if (!editor) {
    return null;
  }

  return (
    <div className="md-editor overflow-hidden rounded-xl border-[1.5px] border-line bg-white transition-colors focus-within:border-steel-600 focus-within:ring-4 focus-within:ring-steel-600/10">
      {!readOnly ? (
        <div className="flex flex-wrap gap-1 border-b border-line bg-steel-50 px-2 py-1.5">
          <div className="mr-1 flex gap-1 border-r border-line pr-1">
            <Button title="Fett" aria-label="Fett" className="h-8 w-8" icon={<Bold size={16} />} variant={editor.isActive("bold") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleBold().run()} />
            <Button title="Kursiv" aria-label="Kursiv" className="h-8 w-8" icon={<Italic size={16} />} variant={editor.isActive("italic") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleItalic().run()} />
          </div>
          <div className="mr-1 flex gap-1 border-r border-line pr-1">
            <Button title="H1" aria-label="H1" className="h-8 w-8" icon={<Heading1 size={16} />} variant={editor.isActive("heading", { level: 1 }) ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
            <Button title="H2" aria-label="H2" className="h-8 w-8" icon={<Heading2 size={16} />} variant={editor.isActive("heading", { level: 2 }) ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
          </div>
          <div className="mr-1 flex gap-1 border-r border-line pr-1">
            <Button title="Liste" aria-label="Liste" className="h-8 w-8" icon={<List size={16} />} variant={editor.isActive("bulletList") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleBulletList().run()} />
            <Button title="Nummeriert" aria-label="Nummeriert" className="h-8 w-8" icon={<ListOrdered size={16} />} variant={editor.isActive("orderedList") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
          </div>
          <div className="flex gap-1">
            <Button title="Rückgängig" aria-label="Rückgängig" className="h-8 w-8" icon={<Undo2 size={16} />} variant="ghost" onClick={() => editor.chain().focus().undo().run()} />
            <Button title="Wiederholen" aria-label="Wiederholen" className="h-8 w-8" icon={<Redo2 size={16} />} variant="ghost" onClick={() => editor.chain().focus().redo().run()} />
          </div>
        </div>
      ) : null}
      <EditorContent editor={editor} />
      <footer className="flex items-center justify-between border-t border-line bg-steel-50 px-3.5 py-2 text-[11px] font-semibold text-slate-500">
        <span>
          {stats.words} Wörter · {stats.sections} Abschnitte
        </span>
        <span>Markdown</span>
      </footer>
    </div>
  );
}
