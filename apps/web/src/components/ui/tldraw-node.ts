import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { TldrawNodeView } from "./TldrawNodeView";

export const TldrawNode = Node.create({
  name: "tldraw",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      snapshot: {
        default: "",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-snapshot") ?? "",
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-snapshot": typeof attributes.snapshot === "string" ? attributes.snapshot : ""
        })
      }
    };
  },

  parseHTML() {
    return [{ tag: "div[data-tldraw]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-tldraw": "" }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TldrawNodeView);
  }
});
