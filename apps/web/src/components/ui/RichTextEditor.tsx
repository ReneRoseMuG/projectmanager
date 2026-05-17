import type { Editor } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Code2, Heading2, Heading3, ImageIcon, Italic, LinkIcon, List, ListOrdered, Quote, Underline as UnderlineIcon } from "lucide-react";
import { useEffect } from "react";
import { Button } from "./Button";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  toolbar?: "full" | "minimal";
  readOnly?: boolean;
}

/** TipTap-based rich text editor that stores content as HTML. */
export function RichTextEditor({ content, onChange, placeholder = "", minHeight = "8rem", toolbar = "full", readOnly = false }: RichTextEditorProps) {
  const editor = useEditor(
    {
      extensions: [StarterKit, Underline, Link.configure({ openOnClick: false }), Image, Placeholder.configure({ placeholder })],
      content,
      editable: !readOnly,
      onUpdate: ({ editor: activeEditor }: { editor: Editor }) => {
        onChange(activeEditor.getHTML());
      },
      editorProps: {
        attributes: {
          class: "prose prose-sm max-w-none rounded-md border border-line bg-white p-4 outline-none focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10",
          style: `min-height: ${minHeight};`
        }
      }
    },
    [minHeight, placeholder, readOnly]
  );

  useEffect(() => {
    if (!editor) {
      return;
    }

    const current = editor.getHTML();
    if (current !== content && !(current === "<p></p>" && content === "")) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const currentHref = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", currentHref ?? "");

    if (url === null) {
      return;
    }

    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const setImage = () => {
    const src = window.prompt("Bild-URL");
    if (src) {
      editor.chain().focus().setImage({ src }).run();
    }
  };

  const showFullToolbar = toolbar === "full";

  return (
    <div className="grid gap-3">
      {!readOnly ? <div className="flex flex-wrap gap-1 rounded-md border border-line bg-shell p-1">
        <Button size="sm" title="Fett" aria-label="Fett" icon={<Bold size={16} />} variant={editor.isActive("bold") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleBold().run()} />
        <Button size="sm" title="Kursiv" aria-label="Kursiv" icon={<Italic size={16} />} variant={editor.isActive("italic") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleItalic().run()} />
        {showFullToolbar ? (
          <Button size="sm" title="Unterstrichen" aria-label="Unterstrichen" icon={<UnderlineIcon size={16} />} variant={editor.isActive("underline") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleUnderline().run()} />
        ) : null}
        <Button size="sm" title="Link" aria-label="Link" icon={<LinkIcon size={16} />} variant={editor.isActive("link") ? "primary" : "ghost"} onClick={setLink} />
        {showFullToolbar ? (
          <>
            <Button size="sm" title="H2" aria-label="H2" icon={<Heading2 size={16} />} variant={editor.isActive("heading", { level: 2 }) ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
            <Button size="sm" title="H3" aria-label="H3" icon={<Heading3 size={16} />} variant={editor.isActive("heading", { level: 3 }) ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
            <Button size="sm" title="Liste" aria-label="Liste" icon={<List size={16} />} variant={editor.isActive("bulletList") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleBulletList().run()} />
            <Button size="sm" title="Nummeriert" aria-label="Nummeriert" icon={<ListOrdered size={16} />} variant={editor.isActive("orderedList") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
            <Button size="sm" title="Zitat" aria-label="Zitat" icon={<Quote size={16} />} variant={editor.isActive("blockquote") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
            <Button size="sm" title="Code" aria-label="Code" icon={<Code2 size={16} />} variant={editor.isActive("codeBlock") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
            <Button size="sm" title="Bild" aria-label="Bild" icon={<ImageIcon size={16} />} variant="ghost" onClick={setImage} />
          </>
        ) : null}
      </div> : null}
      <EditorContent editor={editor} />
    </div>
  );
}
