// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - RichTextInlineField rendert HTML-Leseansicht, Placeholder, readOnly und Edit-Zustand.
 * - Markdown-Werte werden beim Öffnen roh an den Editor gegeben und als Editor-HTML committed.
 * - Legacy-Markdown wird im Live-Update-Modus direkt als Editor-HTML in den Formular-State übernommen.
 * - Eingefügter Markdown-Plain-Text wird zentral durch die Markdown-Extension in HTML konvertiert.
 * - Bilder können nur über einen expliziten Upload-Handler eingefügt werden.
 * - Im Edit-Zustand wird nur die feste Toolbar gerendert, keine zusätzliche Auswahl- oder Floating-Bar.
 * - TipTap wird im Test gemockt, die Leseansicht wird real gerendert.
 *
 * Fehlerfälle:
 * - Leere HTML-Tags müssen als leer gelten.
 * - Escape muss den ursprünglichen Wert übernehmen.
 *
 * Ziel:
 * Die Inline-Rich-Text-Basiskomponente gegen Regressionsfehler bei Anzeige und State-Übergängen absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { act, cleanup, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RichTextInlineField } from "../../../../../apps/web/src/components/ui/rich-text-inline-field";
import { ToastProvider } from "../../../../../apps/web/src/components/ui/ToastProvider";

interface MockEditor {
  getHTML: ReturnType<typeof vi.fn<[], string>>;
  getAttributes: ReturnType<typeof vi.fn<[string], Record<string, string | undefined>>>;
  setEditable: ReturnType<typeof vi.fn<[boolean], void>>;
  commands: {
    setContent: ReturnType<typeof vi.fn<[string, { emitUpdate?: boolean }?], void>>;
    blur: ReturnType<typeof vi.fn<[], void>>;
    focus: ReturnType<typeof vi.fn<[string?], void>>;
    setTextSelection: ReturnType<typeof vi.fn<[number], void>>;
  };
  isActive: ReturnType<typeof vi.fn<[(string | Record<string, string>)?, Record<string, unknown>?], boolean>>;
  chain: ReturnType<typeof vi.fn<[], MockCommandChain>>;
  on: ReturnType<typeof vi.fn<[string, () => void], void>>;
  off: ReturnType<typeof vi.fn<[string, () => void], void>>;
  state: {
    selection: { empty: boolean; from: number; to: number };
  };
  view: {
    posAtCoords: ReturnType<typeof vi.fn<[{ left: number; top: number }], { pos: number } | null>>;
  };
}

interface MockCommandChain {
  focus: () => MockCommandChain;
  selectAll: () => MockCommandChain;
  toggleBold: () => MockCommandChain;
  toggleItalic: () => MockCommandChain;
  toggleUnderline: () => MockCommandChain;
  toggleStrike: () => MockCommandChain;
  toggleHighlight: () => MockCommandChain;
  toggleHeading: () => MockCommandChain;
  toggleBulletList: () => MockCommandChain;
  toggleOrderedList: () => MockCommandChain;
  toggleBlockquote: () => MockCommandChain;
  toggleCodeBlock: () => MockCommandChain;
  setHorizontalRule: () => MockCommandChain;
  insertColumnBlock: () => MockCommandChain;
  extendMarkRange: () => MockCommandChain;
  unsetLink: () => MockCommandChain;
  setLink: () => MockCommandChain;
  unsetColor: () => MockCommandChain;
  unsetMark: (name: string) => MockCommandChain;
  setImage: (attrs?: Record<string, string>) => MockCommandChain;
  setTextAlign: () => MockCommandChain;
  setTextSelection: (selection: { from: number; to: number }) => MockCommandChain;
  unsetHighlight: () => MockCommandChain;
  setParagraph: () => MockCommandChain;
  unsetAllMarks: () => MockCommandChain;
  clearNodes: () => MockCommandChain;
  insertContent: (content: unknown) => MockCommandChain;
  run: () => boolean;
}

interface MockPasteTransaction {
  insertText: ReturnType<typeof vi.fn<[string], MockPasteTransaction>>;
  delete: ReturnType<typeof vi.fn<[number, number], MockPasteTransaction>>;
  insert: ReturnType<typeof vi.fn<[number, unknown], MockPasteTransaction>>;
}

