# Codex-Auftrag: TLDraw-Zeichenblock als TipTap Custom Node

## Ziel

Nutzer können innerhalb jedes Rich-Text-Feldes der App einen interaktiven Zeichenblock
einfügen. Der Block basiert auf TLDraw v2 und ist als TipTap Custom Node implementiert.
Im Lesemodus zeigt der Block eine statische SVG-Vorschau des Zeichnungsinhalts. Im
Editiermodus wird die vollständige TLDraw-Canvas eingebettet — direkt im Textfeld,
kein separates Modal. Das Zeichnen, Speichern und Verwerfen erfolgt über TLDraws eigene
UI sowie zwei Buttons (Übernehmen / Abbrechen) unterhalb der Canvas. Der Zeichnungszustand
wird als JSON im TipTap-Dokument gespeichert.

---

## Kontext

- **Betrifft:** `apps/web`
- **Basis:** `RichTextInlineField` in `components/ui/rich-text-inline-field.tsx`
  (TipTap v2, bereits vollständig integriert)
- **Neue Abhängigkeit:** `@tldraw/tldraw` (MIT-lizenziert ab v2.x)
- **TipTap-Mechanismus:** `ReactNodeViewRenderer` aus `@tiptap/react` — rendert eine
  React-Komponente als ProseMirror NodeView direkt im Dokument
- **Tech Stack:** React 18 + TypeScript + Tailwind + Vite

---

## Aufgabe

### Schritt 1 — TLDraw installieren

```bash
npm install @tldraw/tldraw
```

Im Monorepo-Kontext: Installation im Workspace `apps/web`.

**Gate:** Nach Installation sicherstellen, dass kein Peer-Dependency-Konflikt mit den
vorhandenen React 18 / TipTap v2 Paketen besteht. `npm ls @tldraw/tldraw` muss sauber
auflösen. Gibt es einen Konflikt, im Abschlussbericht dokumentieren und keinen Code
schreiben.

TLDraw bringt CSS mit, das explizit importiert werden muss:

```typescript
import "@tldraw/tldraw/tldraw.css";
```

Dieser Import gehört in `apps/web/src/styles.css` als `@import` oder direkt in
`main.tsx` — **nicht** in `rich-text-inline-field.tsx`, da die Styles global gelten.

---

### Schritt 2 — TipTap Custom Node `TldrawNode` erstellen

**Datei:** `apps/web/src/components/ui/tldraw-node.ts`

Der Node ist ein `block`-Level-Node. Er speichert den TLDraw-Snapshot als JSON-String
im Attribut `snapshot`. Eine leere neue Zeichnung hat einen leeren Snapshot `""`.

```typescript
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { TldrawNodeView } from "./TldrawNodeView";

export const TldrawNode = Node.create({
  name: "tldraw",
  group: "block",
  atom: true,        // kein Inline-Editing durch ProseMirror selbst
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      snapshot: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-snapshot") ?? "",
        renderHTML: (attributes) => ({ "data-snapshot": attributes.snapshot }),
      },
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
  },
});
```

---

### Schritt 3 — React NodeView `TldrawNodeView` erstellen

**Datei:** `apps/web/src/components/ui/TldrawNodeView.tsx`

Die NodeView hat zwei Zustände: **Vorschau** und **Bearbeiten**.

#### 3a — Props und State

```typescript
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Tldraw, exportToBlob, type TLEditorSnapshot } from "@tldraw/tldraw";
import { useState, useRef } from "react";

export function TldrawNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftSnapshot, setDraftSnapshot] = useState<TLEditorSnapshot | null>(null);
  const editorRef = useRef<ReturnType<typeof useTldrawEditor> | null>(null);
  const snapshot: TLEditorSnapshot | null = node.attrs.snapshot
    ? (JSON.parse(node.attrs.snapshot) as TLEditorSnapshot)
    : null;
  ...
}
```

#### 3b — Vorschau-Zustand (`!isEditing`)

- Ist `snapshot` leer (keine Zeichnung): zeigt einen grauen Platzhalter-Block mit
  dem Text „Zeichnung — Klicken zum Bearbeiten" und einem `PenLine`-Icon
  (lucide-react, bereits installiert).
- Ist `snapshot` vorhanden: rendert eine statische SVG-Vorschau.
  TLDraw v2 bietet `exportToSvg()` — da dies async ist, wird die SVG als
  `data-URL` in einem `<img>`-Tag angezeigt. Die SVG wird beim Wechsel aus dem
  Editiermodus (Commit) einmalig erzeugt und als `previewSvg`-State gecacht.
  Beim ersten Render mit vorhandenem Snapshot ohne gecachtes Preview: Fallback auf
  den Platzhalter-Block bis zum ersten Editiervorgang.
