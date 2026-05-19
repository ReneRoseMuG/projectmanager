# Codex-Auftrag: UI — RichTextInlineField (Notion-ähnliches Inline-Editing mit TipTap)

## Ziel

Alle Rich-Text-Felder der App werden durch eine neue Basiskomponente `RichTextInlineField`
ersetzt. Das Feld zeigt formatierten HTML-Inhalt als stille Leseansicht — kein Editor,
keine Toolbar sichtbar. Ein Klick in das Feld aktiviert den Editor direkt an der
Klickposition. Eine schwebende Formatierungs-Toolbar (BubbleMenu) erscheint nur dann, wenn
der Nutzer Text markiert hat. Ein Klick außerhalb des Feldes beendet das Editieren; der
neue Inhalt fließt in den Formular-State. Kein Modal, kein separater Speichern-Button,
kein UX-Bruch.

---

## Kontext

- **Betrifft:** Alle Domänen- und Support-Objekte der App mit HTML-Textfeldern
  (Kurzbeschreibung, Beschreibung, Anmerkungen, Inhalt u. ä.)
- **Aktuelle Situation:** `RichTextEditor.tsx` — Eigenentwicklung auf Basis des veralteten
  `document.execCommand`-APIs — ist dauerhaft als Toolbar-Block in Formulare eingebettet
  und belegt Formularfläche unabhängig davon, ob der Nutzer editieren will.
- **Zielzustand:** `RichTextInlineField` — click-to-edit, kontextsensible schwebende
  Toolbar, kein Modal, kein separater Speichern-Flow. Verhalten analog zu Notion.
- **Tech Stack:** React + TypeScript + Tailwind + shadcn/ui + TanStack Query
- **Neue Abhängigkeit:** TipTap (`@tiptap/react` ^2, MIT-Lizenz)

---

## Aufgabe

### Schritt 1 — Inventur: Alle Verwendungsstellen ermitteln und dokumentieren

Grepe im gesamten `client/src`-Verzeichnis nach `RichTextEditor` und erstelle die
folgende Tabelle als Kommentar am Anfang von `rich-text-inline-field.tsx`:

```
// MIGRATION INVENTORY (RichTextEditor → RichTextInlineField)
// Datei                          | Feld         | testIdPrefix
// -------------------------------|--------------|---------------------------
// components/HelpTextForm.tsx    | body         | helptext-body
// components/ProjectForm.tsx     | description  | project-description
// ...                            | ...          | ...
```

**Diese Tabelle ist Pflicht und muss vollständig sein.**
Sie dient als Abnahmecheck: Jede Zeile entspricht einer Migration in Schritt 6.
Fehlende Zeilen = unvollständige Lieferung.

---

### Schritt 2 — TipTap installieren

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit \
  @tiptap/extension-underline \
  @tiptap/extension-text-align \
  @tiptap/extension-color \
  @tiptap/extension-text-style \
  @tiptap/extension-highlight \
  @tiptap/extension-placeholder
```

**Gate:** Prüfe nach Installation, dass kein `@tiptap/*`-Paket bereits in `package.json`
vorhanden war (kein Versionskonflikt). Alle genannten Pakete sind MIT-lizenziert.

---

### Schritt 3 — Hilfsfunktion `hasVisibleHtmlContent` extrahieren

In `project-article-description-renderer.tsx` existiert die interne Funktion
`hasVisibleDescriptionContent`. Diese Logik wird **verschoben** (nicht kopiert):

**Neue Datei:** `client/src/lib/html-utils.ts`

```typescript
/**
 * Prüft ob ein HTML-String sichtbaren Text enthält.
 * Leere Tags (<p></p>), &nbsp;, reine Whitespace-Strings gelten als leer.
 */
