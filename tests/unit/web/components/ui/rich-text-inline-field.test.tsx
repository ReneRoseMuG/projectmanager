// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - RichTextInlineField rendert HTML-Leseansicht, Placeholder, readOnly und Edit-Zustand.
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
import type { CurrentUser } from "@taskmanager/shared-types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { act, cleanup, render } from "@testing-library/react";
import { useState, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RichTextInlineField } from "../../../../../apps/web/src/components/ui/rich-text-inline-field";
import { ToastProvider } from "../../../../../apps/web/src/components/ui/ToastProvider";
import { queryKeys } from "../../../../../apps/web/src/queries/queryKeys";

interface MockEditor {
  getHTML: ReturnType<typeof vi.fn<[], string>>;
  getAttributes: ReturnType<typeof vi.fn<[string], Record<string, string | undefined>>>;
  commands: {
    setContent: ReturnType<typeof vi.fn<[string], void>>;
    blur: ReturnType<typeof vi.fn<[], void>>;
    focus: ReturnType<typeof vi.fn<[string?], void>>;
    setTextSelection: ReturnType<typeof vi.fn<[number], void>>;
  };
  isActive: ReturnType<typeof vi.fn<[(string | Record<string, string>)?, Record<string, unknown>?], boolean>>;
  chain: ReturnType<typeof vi.fn<[], MockCommandChain>>;
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
  editorProps?: {
    attributes?: Record<string, string>;
    transformPastedText?: (text: string) => string;
    handlePaste?: (view: MockPasteView, event: ClipboardEvent) => boolean;
  };
  onTransaction?: (input: { editor: MockEditor; transaction: MockTransaction }) => void;
  onBlur?: (input: { editor: MockEditor }) => void;
}

const tiptapMock = vi.hoisted(() => ({
  editor: undefined as MockEditor | undefined,
  config: undefined as MockEditorConfig | undefined,
  chain: undefined as MockCommandChain | undefined,
  html: "<p>mock content</p>"
}));

const aiApiMock = vi.hoisted(() => ({
  assistAiText: vi.fn()
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

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn((config: MockEditorConfig) => {
    const editor: MockEditor = {
      getHTML: vi.fn(() => tiptapMock.html),
      getAttributes: vi.fn<[string], Record<string, string | undefined>>(() => ({})),
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
      view: {
        posAtCoords: vi.fn((_coords: { left: number; top: number }): { pos: number } | null => ({ pos: 1 }))
      }
    };

    tiptapMock.editor = editor;
    tiptapMock.config = config;
    return editor;
  }),
  EditorContent: ({ editor }: { editor: MockEditor }) => <div data-testid="tiptap-editor-content" tabIndex={0} onBlur={() => tiptapMock.config?.onBlur?.({ editor })} />
}));

vi.mock("../../../../../apps/web/src/components/ui/tldraw-node", () => ({
  TldrawNode: {
    name: "tldraw"
  }
}));

vi.mock("../../../../../apps/web/src/api/ai", () => aiApiMock);

const adminUser: CurrentUser = {
  id: 1,
  firstName: "Ada",
  lastName: "Admin",
  fullName: "Ada Admin",
  email: "admin@local",
  requiresPasswordSetup: false,
  role: {
    id: 1,
    key: "admin",
    label: "Admin",
    isSystem: true,
    version: 1,
    createdAt: "2026-05-21T00:00:00",
    updatedAt: "2026-05-21T00:00:00",
    permissions: [{ id: 1, roleId: 1, resource: "*", action: "*" }]
  },
  permissions: [{ id: 1, roleId: 1, resource: "*", action: "*" }]
};

const readerUser: CurrentUser = {
  ...adminUser,
  id: 2,
  role: {
    ...adminUser.role,
    id: 2,
    key: "reader",
    label: "Reader",
    permissions: [{ id: 2, roleId: 2, resource: "ai", action: "read" }]
  },
  permissions: [{ id: 2, roleId: 2, resource: "ai", action: "read" }]
};

