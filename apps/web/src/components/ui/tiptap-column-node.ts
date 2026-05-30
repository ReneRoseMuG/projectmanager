import { mergeAttributes, Node } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columnBlock: {
      insertColumnBlock: () => ReturnType;
    };
  }
}

export const Column = Node.create({
  name: "column",
  group: "block",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "column", class: "rich-text-column" }), 0];
  }
});

export const ColumnBlock = Node.create({
  name: "columnBlock",
  group: "block",
  content: "column{2,4}",
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="column-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "column-block", class: "rich-text-column-block" }), 0];
  },

  addCommands() {
    return {
      insertColumnBlock:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            content: [
              { type: "column", content: [{ type: "paragraph" }] },
              { type: "column", content: [{ type: "paragraph" }] }
            ]
          })
    };
  }
});