interface MockPasteView {
  state: {
    selection: { from: number };
    tr: MockPasteTransaction;
    schema: {
      nodes: {
        image?: {
          create: ReturnType<typeof vi.fn<[Record<string, string>], unknown>>;
        };
      };
    };
  };
  dispatch: ReturnType<typeof vi.fn<[MockPasteTransaction], void>>;
}

interface MockTransaction {
  getMeta: ReturnType<typeof vi.fn<[string], boolean>>;
  selection: { from: number; to: number };
}

interface MockEditorConfig {
  content?: string;
  editorProps?: {
    attributes?: Record<string, string>;
    transformPastedText?: (text: string) => string;
    handlePaste?: (view: MockPasteView, event: ClipboardEvent) => boolean;
  };
  onTransaction?: (input: { editor: MockEditor; transaction: MockTransaction }) => void;
  onUpdate?: (input: { editor: MockEditor }) => void;
  onFocus?: (input: { editor: MockEditor }) => void;
  onBlur?: (input: { editor: MockEditor }) => void;
}

const navigateMock = vi.hoisted(() => vi.fn());

const tiptapMock = vi.hoisted(() => ({
  editor: undefined as MockEditor | undefined,
  config: undefined as MockEditorConfig | undefined,
  chain: undefined as MockCommandChain | undefined,
  markdownOptions: undefined as { html?: boolean; transformPastedText?: boolean } | undefined,
  html: "<p>mock content</p>"
}));

function createCommandChain(): MockCommandChain {
  const chain: MockCommandChain = {
    focus: vi.fn(() => chain),
    selectAll: vi.fn(() => chain),
    toggleBold: vi.fn(() => chain),
    toggleItalic: vi.fn(() => chain),
    toggleUnderline: vi.fn(() => chain),
    toggleStrike: vi.fn(() => chain),
    toggleHighlight: vi.fn(() => chain),
    toggleHeading: vi.fn(() => chain),
    toggleBulletList: vi.fn(() => chain),
    toggleOrderedList: vi.fn(() => chain),
    toggleBlockquote: vi.fn(() => chain),
    toggleCodeBlock: vi.fn(() => chain),
    setHorizontalRule: vi.fn(() => chain),
    insertColumnBlock: vi.fn(() => chain),
    extendMarkRange: vi.fn(() => chain),
    unsetLink: vi.fn(() => chain),
    setLink: vi.fn(() => chain),
    unsetColor: vi.fn(() => chain),
    unsetMark: vi.fn(() => chain),
    setImage: vi.fn(() => chain),
    setTextAlign: vi.fn(() => chain),
    setTextSelection: vi.fn(() => chain),
    unsetHighlight: vi.fn(() => chain),
    setParagraph: vi.fn(() => chain),
    unsetAllMarks: vi.fn(() => chain),
    clearNodes: vi.fn(() => chain),
    insertContent: vi.fn(() => chain),
    run: vi.fn(() => true)
  };

  tiptapMock.chain = chain;
  return chain;
}

function createPasteTransaction(): MockPasteTransaction {
  const tr: MockPasteTransaction = {
    insertText: vi.fn(() => tr),
    delete: vi.fn(() => tr),
    insert: vi.fn(() => tr)
  };
  return tr;
}

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useLocation: () => ({ search: "", pathname: "/", state: null, key: "default", hash: "" }),
}));

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn((config: MockEditorConfig) => {
    const editor: MockEditor = {
      getHTML: vi.fn(() => tiptapMock.html),
      getAttributes: vi.fn<[string], Record<string, string | undefined>>(() => ({})),
      setEditable: vi.fn(),
      commands: {
        setContent: vi.fn(),
        blur: vi.fn(() => {
          config.onBlur?.({ editor });
        }),
        focus: vi.fn(),
        setTextSelection: vi.fn()
      },
      isActive: vi.fn<[(string | Record<string, string>)?, Record<string, unknown>?], boolean>(() => false),
      chain: vi.fn(() => createCommandChain()),
      on: vi.fn(),
      off: vi.fn(),
      state: {
        selection: { empty: false, from: 2, to: 5 }
      },
      view: {
        posAtCoords: vi.fn((_coords: { left: number; top: number }): { pos: number } | null => ({ pos: 1 }))
      }
    };

    tiptapMock.editor = editor;
    tiptapMock.config = config;
    return editor;
  }),
  EditorContent: ({ editor }: { editor: MockEditor }) => <div data-testid="tiptap-editor-content" tabIndex={0} onFocus={() => tiptapMock.config?.onFocus?.({ editor })} onBlur={() => tiptapMock.config?.onBlur?.({ editor })} />
}));