- Doppelklick auf den Block → `setIsEditing(true)`
- `data-testid="tldraw-node-preview"`

**Randbedingung:** `NodeViewWrapper` muss als äußerstes Element stehen — das ist die
Pflicht-Wrapper-Komponente von TipTap für React-NodeViews.

```tsx
return (
  <NodeViewWrapper>
    <div
      className="my-2 rounded-md border border-line bg-shell"
      data-testid="tldraw-node-preview"
      onDoubleClick={() => setIsEditing(true)}
    >
      {snapshot && previewSvg ? (
        <img src={previewSvg} alt="Zeichnung" className="w-full rounded-md" />
      ) : (
        <div className="flex h-32 items-center justify-center gap-2 text-sm text-slate-500">
          <PenLine className="h-4 w-4" />
          Zeichnung — Doppelklick zum Bearbeiten
        </div>
      )}
    </div>
  </NodeViewWrapper>
);
```

#### 3c — Bearbeiten-Zustand (`isEditing`)

- Rendert `<Tldraw />` mit einer festen Höhe (`h-[480px]`) und dem initialen
  Snapshot als `initialState`.
- Zwei Buttons unterhalb der Canvas:
  - **Übernehmen** (primary): liest den aktuellen Snapshot über die TLDraw-Editor-
    Instanz aus, serialisiert ihn als JSON-String, ruft
    `updateAttributes({ snapshot: JSON.stringify(currentSnapshot) })` auf,
    erzeugt async die SVG-Vorschau, setzt `isEditing(false)`.
  - **Abbrechen**: setzt `isEditing(false)` ohne `updateAttributes`.
- `data-testid="tldraw-node-editor"`

```tsx
return (
  <NodeViewWrapper>
    <div className="my-2 rounded-md border border-line" data-testid="tldraw-node-editor">
      <div className="h-[480px] w-full overflow-hidden rounded-t-md">
        <Tldraw
          snapshot={snapshot ?? undefined}
          onMount={(editor) => { editorRef.current = editor; }}
        />
      </div>
      <div className="flex justify-end gap-2 border-t border-line bg-shell px-3 py-2">
        <button
          type="button"
          onClick={handleCancel}
          className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-line/50"
          data-testid="tldraw-node-cancel"
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={handleCommit}
          className="rounded bg-steel-700 px-3 py-1.5 text-sm text-white hover:bg-steel-800"
          data-testid="tldraw-node-commit"
        >
          Übernehmen
        </button>
      </div>
    </div>
  </NodeViewWrapper>
);
```

#### 3d — Commit-Logik

```typescript
const handleCommit = async () => {
  const editor = editorRef.current;
  if (!editor) return;

  const currentSnapshot = editor.store.getSnapshot();
  updateAttributes({ snapshot: JSON.stringify(currentSnapshot) });

  // SVG-Vorschau erzeugen
  try {
    const svgResult = await exportToBlob({
      editor,
      ids: [...editor.getCurrentPageShapeIds()],
      format: "svg",
      opts: { background: false },
    });
    const svgUrl = URL.createObjectURL(svgResult);
    setPreviewSvg(svgUrl);
  } catch {
    // SVG-Export fehlgeschlagen → kein Preview, Platzhalter bleibt
    setPreviewSvg(null);
  }

  setIsEditing(false);
};
```

**Cleanup:** Object-URLs für SVG-Previews müssen beim Unmount der Komponente über
`URL.revokeObjectURL()` freigegeben werden (im `useEffect`-Cleanup).

---

### Schritt 4 — TldrawNode in `RichTextInlineField` registrieren

In `rich-text-inline-field.tsx` den `TldrawNode` in die Extensions-Liste aufnehmen:

```typescript
import { TldrawNode } from "./tldraw-node";

const extensions = useMemo(
  () => [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Underline,
    Link.configure({ openOnClick: false }),
    Image,
    TldrawNode,           // NEU
    Markdown.configure({ html: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    Placeholder.configure({
      placeholder: placeholder ?? "Text eingeben ...",
      showOnlyWhenEditable: true,
    }),
  ],
  [placeholder]
);
```

**Keine weiteren Änderungen** an `RichTextInlineField`. Weder Props noch
Toolbar-Varianten noch bestehende Tests werden berührt.

---

### Schritt 5 — Toolbar-Button „Zeichnung einfügen"

In `RichTextToolbar` (in `rich-text-inline-field.tsx`) wird im `full`-Toolbar-Block
ein Button zum Einfügen eines leeren TLDraw-Blocks ergänzt.

**Platzierung:** Am Ende der bestehenden `showFullToolbar`-Gruppe, nach
„Formatierung entfernen", vor dem letzten `<Separator />`.