export function hasVisibleHtmlContent(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 0;
}
```

**Pflicht:** Die originale `hasVisibleDescriptionContent`-Funktion in
`project-article-description-renderer.tsx` wird **gelöscht** und durch einen Import ersetzt:

```typescript
import { hasVisibleHtmlContent } from "@/lib/html-utils";
```

Kein Duplikat. `npm run typecheck` bestätigt keine Breaking Changes.

---

### Schritt 4 — Kern: `RichTextInlineField` erstellen

**Datei:** `client/src/components/ui/rich-text-inline-field.tsx`

Die Migrations-Inventur aus Schritt 1 steht als Kommentar am Dateianfang.

#### 4a — Props

```typescript
interface RichTextInlineFieldProps {
  /** Aktueller HTML-Wert (kontrollierte Komponente) */
  value: string | null | undefined;
  /** Wird bei Blur aufgerufen mit dem neuen HTML-String.
   *  Aktualisiert den Formular-State des Parents. Kein direkter API-Call. */
  onChange: (html: string) => void;
  /** Platzhaltertext wenn leer (kein HTML, reiner Text) */
  placeholder?: string;
  /** Wenn true: reine Leseansicht, kein cursor-text, kein Hover-Indikator,
   *  kein TipTap-Mount, kein Edit-Modus auslösbar */
  readOnly?: boolean;
  /** Zusätzliche Tailwind-Klassen für den äußeren Container */
  className?: string;
  /** Präfix für data-testid-Attribute — muss je Verwendungsstelle eindeutig sein */
  testIdPrefix?: string;
}
```

#### 4b — Interner State

```typescript
const [isEditing, setIsEditing] = useState(false);
// Snapshot beim Aktivieren — wird bei Escape wiederhergestellt
const [originalValue, setOriginalValue] = useState<string>("");
```

#### 4c — Zwei visuelle Zustände

**Zustand 1 — Leseansicht** (`!isEditing`):

- `div` mit `dangerouslySetInnerHTML={{ __html: value ?? "" }}`
- Prose-Styling:
  `text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-0.5 [&_p]:mb-1`
- Ist `value` leer gemäß `hasVisibleHtmlContent`: zeigt `placeholder` in
  `text-muted-foreground text-sm italic` — **kein** `dangerouslySetInnerHTML`
- Wenn `!readOnly`: `cursor-text hover:bg-muted/40 rounded-md transition-colors`
- `onClick`: wenn `!readOnly` → `handleActivate()`
- `data-testid={testIdPrefix ? testIdPrefix + "-view" : undefined}`

**Zustand 2 — Editiermodus** (`isEditing`):

- Äußeres `div` mit `ring-1 ring-ring rounded-md`
- TipTap `EditorContent` (Schritt 4e)
- `data-testid={testIdPrefix ? testIdPrefix + "-editor" : undefined}`

**Wichtig:** TipTap wird **ausschließlich im Edit-Modus gemountet**
(`isEditing && <EditorContent ... />`). Kein Permanent-Mount.

#### 4d — Aktivierungslogik

```typescript
const handleActivate = () => {
  if (readOnly) return;
  setOriginalValue(value ?? "");
  setIsEditing(true);
};
```

#### 4e — TipTap Konfiguration

**Extensions:**

```typescript
const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Underline,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  Placeholder.configure({
    placeholder: placeholder ?? "Text eingeben …",
    showOnlyWhenEditable: true,
  }),
];
```

**Editor-Initialisierung:**

```typescript
const editor = useEditor({
  extensions,
  content: value ?? "",
  autofocus: "end",
  onBlur: ({ editor }) => {
    setIsEditing(false);
    onChange(editor.getHTML());
  },
});
```

**Escape-Handler:**

```typescript
useEffect(() => {
  if (!editor) return;
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      editor.commands.setContent(originalValue);
      editor.commands.blur();
      // onBlur feuert → setIsEditing(false) + onChange(originalValue)
    }
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [editor, originalValue]);
```

#### 4f — BubbleMenu (schwebende Formatierungs-Toolbar)

Erscheint ausschließlich bei Textmarkierung.

**Kritisch:** Alle Toolbar-Buttons müssen `onMouseDown={(e) => e.preventDefault()}` haben.
Ohne das verliert der Editor den Fokus beim Button-Klick → Blur feuert zu früh →
BubbleMenu verschwindet bevor das Format angewendet wird.

```tsx
<BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
  <div className="flex items-center gap-0.5 rounded-lg border bg-popover shadow-md p-1">
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleBold().run()}
      active={editor.isActive("bold")} title="Fett" icon={<Bold />} />
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleItalic().run()}
      active={editor.isActive("italic")} title="Kursiv" icon={<Italic />} />
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleUnderline().run()}
      active={editor.isActive("underline")} title="Unterstrichen" icon={<Underline />} />
    <Separator />
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      active={editor.isActive("heading", { level: 1 })} title="Überschrift 1" icon={<Heading1 />} />
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      active={editor.isActive("heading", { level: 2 })} title="Überschrift 2" icon={<Heading2 />} />
    <Separator />
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleBulletList().run()}
      active={editor.isActive("bulletList")} title="Aufzählung" icon={<List />} />
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleOrderedList().run()}
      active={editor.isActive("orderedList")} title="Nummerierte Liste" icon={<ListOrdered />} />
    <Separator />
    <ToolbarButton
      onClick={() => editor.chain().focus().setTextAlign("left").run()}
      active={editor.isActive({ textAlign: "left" })} title="Links" icon={<AlignLeft />} />
    <ToolbarButton
      onClick={() => editor.chain().focus().setTextAlign("center").run()}
      active={editor.isActive({ textAlign: "center" })} title="Mitte" icon={<AlignCenter />} />
    <ToolbarButton
      onClick={() => editor.chain().focus().setTextAlign("right").run()}
      active={editor.isActive({ textAlign: "right" })} title="Rechts" icon={<AlignRight />} />
  </div>