function renderWithProviders(ui: ReactElement, user: CurrentUser | null = adminUser) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  if (user) {
    queryClient.setQueryData(queryKeys.auth.me(), user);
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  tiptapMock.editor = undefined;
  tiptapMock.config = undefined;
  tiptapMock.chain = undefined;
  tiptapMock.html = "<p>mock content</p>";
});

describe("RichTextInlineField", () => {
  it("T-01 rendert value als HTML in der Leseansicht", () => {
    renderWithProviders(<RichTextInlineField value="<p><strong>Hallo</strong></p>" onChange={vi.fn()} testIdPrefix="field" />);

    expect(screen.getByTestId("field-view").innerHTML).toBe("<p><strong>Hallo</strong></p>");
  });

  it("T-02 zeigt placeholder wenn value null ist", () => {
    renderWithProviders(<RichTextInlineField value={null} onChange={vi.fn()} placeholder="Text eingeben" testIdPrefix="field" />);

    expect(screen.getByTestId("field-view")).toHaveTextContent("Text eingeben");
  });

  it("T-03 zeigt placeholder wenn value undefined ist", () => {
    renderWithProviders(<RichTextInlineField value={undefined} onChange={vi.fn()} placeholder="Text eingeben" testIdPrefix="field" />);

    expect(screen.getByTestId("field-view")).toHaveTextContent("Text eingeben");
  });

  it("T-04 zeigt placeholder wenn value leer ist", () => {
    renderWithProviders(<RichTextInlineField value="" onChange={vi.fn()} placeholder="Text eingeben" testIdPrefix="field" />);

    expect(screen.getByTestId("field-view")).toHaveTextContent("Text eingeben");
  });

  it("T-05 zeigt placeholder wenn value nur leere Tags enthält", () => {
    renderWithProviders(<RichTextInlineField value="<p></p>" onChange={vi.fn()} placeholder="Text eingeben" testIdPrefix="field" />);

    expect(screen.getByTestId("field-view")).toHaveTextContent("Text eingeben");
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

  it("T-08 aktiviert nach Click den Editor", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="field" />);

    fireEvent.click(screen.getByTestId("field-view"));

    expect(screen.getByTestId("field-editor")).toBeInTheDocument();
  });

  it("T-09 entfernt nach Click die Leseansicht aus dem DOM", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="field" />);

    fireEvent.click(screen.getByTestId("field-view"));

    expect(screen.queryByTestId("field-view")).not.toBeInTheDocument();
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

  it("T-11 ruft onChange bei Escape mit originalValue auf", () => {
    const onChange = vi.fn();
    renderWithProviders(<RichTextInlineField value="<p>Original</p>" onChange={onChange} testIdPrefix="field" />);

    fireEvent.click(screen.getByTestId("field-view"));
    fireEvent.keyDown(window, { key: "Escape" });

    expect(onChange).toHaveBeenCalledWith("<p>Original</p>");
    expect(onChange).not.toHaveBeenCalledWith("<p>mock content</p>");
  });

  it("T-12 nutzt testIdPrefix für view und editor", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="custom-prefix" />);

    expect(screen.getByTestId("custom-prefix-view")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("custom-prefix-view"));
    expect(screen.getByTestId("custom-prefix-editor")).toBeInTheDocument();
  });

  it("T-13 rendert ohne testIdPrefix keine data-testid-Attribute", () => {
    const { container } = renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} />);

    expect(container.querySelectorAll("[data-testid]")).toHaveLength(0);
  });

  it("T-14 zeigt die Toolbar erst im Editierzustand", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="field" />);

    expect(screen.queryByTestId("rich-text-toolbar")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("field-view"));

    expect(screen.getByTestId("rich-text-toolbar")).toBeInTheDocument();
    expect(screen.queryByTestId("bubble-menu")).not.toBeInTheDocument();
    expect(screen.queryByTestId("floating-menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zitat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Formatierung entfernen" })).toBeInTheDocument();
  });

  it("T-15 setzt die MindesthÃ¶he fÃ¼r Leseansicht und Editor", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} minRows={12} testIdPrefix="field" />);

    expect(screen.getByTestId("field-view")).toHaveClass("rich-text-inline-min-rows");
    expect(screen.getByTestId("field-view")).toHaveStyle("--rich-text-field-min-rows: 12");

    fireEvent.click(screen.getByTestId("field-view"));

    expect(tiptapMock.config?.editorProps?.attributes?.class).toContain("rich-text-inline-min-rows");
    expect(tiptapMock.config?.editorProps?.attributes?.style).toBe("--rich-text-field-min-rows: 12;");
  });

  it("T-16 kennzeichnet editierbare Leseansicht und Editor als Textfeld", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="field" />);

    expect(screen.getByTestId("field-view")).toHaveClass("border", "border-line", "bg-shell/70");

    fireEvent.click(screen.getByTestId("field-view"));

    expect(screen.getByTestId("field-editor")).toHaveClass("border", "border-steel-600", "bg-white");
  });

  it("T-17 zeigt den KI-Bearbeiten-Button in der editierbaren Leseansicht", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="field" />);

    expect(screen.getByRole("button", { name: "Mit KI bearbeiten" })).toBeInTheDocument();
    expect(screen.getByTestId("field-ai-button")).toBeInTheDocument();
  });

  it("T-18 zeigt den KI-Bearbeiten-Button nicht bei readOnly", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} readOnly testIdPrefix="field" />);

    expect(screen.queryByRole("button", { name: "Mit KI bearbeiten" })).not.toBeInTheDocument();
  });

  it("T-19 zeigt den KI-Bearbeiten-Button nicht ohne ai-write-Berechtigung", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="field" />, readerUser);

    expect(screen.queryByRole("button", { name: "Mit KI bearbeiten" })).not.toBeInTheDocument();
  });

  it("T-20 öffnet den KI-Dialog nach Klick auf den Button", () => {
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="field" />);

    fireEvent.click(screen.getByRole("button", { name: "Mit KI bearbeiten" }));

    expect(screen.getByLabelText("Anweisung")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generieren" })).toBeInTheDocument();
  });

  it("T-21 übernimmt KI-Ergebnis und wechselt in den Editierzustand", async () => {
    const onChange = vi.fn();
    aiApiMock.assistAiText.mockResolvedValue({ model: "llama3.2:1b", html: "<p>KI Ergebnis</p>" });

    function StatefulField() {
      const [html, setHtml] = useState("<p>Alt</p>");
      return (
        <RichTextInlineField
          value={html}
          onChange={(nextHtml) => {
            onChange(nextHtml);
            setHtml(nextHtml);
          }}
          testIdPrefix="field"
        />
      );
    }

    renderWithProviders(<StatefulField />);

    fireEvent.click(screen.getByRole("button", { name: "Mit KI bearbeiten" }));
    fireEvent.change(screen.getByLabelText("Anweisung"), { target: { value: "Schreibe besser" } });
    fireEvent.click(screen.getByRole("button", { name: "Generieren" }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("<p>KI Ergebnis</p>"));
    expect(screen.getByTestId("field-editor")).toBeInTheDocument();
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

  it("T-26 nutzt ohne onImageUpload weiterhin den URL-Prompt für Bilder", () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("https://assets.test/image.png");
    renderWithProviders(<RichTextInlineField value="<p>Text</p>" onChange={vi.fn()} testIdPrefix="field" />);

    fireEvent.click(screen.getByTestId("field-view"));
    fireEvent.click(screen.getByRole("button", { name: "Bild" }));

    expect(promptSpy).toHaveBeenCalledWith("Bild-URL");
    expect(tiptapMock.chain?.setImage).toHaveBeenCalledWith({ src: "https://assets.test/image.png" });
    promptSpy.mockRestore();
  });
});