```tsx
{showFullToolbar ? (
  <>
    ...bestehende Buttons...
    <Separator />
    <ToolbarButton
      onClick={() =>
        editor.chain().focus().insertContent({
          type: "tldraw",
          attrs: { snapshot: "" },
        }).run()
      }
      active={false}
      title="Zeichnung einfügen"
      icon={<PenLine />}
    />
  </>
) : null}
```

`PenLine` aus `lucide-react` — bereits in der Datei importiert oder ergänzen.

---

### Schritt 6 — CSS: TLDraw-Containment sicherstellen

TLDraw rendert intern fixierte UI-Elemente (Toolbar, Panels) die aus dem Scroll-
Container ausbrechen können. In `apps/web/src/styles.css` (oder in der globalen CSS):

```css
/* TLDraw-Canvas: Overflow und Stacking auf den Zeichenblock begrenzen */
.tl-container {
  position: relative !important;
  /* Verhindert, dass interne fixed-Elemente aus dem Node-View ausbrechen */
}
```

**Wichtig:** Die TLDraw-Toolbar (`tl-toolbar`) ist innerhalb des `h-[480px]`-Containers
sichtbar, weil der Container eine explizite Höhe hat. Die `overflow-hidden`-Klasse auf
dem Container verhindert Overflow nach außen.

---

### Schritt 7 — Tests

**Datei:** `apps/web/src/components/ui/__tests__/tldraw-node.test.tsx`

TLDraw selbst ist eine komplexe Canvas-Bibliothek, die in jsdom nicht lauffähig ist.
Der Test mockt TLDraw vollständig und prüft nur das Verhalten der NodeView-Komponente.

#### Mock für TLDraw

```typescript
vi.mock("@tldraw/tldraw", () => ({
  Tldraw: ({ onMount }: { onMount?: (editor: MockTldrawEditor) => void }) => {
    const mockEditor: MockTldrawEditor = {
      store: {
        getSnapshot: vi.fn(() => ({ shapes: [], bindings: [] })),
      },
      getCurrentPageShapeIds: vi.fn(() => new Set()),
    };
    onMount?.(mockEditor);
    return <div data-testid="tldraw-canvas" />;
  },
  exportToBlob: vi.fn().mockResolvedValue(new Blob(["<svg/>"], { type: "image/svg+xml" })),
}));
```

#### Pflichthafte Tests

```
TN-01  Vorschau leer: rendert Platzhalter wenn snapshot leer ist
TN-02  Vorschau leer: zeigt "Zeichnung" und PenLine-Icon
TN-03  Vorschau: rendert img-Tag wenn previewSvg vorhanden (simuliert nach Commit)
TN-04  Doppelklick auf Vorschau: Editor-Container erscheint (tldraw-node-editor)
TN-05  Doppelklick auf Vorschau: Vorschau-Container verschwindet
TN-06  Doppelklick: TLDraw-Canvas (tldraw-canvas) erscheint
TN-07  Commit: updateAttributes wird aufgerufen mit serialisiertem Snapshot
TN-08  Commit: Vorschau-Container erscheint wieder, Editor-Container verschwindet
TN-09  Abbrechen: updateAttributes wird NICHT aufgerufen
TN-10  Abbrechen: Vorschau-Container erscheint wieder, Editor-Container verschwindet
TN-11  Kein doppelter Object-URL-Leak: revokeObjectURL wird beim Unmount aufgerufen
```

**`NodeViewWrapper`-Mock:** `@tiptap/react` wird partiell gemockt —
`NodeViewWrapper` wird als einfaches `<div>` gerendert, `NodeViewProps` kommen als
direkte Props:

```typescript
vi.mock("@tiptap/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tiptap/react")>();
  return {
    ...actual,
    NodeViewWrapper: ({ children }: { children: React.ReactNode }) =>
      <div>{children}</div>,
  };
});
```

---

## Regeln & Einschränkungen

- **Keine Änderungen an bestehenden Tests** (T-01 bis T-15). Der TldrawNode ist
  eine Erweiterung, keine Änderung an `RichTextInlineField`.
- **`toolbar="minimal"`** zeigt keinen Zeichnen-Button — der Button liegt im
  `showFullToolbar`-Block und wird nur bei `variant === "full"` gerendert.
- **Kein Speichern direkt aus der NodeView.** `updateAttributes` aktualisiert
  nur den TipTap-Dokumentenbaum. Das Persistieren übernimmt der Parent über
  `onChange` auf Blur — unverändert wie bisher.
- **`atom: true`** ist zwingend. Ohne `atom` würde ProseMirror versuchen, den
  Node-Inhalt selbst zu editieren.
- **TLDraw-CSS-Import** gehört in `main.tsx` oder `styles.css`, nicht in die
  Komponentendatei. Sonst wird er beim Tree-Shaking möglicherweise entfernt.