</BubbleMenu>
```

**Interne Hilfskomponenten** (kein Export, nur in dieser Datei):

```typescript
function ToolbarButton({ onClick, active, title, icon }: {
  onClick: () => void;
  active: boolean;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // MUSS vorhanden sein
      onClick={onClick}
      title={title}
      className={cn(
        "h-7 w-7 rounded flex items-center justify-center transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "hover:bg-muted text-muted-foreground hover:text-foreground"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { className: "w-3.5 h-3.5" })}
    </button>
  );
}

function Separator() {
  return <div className="w-px h-5 bg-border mx-0.5" />;
}
```

#### 4g — FloatingMenu (Block-Auswahl auf leerer Zeile)

Erscheint wenn der Cursor auf einer komplett leeren Zeile steht.

```tsx
<FloatingMenu editor={editor} tippyOptions={{ duration: 100 }}>
  <div className="flex items-center gap-0.5 rounded-lg border bg-popover shadow-md p-1">
    <ToolbarButton
      onClick={() => editor.chain().focus().setParagraph().run()}
      active={editor.isActive("paragraph")} title="Absatz" icon={<Text />} />
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      active={editor.isActive("heading", { level: 1 })} title="Überschrift 1" icon={<Heading1 />} />
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      active={editor.isActive("heading", { level: 2 })} title="Überschrift 2" icon={<Heading2 />} />
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleBulletList().run()}
      active={editor.isActive("bulletList")} title="Aufzählung" icon={<List />} />
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleOrderedList().run()}
      active={editor.isActive("orderedList")} title="Nummeriert" icon={<ListOrdered />} />
  </div>
</FloatingMenu>
```

#### 4h — Hover-Indikator

```tsx
<div className={cn("relative group", className)}>
  {/* Leseansicht oder Editor */}
  ...
  {!readOnly && !isEditing && (
    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100
                    transition-opacity pointer-events-none">
      <Pencil className="w-3 h-3 text-muted-foreground" />
    </div>
  )}
</div>
```

#### 4i — CSS-Ergänzungen (Pflicht)

In `client/src/index.css` die folgenden Regeln ergänzen.
**Ohne diese Regeln ist die Komponente visuell defekt — kein optionales Nice-to-have.**

```css
/* ProseMirror: kein Browser-Outline — Ring kommt vom äußeren div */
.ProseMirror:focus {
  outline: none;
}

/* Mindesthöhe im Edit-Modus */
.ProseMirror {
  min-height: 80px;
  padding: 0.5rem 0.75rem;
}

