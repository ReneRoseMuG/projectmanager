import type { Editor } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Code2, Heading2, Heading3, ImageIcon, Italic, LinkIcon, List, ListOrdered, Quote, Underline as UnderlineIcon } from "lucide-react";
import { useEffect } from "react";
import { Markdown } from "tiptap-markdown";
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
      extensions: [StarterKit, Underline, Link.configure({ openOnClick: false }), Image, Markdown.configure({ html: true }), Placeholder.configure({ placeholder })],
      content,
      editable: !readOnly,
      onUpdate: ({ editor: activeEditor }: { editor: Editor }) => {
        onChange(activeEditor.getHTML());
      },
      editorProps: {
        attributes: {
          class: "rich-text-surface max-w-none rounded-md border border-line bg-white p-4 outline-none focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10",
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
  const toolbarIconSize = 18;
  const toolbarButtonClassName = "h-10 w-10";

  return (
    <div className="grid gap-3">
      {!readOnly ? <div className="flex flex-wrap gap-1.5 rounded-md border border-line bg-shell p-1.5">
        <Button title="Fett" aria-label="Fett" className={toolbarButtonClassName} icon={<Bold size={toolbarIconSize} />} variant={editor.isActive("bold") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleBold().run()} />
        <Button title="Kursiv" aria-label="Kursiv" className={toolbarButtonClassName} icon={<Italic size={toolbarIconSize} />} variant={editor.isActive("italic") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleItalic().run()} />
        {showFullToolbar ? (
          <Button title="Unterstrichen" aria-label="Unterstrichen" className={toolbarButtonClassName} icon={<UnderlineIcon size={toolbarIconSize} />} variant={editor.isActive("underline") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleUnderline().run()} />
        ) : null}
        <Button title="Link" aria-label="Link" className={toolbarButtonClassName} icon={<LinkIcon size={toolbarIconSize} />} variant={editor.isActive("link") ? "primary" : "ghost"} onClick={setLink} />
        {showFullToolbar ? (
          <>
            <Button title="H2" aria-label="H2" className={toolbarButtonClassName} icon={<Heading2 size={toolbarIconSize} />} variant={editor.isActive("heading", { level: 2 }) ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
            <Button title="H3" aria-label="H3" className={toolbarButtonClassName} icon={<Heading3 size={toolbarIconSize} />} variant={editor.isActive("heading", { level: 3 }) ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
            <Button title="Liste" aria-label="Liste" className={toolbarButtonClassName} icon={<List size={toolbarIconSize} />} variant={editor.isActive("bulletList") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleBulletList().run()} />
            <Button title="Nummeriert" aria-label="Nummeriert" className={toolbarButtonClassName} icon={<ListOrdered size={toolbarIconSize} />} variant={editor.isActive("orderedList") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
            <Button title="Zitat" aria-label="Zitat" className={toolbarButtonClassName} icon={<Quote size={toolbarIconSize} />} variant={editor.isActive("blockquote") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
            <Button title="Code" aria-label="Code" className={toolbarButtonClassName} icon={<Code2 size={toolbarIconSize} />} variant={editor.isActive("codeBlock") ? "primary" : "ghost"} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
            <Button title="Bild" aria-label="Bild" className={toolbarButtonClassName} icon={<ImageIcon size={toolbarIconSize} />} variant="ghost" onClick={setImage} />
          </>
        ) : null}
      </div> : null}
      <EditorContent editor={editor} />
    </div>
  );
}