- **Object-URL-Cleanup** ist Pflicht (TN-11) — ohne Cleanup leckt jeder
  Editiervorgang eine Blob-URL.
- **Kein Pro-Feature** von TLDraw verwenden. Ausschließlich das freie
  `@tldraw/tldraw`-Paket.
- **`exportToBlob`-Fehler** werden still gefangen — eine fehlgeschlagene
  SVG-Erzeugung darf den Commit nicht blockieren. Der Platzhalter bleibt als Fallback.

---

## Randfälle & Fehlerpfade

- **Leere Zeichnung committen:** Leerer Snapshot (`""`) bleibt nach dem Commit als
  leere Zeichnung erhalten. Der Platzhalter wird weiter angezeigt — korrekt.
- **Sehr große Zeichnungen:** `exportToBlob` kann bei komplexen Zeichnungen langsam
  sein. Der Commit-Button zeigt während des Exports einen Lade-Spinner
  (`isCommitting`-State) und ist disabled bis der Export abgeschlossen ist.
- **Mehrere TLDraw-Blöcke im selben Dokument:** Jede NodeView-Instanz hat eigenen
  State. Kein geteilter globaler Editor-State.
- **TLDraw-Block im `readOnly`-Kontext:** `RichTextInlineField` mit `readOnly={true}`
  mountet TipTap nicht → kein TLDraw-Block editierbar. Die Leseansicht zeigt
  `dangerouslySetInnerHTML` des gespeicherten HTML — darin steht ein
  `<div data-tldraw data-snapshot="...">`. In reinen Leseansichten außerhalb von
  TipTap (z.B. in Hover-Previews) wird dieser Block als unsichtbares `div` gerendert.
  Das ist akzeptabel für den ersten Schritt — eine dedizierte Vorschau-Komponente
  für diesen Fall ist out of scope.
- **Serialisierung:** `JSON.stringify` auf den TLDraw-Snapshot erzeugt gültiges JSON.
  `JSON.parse` beim Laden muss in einem try-catch stehen — korrupter Snapshot führt
  sonst zu einem unbehandelten Fehler beim Rendern.

---

## Seiteneffekte

- **`apps/web/package.json`:** `@tldraw/tldraw` als Dependency hinzugefügt.
- **`apps/web/src/main.tsx` oder `styles.css`:** TLDraw-CSS-Import ergänzt.
- **`rich-text-inline-field.tsx`:** `TldrawNode` in Extensions-Liste + `PenLine`-Icon
  im Toolbar-Import. Keine strukturellen Änderungen, keine Props-Änderungen.
- **Neue Dateien:**
  - `components/ui/tldraw-node.ts`
  - `components/ui/TldrawNodeView.tsx`
  - `components/ui/__tests__/tldraw-node.test.tsx`

---

## Definition of Done

```
[ ]  1. @tldraw/tldraw installiert, npm ls sauber, kein Peer-Conflict
[ ]  2. TLDraw-CSS-Import in main.tsx oder styles.css vorhanden
[ ]  3. tldraw-node.ts: TldrawNode mit atom, snapshot-Attribut, ReactNodeViewRenderer
[ ]  4. TldrawNodeView.tsx: Vorschau-Zustand mit Platzhalter und img-Fallback
[ ]  5. TldrawNodeView.tsx: Bearbeiten-Zustand mit Tldraw-Canvas und zwei Buttons
[ ]  6. TldrawNodeView.tsx: Commit speichert Snapshot via updateAttributes
[ ]  7. TldrawNodeView.tsx: Commit erzeugt SVG-Vorschau via exportToBlob (mit Fehler-Fallback)
[ ]  8. TldrawNodeView.tsx: Commit-Button zeigt Spinner während SVG-Export (isCommitting)
[ ]  9. TldrawNodeView.tsx: Abbrechen ruft updateAttributes NICHT auf
[ ] 10. TldrawNodeView.tsx: Object-URL wird beim Unmount freigegeben (revokeObjectURL)
[ ] 11. TldrawNodeView.tsx: JSON.parse des Snapshots ist in try-catch gekapselt
[ ] 12. rich-text-inline-field.tsx: TldrawNode in Extensions registriert
[ ] 13. rich-text-inline-field.tsx: Toolbar-Button "Zeichnung einfügen" im full-Toolbar
[ ] 14. styles.css / global CSS: .tl-container Containment-Regel vorhanden
[ ] 15. Tests TN-01 bis TN-11 existieren und sind grün
[ ] 16. Bestehende Tests T-01 bis T-15 sind unverändert und weiterhin grün
[ ] 17. npm run typecheck → Exit-Code 0
[ ] 18. npm test → Exit-Code 0
[ ] 19. Kein TODO-Kommentar im Code
```
