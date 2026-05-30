# Codex-Auftrag: RichTextEditor – Custom Column Node (Mehrspaltiges Layout)

**Parent:** MILE-24 — Redesign Stammdaten Formulare  
**Datum:** 2026-05-29  
**Aufgaben-ID:** TASK-127

---

## Ziel

Mehrspaltige Layouts im Rich-Text-Editor ermöglichen. Da `@tiptap-pro/extension-columns` kostenpflichtig und nicht installiert ist, wird ein eigener ProseMirror/Tiptap-Node implementiert.

## Hintergrund & Kontext

Nutzer möchten Inhalte in Wiki-Seiten und Beschreibungsfeldern mehrspaltig layouten. Tiptap Pro bietet dafür `@tiptap-pro/extension-columns`, das aber ein kostenpflichtiges Abo erfordert. Die eigene Implementierung gibt vollständige Kontrolle über Serialisierung, Styling und Verhalten. Tiptap v3 (aktuell `^3.23.5`) stellt alle nötigen APIs bereit.

## Aufgabe

### 1. Neue Datei: `apps/web/src/components/ui/tiptap-column-node.ts`

**Node: `ColumnBlock` (Container)**
```typescript
import { Node, mergeAttributes } from '@tiptap/core'

export const ColumnBlock = Node.create({
  name: 'columnBlock',
  group: 'block',
  content: 'column+',
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-type="column-block"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column-block', class: 'column-block' }), 0]
  },
})
```

**Node: `Column` (Einzelne Spalte)**
```typescript
export const Column = Node.create({
  name: 'column',
  group: 'column',
  content: 'block+',
  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column', class: 'column' }), 0]
  },
})
```

### 2. Toolbar-Button „Spalten" in `rich-text-inline-field.tsx`

```typescript
// Toolbar-Command: 2-spaltigen ColumnBlock einfügen
editor.chain().focus().insertContent({
  type: 'columnBlock',
  content: [
    { type: 'column', content: [{ type: 'paragraph' }] },
    { type: 'column', content: [{ type: 'paragraph' }] },
  ],
}).run()
```
- Icon: `Columns2` aus `lucide-react` (oder ähnliches)
- Position: in der Toolbar nach Block-Buttons (Code Block, Blockquote)

### 3. Extensions registrieren in `rich-text-inline-field.tsx`

```typescript
import { ColumnBlock, Column } from './tiptap-column-node'
// ...
extensions: [
  StarterKit.configure(...),
  ColumnBlock,
  Column,
  // ... rest
]
```

### 4. CSS in der globalen Stylesheet-Datei (oder Tailwind `@layer`)

```css
.column-block {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.column {
  min-width: 0; /* wichtig für Grid */
}

/* Responsive: auf kleinen Viewports einspaltig */
@media (max-width: 640px) {
  .column-block {
    grid-template-columns: 1fr;
  }
}
```

### 5. Cursor-Navigation

- Tab-Taste in der letzten Zelle der rechten Spalte: Cursor springt hinter den `ColumnBlock`
- Arrow-Navigation zwischen Spalten: ProseMirror-Standard-Verhalten reicht aus; kein Custom-Keymap nötig

## Technische Leitplanken

- Kein Breaking Change an bestehenden Extensions
- HTML-Serialisierung muss Round-Trip-sicher sein: Editor → HTML → Editor → identisches Dokument
- `tiptap-markdown`-Extension (`html: true`) muss den `ColumnBlock`-HTML-Output korrekt parsen — testen!
- Keine externen npm-Pakete hinzufügen
- Tiptap v3 API (`Node.create`, `mergeAttributes`) — keine deprecated v1/v2 APIs

## Regeln & Randfälle

- Leerer `ColumnBlock` (alle Spalten leer): muss löschbar sein (Backspace am Anfang einer leeren Spalte entfernt die Spalte; letzter Column entfernt den ganzen ColumnBlock)
- Copy-Paste eines ColumnBlocks: muss funktionieren
- `tiptap-markdown` normalisiert beim Parse eventuell den Baum — sicherstellen, dass `data-type`-Attribute erhalten bleiben (ggf. `html: true` in der Markdown-Extension reicht)

## Seiteneffekte

- Bestehende Dokumente ohne `columnBlock` sind nicht betroffen
- Die neuen CSS-Klassen `.column-block` und `.column` müssen scope-sicher sein (kein Konflikt mit anderen UI-Klassen)

## Testanforderungen

- Manuell: Toolbar-Button fügt 2-spaltigen Block ein; Text in beiden Spalten eintippbar
- Manuell: Spalten-Inhalt speichern und nach Reload korrekt laden
- Manuell: Auf schmalem Viewport (<640 px) wird einspaltig gerendert
- Unit: `ColumnBlock`- und `Column`-Nodes rendern korrektes HTML

## Abnahmekriterien

- Toolbar-Button „Spalten" erscheint in der `full`-Toolbar
- 2-spaltiger Block wird korrekt eingefügt und ist editierbar
- HTML-Serialisierung ist Round-Trip-sicher
- Responsives Verhalten: einspaltig auf kleinen Bildschirmen
- Keine Regression bei bestehenden Editor-Funktionen