vi.mock("../../../../../apps/web/src/components/ui/tldraw-node", () => ({
  TldrawNode: {
    name: "tldraw"
  }
}));

vi.mock("tiptap-markdown", () => ({
  Markdown: {
    configure: vi.fn((options: { html?: boolean; transformPastedText?: boolean }) => {
      tiptapMock.markdownOptions = options;
      return { name: "markdown", options };
    })
  }
}));

function renderWithProviders(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  tiptapMock.editor = undefined;
  tiptapMock.config = undefined;
  tiptapMock.chain = undefined;
  tiptapMock.markdownOptions = undefined;
  tiptapMock.html = "<p>mock content</p>";
});

describe("RichTextInlineField", () => {
  it("T-01 mountet den Editor sofort mit HTML-Inhalt", () => {
    renderWithProviders(<RichTextInlineField value="<p><strong>Hallo</strong></p>" onChange={vi.fn()} testIdPrefix="field" />);

    expect(screen.getByTestId("field-editor")).toBeInTheDocument();
    expect(tiptapMock.config?.content).toBe("<p><strong>Hallo</strong></p>");
  });

  it("T-01b mountet Markdown-Werte roh im Editor", () => {
    renderWithProviders(<RichTextInlineField value={"# Titel\n\n<script>alert(1)</script>"} valueFormat="markdown" onChange={vi.fn()} testIdPrefix="field" />);

    expect(screen.getByTestId("field-editor")).toBeInTheDocument();
    expect(tiptapMock.config?.content).toBe("# Titel\n\n<script>alert(1)</script>");
  });

  it("T-02 zeigt placeholder wenn value null ist", () => {
    renderWithProviders(<RichTextInlineField value={null} onChange={vi.fn()} placeholder="Text eingeben" testIdPrefix="field" />);

    expect(screen.getByTestId("field-editor")).toBeInTheDocument();
    expect(tiptapMock.config?.content).toBe("");
  });

  it("T-03 zeigt placeholder wenn value undefined ist", () => {
    renderWithProviders(<RichTextInlineField value={undefined} onChange={vi.fn()} placeholder="Text eingeben" testIdPrefix="field" />);

    expect(screen.getByTestId("field-editor")).toBeInTheDocument();
    expect(tiptapMock.config?.content).toBe("");
  });

  it("T-04 zeigt placeholder wenn value leer ist", () => {
    renderWithProviders(<RichTextInlineField value="" onChange={vi.fn()} placeholder="Text eingeben" testIdPrefix="field" />);

    expect(screen.getByTestId("field-editor")).toBeInTheDocument();
    expect(tiptapMock.config?.content).toBe("");
  });

  it("T-05 mountet auch leere HTML-Tags stabil im Editor", () => {
    renderWithProviders(<RichTextInlineField value="<p></p>" onChange={vi.fn()} placeholder="Text eingeben" testIdPrefix="field" />);

    expect(screen.getByTestId("field-editor")).toBeInTheDocument();
    expect(tiptapMock.config?.content).toBe("<p></p>");
  });

  it("T-06 rendert bei readOnly keinen Hover-Indikator", () => {
    const { container } = renderWithProviders(<RichTextInlineField value="<p>Lesen</p>" onChange={vi.fn()} readOnly testIdPrefix="field" />);

    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });

  it("T-07 aktiviert bei readOnly keinen Editor nach Click", () => {
    renderWithProviders(<RichTextInlineField value="<p>Lesen</p>" onChange={vi.fn()} readOnly testIdPrefix="field" />);

    fireEvent.click(screen.getByTestId("field-view"));

    expect(screen.queryByTestId("field-editor")).not.toBeInTheDocument();
  });

  it("T-08 hält den Editor direkt gemountet", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="field" />);

    expect(screen.getByTestId("field-editor")).toBeInTheDocument();
  });

  it("T-09 behält den stabilen View-Wrapper im DOM", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="field" />);

    fireEvent.click(screen.getByTestId("field-view"));

    expect(screen.getByTestId("field-view")).toBeInTheDocument();
  });

  it("T-10 ruft onChange bei Blur mit Editor-HTML auf", () => {
    const onChange = vi.fn();
    renderWithProviders(<RichTextInlineField value="<p>Alt</p>" onChange={onChange} testIdPrefix="field" />);

    fireEvent.click(screen.getByTestId("field-view"));
    expect(screen.getByTestId("tiptap-editor-content")).toBeInTheDocument();
    const activeEditor = tiptapMock.editor;
    if (activeEditor) {
      act(() => {
        tiptapMock.config?.onBlur?.({ editor: activeEditor });
      });
    }

    expect(onChange).toHaveBeenCalledWith("<p>mock content</p>");
  });

  it("T-10b öffnet Markdown-Werte roh im Editor und committed Editor-HTML", () => {
    const onChange = vi.fn();
    tiptapMock.html = "<h1>Titel</h1><p><strong>fett</strong></p>";
    renderWithProviders(<RichTextInlineField value={"# Titel\n\n**fett**"} valueFormat="markdown" onChange={onChange} testIdPrefix="field" />);

    fireEvent.click(screen.getByTestId("field-view"));
    expect(tiptapMock.config?.content).toBe("# Titel\n\n**fett**");
    const activeEditor = tiptapMock.editor;
    if (activeEditor) {
      act(() => {
        tiptapMock.config?.onBlur?.({ editor: activeEditor });
      });
    }

    expect(onChange).toHaveBeenCalledWith("<h1>Titel</h1><p><strong>fett</strong></p>");
  });

  it("T-11 ruft onChange bei Escape mit originalValue auf", () => {
    const onChange = vi.fn();
    tiptapMock.html = "<p>Original</p>";
    renderWithProviders(<RichTextInlineField value="<p>Original</p>" onChange={onChange} testIdPrefix="field" />);

    const activeEditor = tiptapMock.editor;
    if (activeEditor) {
      act(() => {
        tiptapMock.config?.onFocus?.({ editor: activeEditor });
      });
    }
    fireEvent.keyDown(window, { key: "Escape" });

    expect(onChange).toHaveBeenCalledWith("<p>Original</p>");
    expect(onChange).not.toHaveBeenCalledWith("<p>mock content</p>");
  });

  it("T-11b hält den Editor bei commitOnBlur=false offen und meldet Live-HTML", () => {
    const onChange = vi.fn();
    renderWithProviders(<RichTextInlineField value="<p>Original</p>" onChange={onChange} commitOnBlur={false} liveUpdate testIdPrefix="field" />);

    fireEvent.click(screen.getByTestId("field-view"));
    tiptapMock.html = "<p>Live</p>";
    const activeEditor = tiptapMock.editor;
    if (!activeEditor) {
      throw new Error("Editor mock was not created");
    }

    act(() => {
      tiptapMock.config?.onUpdate?.({ editor: activeEditor });
      tiptapMock.config?.onBlur?.({ editor: activeEditor });
    });

    expect(onChange).toHaveBeenCalledWith("<p>Live</p>");
    expect(screen.getByTestId("field-editor")).toBeInTheDocument();
  });

  it("T-11c übernimmt Legacy-Markdown bei liveUpdate direkt als Editor-HTML", async () => {
    const onChange = vi.fn();
    tiptapMock.html = "<h1>Titel</h1><p><strong>fett</strong></p>";
    renderWithProviders(<RichTextInlineField value={"# Titel\n\n**fett**"} valueFormat="markdown" onChange={onChange} commitOnBlur={false} liveUpdate testIdPrefix="field" />);

    fireEvent.click(screen.getByTestId("field-view"));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("<h1>Titel</h1><p><strong>fett</strong></p>"));
    expect(tiptapMock.config?.content).toBe("# Titel\n\n**fett**");
    expect(screen.getByTestId("field-editor")).toBeInTheDocument();
  });

  it("T-12 nutzt testIdPrefix für view und editor", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="custom-prefix" />);

    expect(screen.getByTestId("custom-prefix-view")).toBeInTheDocument();
    expect(screen.getByTestId("custom-prefix-editor")).toBeInTheDocument();
  });

  it("T-13 rendert ohne testIdPrefix keine data-testid-Attribute", () => {
    const { container } = renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} />);

    expect(container.querySelector("[data-testid='field-view']")).not.toBeInTheDocument();
    expect(container.querySelector("[data-testid='field-editor']")).not.toBeInTheDocument();
  });

  it("T-14 zeigt die Toolbar dauerhaft gedimmt und mit Full-Aktionen", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="field" />);

    expect(screen.getByTestId("rich-text-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("rich-text-toolbar")).toHaveClass("opacity-60");
    expect(screen.queryByTestId("bubble-menu")).not.toBeInTheDocument();
    expect(screen.queryByTestId("floating-menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zitat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Überschrift 4" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trennlinie" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Spalten" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Formatierung entfernen" })).toBeInTheDocument();
  });

  it("T-14b wendet Highlight nur auf die aktuelle Textselektion an", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="field" />);

    fireEvent.click(screen.getByRole("button", { name: "Hervorheben" }));

    expect(tiptapMock.chain?.setTextSelection).toHaveBeenCalledWith({ from: 2, to: 5 });
    expect(tiptapMock.chain?.toggleHighlight).toHaveBeenCalled();
    expect(tiptapMock.chain?.run).toHaveBeenCalled();
  });

  it("T-15 setzt die MindesthÃ¶he fÃ¼r Leseansicht und Editor", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} minRows={12} testIdPrefix="field" />);

    expect(tiptapMock.config?.editorProps?.attributes?.class).toContain("rich-text-inline-min-rows");
    expect(tiptapMock.config?.editorProps?.attributes?.style).toBe("--rich-text-field-min-rows: 12;");
  });

  it("T-16 kennzeichnet den Editor je nach Fokuszustand", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="field" />);

    expect(screen.getByTestId("field-editor")).toHaveClass("border", "border-line", "bg-white");
    const activeEditor = tiptapMock.editor;
    if (activeEditor) {
      act(() => {
        tiptapMock.config?.onFocus?.({ editor: activeEditor });
      });
    }

    expect(screen.getByTestId("field-editor")).toHaveClass("border-steel-600", "bg-white");
  });

  it("T-22 hält Toolbar sticky und bricht Sticky nicht durch overflow-hidden", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="field" />);

    fireEvent.click(screen.getByTestId("field-view"));

    expect(screen.getByTestId("field-editor")).toHaveClass("overflow-clip");
    expect(screen.getByTestId("rich-text-toolbar")).toHaveClass("sticky", "top-0", "z-10");
  });

  it("T-23 normalisiert überzählige Leerzeilen beim Einfügen", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="field" />);

    fireEvent.click(screen.getByTestId("field-view"));

    expect(tiptapMock.config?.editorProps?.transformPastedText?.("A\n\n\n\nB")).toBe("A\n\nB");
  });

  it("T-23b aktiviert Markdown-Konvertierung für eingefügten Plain-Text", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="field" />);

    fireEvent.click(screen.getByTestId("field-view"));

    expect(tiptapMock.markdownOptions).toEqual(expect.objectContaining({ html: true, transformPastedText: true }));
  });

  it("T-24 entfernt geerbte Farb- und TextStyle-Marks nach Paste-Transaktionen", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="field" />);

    fireEvent.click(screen.getByTestId("field-view"));
    const activeEditor = tiptapMock.editor;
    if (!activeEditor) {
      throw new Error("Editor mock was not created");
    }

    tiptapMock.config?.onTransaction?.({
      editor: activeEditor,
      transaction: {
        getMeta: vi.fn((key: string) => key === "paste"),
        selection: { from: 2, to: 2 }
      }
    });

    expect(tiptapMock.chain?.selectAll).toHaveBeenCalled();
    expect(tiptapMock.chain?.unsetColor).toHaveBeenCalled();
    expect(tiptapMock.chain?.unsetMark).toHaveBeenCalledWith("textStyle");
    expect(tiptapMock.chain?.setTextSelection).toHaveBeenCalledWith({ from: 2, to: 2 });
    expect(tiptapMock.chain?.run).toHaveBeenCalled();
  });

  it("T-25 fügt Clipboard-Bilder über onImageUpload in den Editor ein", async () => {
    const file = new File(["image"], "screen.png", { type: "image/png" });
    const imageNode = { type: "image", attrs: { src: "http://assets.test/uploads/screen.png" } };
    const tr = createPasteTransaction();
    const view: MockPasteView = {
      state: {
        selection: { from: 3 },
        tr,
        schema: {
          nodes: {
            image: {
              create: vi.fn(() => imageNode)
            }
          }
        }
      },
      dispatch: vi.fn()
    };
    const preventDefault = vi.fn();
    const uploadImage = vi.fn<[File], Promise<string>>().mockResolvedValue("http://assets.test/uploads/screen.png");
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} onImageUpload={uploadImage} testIdPrefix="field" />);

    fireEvent.click(screen.getByTestId("field-view"));
    const handled = tiptapMock.config?.editorProps?.handlePaste?.(
      view,
      {
        preventDefault,
        clipboardData: {
          items: [{ type: "image/png", getAsFile: () => file }]
        }
      } as unknown as ClipboardEvent
    );

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalled();
    expect(tr.insertText).toHaveBeenCalledWith("[Bild wird hochgeladen...]");
    expect(uploadImage).toHaveBeenCalledWith(file);
    await waitFor(() => expect(view.state.schema.nodes.image?.create).toHaveBeenCalledWith({ src: "http://assets.test/uploads/screen.png" }));
    expect(tr.delete).toHaveBeenCalledWith(3, 29);
    expect(tr.insert).toHaveBeenCalledWith(3, imageNode);
  });

  it("T-26 blockiert Bild-Einfügen ohne onImageUpload", () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("https://assets.test/image.png");
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="field" />);

    fireEvent.click(screen.getByTestId("field-view"));
    const imageButton = screen.getByRole("button", { name: "Bild" });

    expect(imageButton).toBeDisabled();
    fireEvent.click(imageButton);
    expect(promptSpy).not.toHaveBeenCalled();
    expect(tiptapMock.chain).toBeUndefined();
    promptSpy.mockRestore();
  });

  it("T-EN1 blendet Toolbar im Lesemodus aus ohne Layout-Shift (invisible, not removed)", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} editable={false} testIdPrefix="field" />);

    const toolbar = screen.getByTestId("rich-text-toolbar");
    expect(toolbar).toBeInTheDocument();
    expect(toolbar.parentElement).toHaveClass("invisible");
    expect(toolbar.parentElement).toHaveClass("pointer-events-none");
  });

  it("T-EN2 zeigt Toolbar im Bearbeitungsmodus ohne invisible-Klasse (default editable)", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="field" />);

    const toolbar = screen.getByTestId("rich-text-toolbar");
    expect(toolbar).toBeInTheDocument();
    expect(toolbar.parentElement).not.toHaveClass("invisible");
  });

  it("T-EN3 navigiert bei einfachem Klick auf wiki://-Link im Lesemodus", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} editable={false} testIdPrefix="field" />);

    const editorContainer = screen.getByTestId("field-editor");
    const anchor = document.createElement("a");
    anchor.href = "wiki://42";
    anchor.textContent = "Wiki Link";
    editorContainer.appendChild(anchor);

    fireEvent.click(anchor);

    expect(navigateMock).toHaveBeenCalledWith("/wiki/42");
  });

  it("T-EN4 navigiert bei Ctrl+Klick auf wiki://-Link im Bearbeitungsmodus", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="field" />);

    const editorContainer = screen.getByTestId("field-editor");
    const anchor = document.createElement("a");
    anchor.href = "wiki://99";
    editorContainer.appendChild(anchor);

    fireEvent.click(anchor, { ctrlKey: true });

    expect(navigateMock).toHaveBeenCalledWith("/wiki/99");
  });

  it("T-EN5 navigiert NICHT bei einfachem Klick auf wiki://-Link im Bearbeitungsmodus", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="field" />);

    const editorContainer = screen.getByTestId("field-editor");
    const anchor = document.createElement("a");
    anchor.href = "wiki://99";
    editorContainer.appendChild(anchor);

    fireEvent.click(anchor);

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("T-27 setzt Flex-Fill-Klassen wenn fill=true", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} fill testIdPrefix="field" />);

    // Äußerer Container (field-view) erhält flex min-h-0 flex-1 flex-col
    const outerDiv = screen.getByTestId("field-view");
    expect(outerDiv).toHaveClass("flex", "min-h-0", "flex-1", "flex-col");

    // Editor-Wrapper (field-editor) erhält overflow-visible statt overflow-clip
    const editorDiv = screen.getByTestId("field-editor");
    expect(editorDiv).toHaveClass("flex", "min-h-0", "flex-1", "flex-col", "overflow-visible");
    expect(editorDiv).not.toHaveClass("overflow-clip");
  });

  it("T-EN6 ignoriert Klicks auf externe https://-Links", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} editable={false} testIdPrefix="field" />);

    const editorContainer = screen.getByTestId("field-editor");
    const anchor = document.createElement("a");
    anchor.href = "https://example.com";
    editorContainer.appendChild(anchor);

    fireEvent.click(anchor);

    expect(navigateMock).not.toHaveBeenCalled();
  });
});
