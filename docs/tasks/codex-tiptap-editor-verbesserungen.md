# Codex-Auftrag: TipTap-Editor-Verbesserungen

**Datei:** `apps/web/src/components/ui/rich-text-inline-field.tsx`
**Priorität:** Hoch — betrifft alle Beschreibungsfelder in der App

---

## Kontext

Der `RichTextInlineField`-Editor (TipTap) ist in allen Formularen für Beschreibungsfelder im Einsatz (Tasks, Features, Backlog, Wiki, Notes, Tickets, Milestones, Use Cases, Events, Comments — siehe Migrations-Inventar oben in der Datei). Es gibt drei konkrete Usability-Probleme, die behoben werden müssen.

---

## Problem 1: Toolbar scrollt aus dem Sichtfeld

### Symptom
Bei langen Inhalten scrollt die Toolbar oben aus dem sichtbaren Bereich heraus, weil `position: sticky` durch den `overflow-hidden`-Container gebrochen wird.

### Ursache
In `RichTextInlineEditor` hat der äußere Container-`div` die Klasse `overflow-hidden`. Das erzeugt einen neuen Scroll-Container, der `position: sticky` an Kindelementen deaktiviert.

### Fix

**Container-div** (Zeile 314): `overflow-hidden` durch `overflow-clip` ersetzen.
`overflow-clip` verhindert visuellen Überlauf, erzeugt aber keinen Scroll-Container und bricht Sticky nicht.

```tsx
// Vorher:
<div className="overflow-hidden rounded-md border border-steel-600 bg-white shadow-sm ring-2 ring-steel-700/10">

// Nachher:
<div className="overflow-clip rounded-md border border-steel-600 bg-white shadow-sm ring-2 ring-steel-700/10">
```

**Toolbar-`div`** in `RichTextToolbar` (Zeile 340): `sticky top-0 z-10` hinzufügen.

```tsx
// Vorher:
<div data-testid="rich-text-toolbar" className="flex flex-wrap items-center gap-1 rounded-t-md border-b border-line bg-shell p-1.5">

// Nachher:
<div data-testid="rich-text-toolbar" className="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-t-md border-b border-line bg-shell p-1.5">
```

---

## Problem 2: Seltsame Formatierung beim Einfügen externer Inhalte (z.B. aus .md-Dateien)

### Symptom
Beim Einfügen von einfachem Markdown-Text (Headings, Fließtext, Aufzählungen) aus einem Texteditor erscheinen:
- Ungewöhnliche Schriftfarben im eingefügten Text
- Riesige Leerräume zwischen Abschnitten

### Ursachen

**Farben:** TipTap erbt die `Color`- und `TextStyle`-Marks vom aktuellen Cursor-Kontext. Stand der Cursor zufällig in einem farblich hervorgehobenen Bereich, überträgt TipTap diese Marks auf den gesamten eingefügten Inhalt — auch wenn der Markdown-Text selbst keinerlei Farbinformation enthält.

**Leerräume:** Jede Leerzeile im `.md`-File zwischen Abschnitten wird von der `tiptap-markdown`-Extension zu einem leeren `<p>`-Node. Mehrere aufeinanderfolgende Leerzeilen (wie sie in strukturierten Markdown-Dokumenten üblich sind) ergeben gestapelte Leerabsätze.

### Fix

In `RichTextInlineEditor` die `useEditor`-Konfiguration um zwei `editorProps`-Einträge erweitern:

```ts
editorProps: {
  attributes: editorAttributes,

  // Leerzeilen normalisieren: max. eine Leerzeile zwischen Absätzen
  transformPastedText(text: string): string {
    return text.replace(/\n{3,}/g, "\n\n");
  },

  // Geerbte Color/TextStyle-Marks nach dem Paste entfernen
  handlePaste(view, event, slice): boolean {
    // Paste normal durch die Extension-Kette laufen lassen
    return false; // false = nicht selbst behandeln, Standard-Handling bleibt aktiv
  }
},
```

Zusätzlich muss nach jedem Paste-Event `unsetColor()` und `unsetMark('textStyle')` auf den neu eingefügten Bereich angewendet werden. Da TipTap keinen direkten "after-paste"-Hook bietet, erfolgt das über einen `onTransaction`-Handler im Editor:

```ts
const editor = useEditor({
  extensions,
  content: value,
  // ...
  onTransaction({ editor: activeEditor, transaction }) {
    // Nur bei Paste-Transaktionen (erkennbar am Meta-Flag)
    if (!transaction.getMeta("paste")) return;

    // Farbmarks im gesamten Dokument entfernen, die durch den Paste entstanden sind
    activeEditor.chain()
      .selectAll()          // Selektion auf gesamten Inhalt
      .unsetColor()         // Color-Extension: alle color-Marks entfernen
      .unsetMark("textStyle") // TextStyle-Extension: leere textStyle-Wrapper entfernen
      .setTextSelection(transaction.selection) // Cursor zurücksetzen
      .run();
  }
});
```