/* Placeholder via TipTap Placeholder Extension */
.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: hsl(var(--muted-foreground));
  font-style: italic;
  pointer-events: none;
  float: left;
  height: 0;
}
```

---

### Schritt 5 — Tests schreiben

Tests werden **vor der Migration** in Schritt 6 geschrieben, damit jede migrierte
Verwendungsstelle sofort gegen eine grüne Test-Suite läuft.

#### 5a — Teststrategie: Drei Ebenen, klare Verantwortlichkeiten

**Ebene 1 — Komponenten-Tests (Vitest + jsdom)**
Datei: `tests/unit/components/ui/rich-text-inline-field.test.tsx`

Testet ausschließlich was ohne echten Browser prüfbar ist: DOM-Struktur, Placeholder-
Logik, readOnly-Verhalten, Zustandswechsel anhand der `data-testid`-Attribute.

**Wichtiger Hinweis zu TipTap in jsdom:** ProseMirror/TipTap benötigt echte Browser-DOM-
APIs, die jsdom nicht vollständig bereitstellt. Deshalb wird `@tiptap/react` gemockt.
Das Mock simuliert den Editor für Blur- und Escape-Tests. Die Leseansicht wird niemals
gemockt — sie wird immer echt gerendert.

```typescript
// Minimal-Mock für @tiptap/react — am Anfang der Testdatei
vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn((config) => ({
    getHTML: vi.fn(() => "<p>mock content</p>"),
    commands: {
      setContent: vi.fn(),
      blur: vi.fn(() => {
        config.onBlur?.({
          editor: { getHTML: () => "<p>mock content</p>" }
        });
      }),
    },
    isActive: vi.fn(() => false),
    chain: vi.fn(() => ({
      focus: vi.fn(() => ({
        toggleBold: vi.fn(() => ({ run: vi.fn() })),
      })),
    })),
    destroy: vi.fn(),
  })),
  EditorContent: () => <div data-testid="tiptap-editor-content" />,
  BubbleMenu: ({ children }: { children: React.ReactNode }) =>
    <div data-testid="bubble-menu">{children}</div>,
  FloatingMenu: ({ children }: { children: React.ReactNode }) =>
    <div data-testid="floating-menu">{children}</div>,
}));
```

**Pflichthafte Unit-Tests — alle 13 müssen existieren und grün sein:**

```
T-01  Leseansicht: rendert value als HTML (prüfe innerHTML des view-Elements)
T-02  Leseansicht leer: zeigt placeholder-Text wenn value null
T-03  Leseansicht leer: zeigt placeholder-Text wenn value undefined
T-04  Leseansicht leer: zeigt placeholder-Text wenn value ""
T-05  Leseansicht leer: zeigt placeholder-Text wenn value "<p></p>" (leerer Tag)
T-06  readOnly true: kein Hover-Indikator im DOM
T-07  readOnly true: Click auf Feld → editor-testid erscheint NICHT im DOM
T-08  Aktivierung: Click auf Feld (readOnly=false) → editor-testid erscheint im DOM
T-09  Aktivierung: Click auf Feld → view-testid verschwindet aus dem DOM
T-10  Blur (gemockt): onChange wird mit dem Editor-HTML aufgerufen
T-11  Escape (gemockt): onChange wird mit originalValue aufgerufen, nicht mit neuem Inhalt
T-12  testIdPrefix gesetzt: view-testid und editor-testid enthalten den Präfix korrekt
T-13  kein testIdPrefix: keine data-testid-Attribute vorhanden (querySelectorAll gibt 0 zurück)
```

**Ebene 2 — Formular-Integrationstests (je migriertes Formular)**

Für jede Datei aus der Migrations-Inventur (Schritt 1) muss ein Testfall existieren
oder aktualisiert werden. Diese Tests prüfen die Integration zwischen Formular-State
und Komponente — nicht das Editing-Verhalten selbst.

Pro Formular sind **mindestens** diese drei Assertions Pflicht:

```
F-01  Das RichTextInlineField rendert mit dem korrekten initialen Wert
      → getByTestId("{testIdPrefix}-view") hat den erwarteten HTML-Inhalt

F-02  Nach Simulation von onChange wird der neue Wert in den Formular-State übernommen
      → Beim Submit-Call enthält das Payload das aktualisierte HTML-Feld

