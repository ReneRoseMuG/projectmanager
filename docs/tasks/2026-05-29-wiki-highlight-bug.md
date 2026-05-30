# Codex-Auftrag: Wiki – Highlight-Bug beheben (Wort-Selektion expandiert auf ganzen Satz)

**Parent:** MILE-24 — Redesign Stammdaten Formulare  
**Datum:** 2026-05-29  
**Aufgaben-ID:** TASK-136  
**Verknüpftes Ticket:** TICKET-25

---

## Ziel

Das Highlight-Verhalten im Wiki-Editor reparieren: Wenn ein einzelnes Wort selektiert und hervorgehoben wird, darf nur dieses Wort eingefärbt werden — nicht der gesamte Satz oder Text-Node.

## Hintergrund & Kontext

**Symptom:** In `WikiPageDetail` (verwendet `RichTextInlineField`) wird nach dem Markieren eines einzelnen Wortes und Klick auf den Highlight-Toolbar-Button der gesamte umgebende Satz/Absatz eingefärbt.

**Ursache (analysiert):**  
`tiptap-markdown` ist mit `html: true` konfiguriert. Beim Parsen eines HTML-Dokuments normalisiert ProseMirror den Node-Baum: benachbarte Text-Nodes werden zusammengeführt (merged). Wenn nun der `Highlight`-Mark angewendet wird, kennt ProseMirror nur den zusammengeführten, großen Text-Node und expandiert den Mark auf den gesamten Node — statt auf die ursprüngliche Selektion.

**Relevante Datei:** `apps/web/src/components/ui/rich-text-inline-field.tsx`  
**Extension-Konfiguration:**
```typescript
Markdown.configure({ html: true, transformPastedText: true })
Highlight.configure({ multicolor: true })
```

## Aufgabe

### Schritt 1 — Ursache verifizieren

Reproduziere den Bug:
1. Wiki-Seite mit Fließtext öffnen
2. Ein einzelnes Wort inmitten eines Satzes selektieren
3. Highlight-Button klicken → Satz wird komplett eingefärbt
4. ProseMirror DevTools oder `console.log(editor.state.doc.toJSON())` nutzen, um zu prüfen, ob der Satz ein einzelner Text-Node ist

### Schritt 2 — Lösungsansätze prüfen (in dieser Reihenfolge)

**Option A: `splitTextNode` vor Mark-Anwendung**
```typescript
// Custom Highlight-Command, der den Text-Node vor dem setMark aufteilt:
editor.chain()
  .focus()
  .command(({ tr, state }) => {
    const { from, to } = state.selection
    // Text-Node an den Selektionsgrenzen aufteilen
    tr.split(from)
    tr.split(to)
    return true
  })
  .setHighlight({ color: selectedColor })
  .run()
```
Nachteil: ProseMirror-Normalize könnte die Splits direkt wieder zusammenführen.

**Option B: `html: false` in tiptap-markdown testen**
```typescript
Markdown.configure({ html: false, transformPastedText: true })
```
Prüfen ob der Bug damit verschwindet (dann ist HTML-Normalisierung die Ursache). Nachteil: Bestehende HTML-Inhalte (z.B. `<img>`, `<table>`) würden nicht mehr gerendert.

**Option C: Highlight-Extension mit `inclusive: false` und `excludes`-Konfiguration**
Tiptap v3 erlaubt es, Mark-Behaviour anzupassen. Prüfen ob `Highlight.configure({ multicolor: true, HTMLAttributes: {} })` in Kombination mit einem Custom-Mark mit `inclusive: false` das Expand-Verhalten ändert.

**Option D: Selection explizit schützen (empfohlen, wenn A scheitert)**
```typescript
// Vor dem Highlight-Command: Selection in eigene Variablen retten
// Nach dem Command: ggf. normalisieren
const { from, to } = editor.state.selection
editor.chain()
  .focus()
  .setTextSelection({ from, to })  // Selection neu setzen
  .setHighlight({ color })
  .run()
```

### Schritt 3 — Gewählte Lösung implementieren

Welche Option auch immer funktioniert: Die Änderung in `rich-text-inline-field.tsx` einbauen. Wenn ein Custom-Command nötig ist, als separate Funktion im selben File definieren.

### Schritt 4 — Bestehende Highlights prüfen

Sicherstellen, dass:
- Bereits hervorgehobene Texte korrekt geladen und angezeigt werden
- Das Entfernen einer Hervorhebung (`unsetHighlight`) weiterhin nur die selektierte Stelle betrifft

## Technische Leitplanken

- Tiptap v3 API (`^3.23.5`)
- `tiptap-markdown ^0.9.0`
- Keine neue Dependency
- Die Lösung darf nicht `html: false` setzen, wenn bestehende Dokumente HTML-Inhalte enthalten — nur wenn gesichert ist, dass kein Wiki-Inhalt HTML nutzt
- Nur `rich-text-inline-field.tsx` ändern (evtl. neue Hilfsfunktion im selben File)

## Regeln & Randfälle

- Bug tritt nur auf, wenn der Dokument-Content via `tiptap-markdown` mit `html: true` geparsed wurde
- Bei `Markdown.configure({ html: false })` oder bei reinem Tiptap-JSON-Content tritt er vermutlich nicht auf
- Multicolor-Highlights (`{ multicolor: true }`) müssen weiterhin funktionieren

## Testanforderungen

- Manuell: Einzelnes Wort im Wiki hervorheben → nur das Wort wird eingefärbt
- Manuell: Ganzen Satz hervorheben → nur der Satz wird eingefärbt
- Manuell: Hervorhebung entfernen → nur die selektierte Stelle wird zurückgesetzt
- Manuell: Multicolor-Highlights mit verschiedenen Farben an verschiedenen Stellen → korrekte Darstellung
- Manuell: Reload → Highlights bleiben an der korrekten Stelle

## Abnahmekriterien

- Highlight wird auf exakt die selektierte Zeichenspanne angewendet — nicht auf den gesamten Text-Node
- Bestehende Highlights in gespeicherten Dokumenten sind unverändert
- Kein Regressions-Test für andere Editor-Features schlägt fehl