**Hinweis:** `selectAll` + `unsetColor` ist aggressiv — es entfernt auch Farben, die der Nutzer *bewusst* gesetzt hat. Falls das ein Problem wird, muss stattdessen nur der eingefügte Bereich (via `transaction.selection`) bereinigt werden. Das ist komplexer; als erster Schritt ist die aggressive Variante akzeptabel und kann später verfeinert werden.

---

## Problem 3: Bilder aus der Zwischenablage einfügen (Upload-Hack)

### Ziel
Nutzer sollen ein Bild per `Strg+V` aus der Zwischenablage oder über einen Datei-Picker direkt in den Editor einfügen können. Das Bild wird als Attachment hochgeladen und die resultierende URL automatisch in den Editor eingefügt.

### Architektur

Die App verfügt bereits über ein Attachment-System mit entitätsspezifischen Upload-Endpunkten:
- `POST /tasks/{id}/attachments`
- `POST /features/{id}/attachments`
- `POST /projects/{id}/attachments`
- `POST /milestones/{id}/attachments`

Uploaded Dateien werden unter `/uploads/{uuid-filename}` statisch ausgeliefert (konfiguriert in `apps/api/src/plugins/static.ts`).

Die URL-Konstruktion erfolgt mit der bereits vorhandenen Hilfsfunktion:
```ts
// apps/web/src/api/client.ts
export function assetUrl(path: string): string {
  const origin = apiBaseUrl.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}
```

### Schritt 1: Neues Prop an `RichTextInlineFieldProps`

```ts
interface RichTextInlineFieldProps {
  // ... bestehende Props ...

  /**
   * Optionale Upload-Funktion für Bild-Pastes und Datei-Picker im Editor.
   * Erhält eine Bilddatei, gibt die einzufügende Bild-URL zurück.
   * Wenn nicht angegeben, ist die Bild-Upload-Funktion deaktiviert.
   */
  onImageUpload?: (file: File) => Promise<string>;
}
```

Das Prop wird durchgereicht von `RichTextInlineField` → `RichTextInlineEditor` → `useEditor` + Toolbar.

### Schritt 2: Bild-Paste-Handler in `RichTextInlineEditor`

In der `useEditor`-Konfiguration ergänzen:

```ts
editorProps: {
  attributes: editorAttributes,
  transformPastedHTML: /* ... siehe Problem 2 ... */,
  handlePaste(view, event): boolean {
    if (!onImageUpload) return false;

    const items = Array.from(event.clipboardData?.items ?? []);
    const imageItem = items.find((item) => item.type.startsWith("image/"));
    if (!imageItem) return false;

    const file = imageItem.getAsFile();
    if (!file) return false;

    event.preventDefault();

    void onImageUpload(file).then((url) => {
      view.dispatch(
        view.state.tr.replaceSelectionWith(
          view.state.schema.nodes.image.create({ src: url })
        )
      );
    });

    return true;
  }
},
```

### Schritt 3: Toolbar-Button "Bild" erweitern

Die bestehende `setImage`-Funktion (Zeile 399–407) nur mit URL-Prompt ist unzureichend.
Ersetzen durch einen kombinierten Handler:

```ts
function handleImageInsert(editor: Editor, onImageUpload?: (file: File) => Promise<string>) {
  if (onImageUpload) {
    // Datei-Picker öffnen (unsichtbares Input-Element)
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      void onImageUpload(file).then((url) => {
        editor.chain().focus().setImage({ src: url }).run();
      });
    };
    input.click();
  } else {
    // Fallback: URL-Prompt (bisheriges Verhalten)
    const src = window.prompt("Bild-URL");
    if (src?.trim()) {
      editor.chain().focus().setImage({ src: src.trim() }).run();
    }
  }
}
```

Im Toolbar-Button:
```tsx
<ToolbarButton
  onClick={() => handleImageInsert(editor, onImageUpload)}
  active={false}
  title="Bild einfügen"
  icon={<ImageIcon />}
/>
```

### Schritt 4: Aufrufende Komponenten verdrahten

Folgende Komponenten verwenden bereits die Attachment-API und sollen das `onImageUpload`-Prop erhalten. Für jede Komponente eine lokale Upload-Funktion ergänzen, die die entitätsspezifische Upload-Funktion aufruft und `assetUrl('/uploads/' + attachment.filename)` zurückgibt.

| Komponente | Upload-Funktion | Attachment-Typ |
|---|---|---|
| `components/tasks/TaskForm.tsx` | `uploadTaskAttachment(taskId, file)` | task |
| `components/features/FeatureForm.tsx` | `uploadFeatureAttachment(featureId, file)` | feature |
| `components/features/FeatureDetail.tsx` | `uploadFeatureAttachment(featureId, file)` | feature |
| `components/projects/ProjectForm.tsx` | `uploadProjectAttachment(projectId, file)` | project |
| `components/milestones/MilestoneForm.tsx` | `uploadMilestoneAttachment(milestoneId, file)` | milestone |
| `components/notes/NoteEditor.tsx` | — (kein Attachment-Kontext, Prop weglassen) | — |
| `components/wiki/WikiPageForm.tsx` | — (kein Attachment-Kontext, Prop weglassen) | — |