F-03  Im readOnly-Kontext (falls zutreffend): kein editor-testid im DOM nach Click
```

Diese Assertions werden in den **bestehenden Formular-Testdateien** ergänzt oder
aktualisiert — keine neuen Testdateien je Formular notwendig, solange die Tests in der
bestehenden Datei ergänzt werden.

**Ebene 3 — Playwright E2E (bestehende Suite aktualisieren)**

Falls Playwright-Tests für betroffene Formulare existieren, müssen veraltete
`data-testid`-Selektoren aktualisiert werden:

- `richtext-editor` → `{testIdPrefix}-view` (Leseansicht) oder `{testIdPrefix}-editor`
- `button-bold`, `button-italic` etc. → entfallen als direkte Selektoren;
  BubbleMenu-Interaktion erfolgt über Textmarkierung + Sichtbarkeit von `[data-testid="bubble-menu"]`

---

### Schritt 6 — Migration: alle Verwendungsstellen ersetzen

Für jede Zeile der Migrations-Inventur aus Schritt 1:

**Vorher:**
```tsx
<RichTextEditor
  value={body}
  onChange={setBody}
  placeholder="Inhalt eingeben..."
/>
```

**Nachher:**
```tsx
<RichTextInlineField
  value={body}
  onChange={setBody}
  placeholder="Inhalt eingeben..."
  testIdPrefix="helptext-body"   // eindeutiger Präfix je Formular + Feld
