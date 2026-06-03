import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { TiptapImageNodeView } from "./TiptapImageNodeView";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: { src: string; alt?: string; title?: string }) => ReturnType;
    };
  }
}

export type ImageFloat = "none" | "left" | "right";
export type ImageAlign = "left" | "center" | "right";

export const ResizableImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("src"),
        renderHTML: (attrs: Record<string, unknown>) => ({ src: attrs.src })
      },
      alt: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("alt"),
        renderHTML: (attrs: Record<string, unknown>) => (attrs.alt ? { alt: attrs.alt } : {})
      },
      title: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("title"),
        renderHTML: (attrs: Record<string, unknown>) => (attrs.title ? { title: attrs.title } : {})
      },
      width: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const styleWidth = el.style.width;
          if (styleWidth) {
            const match = styleWidth.match(/^(\d+)px$/);
            return match ? parseInt(match[1]!, 10) : null;
          }
          const attrWidth = el.getAttribute("width");
          return attrWidth ? parseInt(attrWidth, 10) : null;
        },
        renderHTML: () => ({})
      },
      float: {
        default: "none" as ImageFloat,
        parseHTML: (el: HTMLElement) => {
          if (el.classList.contains("tiptap-img-float-left")) return "left";
          if (el.classList.contains("tiptap-img-float-right")) return "right";
          return "none";
        },
        renderHTML: () => ({})
      },
      align: {
        default: "left" as ImageAlign,
        parseHTML: (el: HTMLElement) => {
          if (el.classList.contains("tiptap-img-center")) return "center";
          return "left";
        },
        renderHTML: () => ({})
      }
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, alt, title } = HTMLAttributes as {
      src: string;
      alt?: string;
      title?: string;
    };
    const width = node.attrs.width as number | null;
    const float = node.attrs.float as ImageFloat;
    const align = node.attrs.align as ImageAlign;

    const classes: string[] = ["tiptap-img"];
    if (float === "left") classes.push("tiptap-img-float-left");
    else if (float === "right") classes.push("tiptap-img-float-right");
    else if (align === "center") classes.push("tiptap-img-center");

    const attrs: Record<string, string> = {
      src: src ?? "",
      class: classes.join(" ")
    };
    if (alt) attrs.alt = alt;
    if (title) attrs.title = title;
    if (width) attrs.style = `width: ${width}px`;

    return ["img", mergeAttributes(attrs)];
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: options })
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(TiptapImageNodeView);
  }
});