**Beispiel für TaskForm:**
```tsx
import { uploadTaskAttachment } from "../../api/attachments";
import { assetUrl } from "../../api/client";

// In der Komponente:
const handleImageUpload = task
  ? async (file: File): Promise<string> => {
      const attachment = await uploadTaskAttachment(task.id, file);
      return assetUrl(`/uploads/${attachment.filename}`);
    }
  : undefined;

// Im JSX:
<RichTextInlineField
  value={description}
  onChange={setDescription}
  onImageUpload={handleImageUpload}
  // ...
/>
```

**Wichtig:** Beim Erstellen eines neuen Tasks (kein `task.id` vorhanden) ist `onImageUpload` undefined — das ist akzeptabel, da der User das Bild nach dem Speichern nachtragen kann.

### Schritt 5: Visuelles Feedback während des Uploads

Während das Bild hochgeladen wird, soll im Editor ein Platzhalter erscheinen (z.B. Text `[Bild wird hochgeladen…]`), der nach erfolgreichem Upload durch das `<img>`-Node ersetzt wird.

```ts
void onImageUpload(file).then((url) => {
  // Platzhalter-Node einfügen
  const placeholderPos = view.state.selection.from;
  const tr = view.state.tr.insertText("[Bild wird hochgeladen…]");
  view.dispatch(tr);

  return url;
}).then((url) => {
  // Platzhalter durch Bild ersetzen
  const { from, to } = view.state.selection;
  view.dispatch(
    view.state.tr
      .delete(placeholderPos, placeholderPos + "[Bild wird hochgeladen…]".length)
      .insert(placeholderPos, view.state.schema.nodes.image.create({ src: url }))
  );
});
```

**Alternativ** (einfacher, weniger Code): Kein Platzhalter, stattdessen einen Spinner im Toolbar-Button während des Uploads anzeigen (disabled state + Ladeanzeige).

---

## Zusammenfassung der Änderungen

| # | Datei | Art der Änderung |
|---|---|---|
| 1 | `rich-text-inline-field.tsx` | `overflow-hidden` → `overflow-clip` am Editor-Container |
| 2 | `rich-text-inline-field.tsx` | `sticky top-0 z-10` an Toolbar-div |
| 3 | `rich-text-inline-field.tsx` | `transformPastedText` in editorProps: Leerzeilen normalisieren + `onTransaction` Color/TextStyle-Marks nach Paste entfernen |
| 4 | `rich-text-inline-field.tsx` | Neues Prop `onImageUpload?: (file: File) => Promise<string>` |
| 5 | `rich-text-inline-field.tsx` | `handlePaste` in editorProps für Bild-Clipboard-Erkennung |
| 6 | `rich-text-inline-field.tsx` | `handleImageInsert()` mit Datei-Picker statt reinem URL-Prompt |
| 7 | `tasks/TaskForm.tsx` | `onImageUpload`-Prop mit `uploadTaskAttachment` verdrahten |
| 8 | `features/FeatureForm.tsx` | `onImageUpload`-Prop mit `uploadFeatureAttachment` verdrahten |
| 9 | `features/FeatureDetail.tsx` | `onImageUpload`-Prop mit `uploadFeatureAttachment` verdrahten |
| 10 | `projects/ProjectForm.tsx` | `onImageUpload`-Prop mit `uploadProjectAttachment` verdrahten |
| 11 | `milestones/MilestoneForm.tsx` | `onImageUpload`-Prop mit `uploadMilestoneAttachment` verdrahten |

---

## Nicht-Ziele

- Kein neuer generischer Upload-Endpunkt auf API-Seite notwendig
- Kein neues UI-Attachment-Panel — die bestehende `AttachmentList` bleibt unverändert
- Keine Änderung an Tickets, Comments, Wiki-Forms (kein Attachment-Kontext vorhanden)
- Keine Datenbank-Migrationen

---

## Testfälle

1. Editor mit langem Inhalt öffnen → Toolbar bleibt beim Scrollen oben sichtbar
2. Formatierten Text aus GitHub-Markdown-Rendering einfügen → keine Inline-Styles, keine Farbfehler
3. Markdown-Text mit mehreren Leerzeilen zwischen Abschnitten einfügen → keine riesigen Leerräume, max. ein Leerabsatz
4. Bild aus Zwischenablage (Screenshot) in TaskForm einfügen → Bild erscheint im Editor, Attachment-Eintrag in der Task-Attachment-Liste
5. Toolbar-Button "Bild" in FeatureForm → Datei-Picker öffnet sich, nach Auswahl erscheint Bild
6. `onImageUpload` nicht übergeben (z.B. WikiPageForm) → Toolbar-Button "Bild" zeigt URL-Prompt wie bisher