/>
```

Das `onChange`-Verhalten ändert sich nicht: lokaler State-Update, kein API-Call.
Der Formular-Speichern-Button des Parents sendet alles — unverändert.

**Keine Migration = kein Abschluss.** Die Inventur-Tabelle ist die Checkliste.

---

### Schritt 7 — `RichTextEditor.tsx` löschen (Pflicht, nicht optional)

```bash
rm client/src/components/RichTextEditor.tsx
npm run typecheck
```

`npm run typecheck` **muss fehlerfrei durchlaufen.**
Schlägt typecheck fehl, sind noch Verwendungsstellen nicht migriert → zurück zu Schritt 6.
Die Datei darf erst gelöscht werden wenn alle Migrationen abgeschlossen sind.
Die Datei **muss** gelöscht sein bevor der Auftrag als abgeschlossen gilt.

---

### Schritt 8 — Gesamtprüfung

```bash
npm run typecheck   # Exit-Code 0 erwartet
npm run test        # Exit-Code 0 erwartet — alle Unit-Tests grün
```

Beide Befehle müssen ohne Fehler durchlaufen. Kein Auftrag gilt als abgeschlossen
solange einer der beiden rot ist.

---

## Regeln & Einschränkungen

- **Kein direkter API-Call** aus `RichTextInlineField`. Rein kontrollierte Input-Komponente.
- **`onMouseDown` mit `preventDefault`** auf allen BubbleMenu- und FloatingMenu-Buttons
  ist nicht optional — ohne es bricht das Formatting-Verhalten grundlegend.
- **XSS:** `dangerouslySetInnerHTML` ist etabliertes Pattern der App. Content stammt
  ausschließlich aus dem eigenen TipTap-Editor.
- **`readOnly={true}`:** Kein TipTap-Mount, kein `cursor-text`, kein Hover-Indikator,
  kein `onClick`. Exakt nur Leseansicht — nichts weiter.
- **Leerer Inhalt:** Immer via `hasVisibleHtmlContent` aus `lib/html-utils.ts` prüfen.
  Niemals direkt `if (!value)` — das behandelt `<p></p>` fälschlich als nicht-leer.
- **CSS in `index.css` ist Pflicht.** Ohne die drei Regeln ist der Editor visuell defekt.
- **Kein TODO-Kommentar** im abgelieferten Code. Offene Punkte gehören in den
  Abschlussbericht, nicht in den Code.
- **TipTap v2**, nicht v3. Vor Installation prüfen, dass kein `@tiptap/*` bereits in
  `package.json` steht.
- **Keine TipTap Pro-Features:** Ausschließlich MIT-lizenzierte Extensions.

---

## Randfälle & Fehlerpfade

- **Escape:** Editor setzt Inhalt auf `originalValue`, `blur()` feuert, `onChange` wird
  mit dem Originalwert aufgerufen — kein Datenverlust, keine Inkonsistenz.
- **Blur in ein anderes Formularfeld:** Browser feuert blur am TipTap-Editor →
  `onChange` + `setIsEditing(false)`. Das andere Feld erhält seinen Fokus normal.
- **Mehrere Felder im selben Formular:** Jedes hat eigenen State. Editiermodus-Wechsel
  eines Feldes löst blur des anderen aus → nie gleichzeitig aktiv.
- **Leerer Initialwert:** TipTap akzeptiert `""` problemlos.
- **`value` ändert sich von außen während Edit-Modus:** Wird ignoriert — TipTap hat
  kein reaktives value-Binding nach dem Mount. Akzeptables Verhalten.
- **`null` / `undefined` als `value`:** Immer als leerer String behandeln. Kein Crash.
- **Sehr langer Inhalt:** Kein festes `max-height` — Scrolling ist Aufgabe des Parents.

---

## Seiteneffekte

- **`lib/html-utils.ts`:** Neue Datei. Wird von `RichTextInlineField` und
  `project-article-description-renderer.tsx` importiert.
- **`project-article-description-renderer.tsx`:** Interne `hasVisibleDescriptionContent`
  gelöscht, Import aus `lib/html-utils.ts` hinzugefügt. Kein Verhalten ändert sich.
- **`HelpTextForm.tsx`:** `body`-Feld migriert. Kein weiterer Seiteneffekt.
- **`ProjectForm.tsx`:** Betroffene Felder migriert. `ProjectSaveReviewDialog`-Flow
  unverändert.
- **Weitere Formulare:** Identisches Migrationsmuster nach Inventur.
- **`index.css`:** Drei ProseMirror-Regeln ergänzt.
- **`package.json` / `package-lock.json`:** TipTap-Pakete hinzugefügt.

---

## Definition of Done

Der Auftrag gilt **ausschließlich** als abgeschlossen wenn alle 21 Punkte erfüllt sind.
Punkte die mit einem Tool verifizierbar sind, werden verifiziert — nicht nur behauptet.

```
[ ]  1. Migrations-Inventur-Tabelle vollständig in rich-text-inline-field.tsx vorhanden
[ ]  2. lib/html-utils.ts existiert mit exportierter hasVisibleHtmlContent
[ ]  3. hasVisibleDescriptionContent in project-article-description-renderer.tsx gelöscht,
         Import aus lib/html-utils.ts vorhanden — kein Duplikat
[ ]  4. RichTextInlineField existiert unter client/src/components/ui/rich-text-inline-field.tsx
[ ]  5. Leseansicht rendert HTML korrekt via dangerouslySetInnerHTML
[ ]  6. Leseansicht zeigt Placeholder bei null / undefined / "" / leer-tag-value
[ ]  7. Click aktiviert Edit-Modus: view-testid verschwindet, editor-testid erscheint
[ ]  8. BubbleMenu vorhanden, jeder Button hat onMouseDown preventDefault
[ ]  9. FloatingMenu vorhanden
[ ] 10. Hover-Indikator (Pencil-Icon) vorhanden, bei readOnly=true nicht im DOM
[ ] 11. readOnly=true: kein Hover-Indikator, kein cursor-text, kein TipTap-Mount,
         kein Edit-Modus nach Click auslösbar
[ ] 12. Escape: onChange mit originalValue aufgerufen, nicht mit geändertem Inhalt
[ ] 13. Alle drei CSS-Regeln in index.css ergänzt (ProseMirror outline, min-height, placeholder)
[ ] 14. Jede Zeile der Inventur ist migriert — testIdPrefix je Feld gesetzt
[ ] 15. RichTextEditor.tsx existiert nicht mehr
         → Verifikation: ls client/src/components/RichTextEditor.tsx → "not found"
[ ] 16. npm run typecheck → Exit-Code 0
[ ] 17. Unit-Tests T-01 bis T-13 existieren in rich-text-inline-field.test.tsx und sind grün
[ ] 18. Formular-Tests F-01 bis F-03 je migriertem Formular existieren oder wurden aktualisiert
[ ] 19. Playwright-Tests (falls vorhanden): alle richtext-editor / button-bold etc.
         Selektoren auf neue testIdPrefix-Konvention aktualisiert
[ ] 20. Kein TODO-Kommentar im Code
[ ] 21. npm run test → Exit-Code 0
```
