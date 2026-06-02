# Log: MS-46 TipTap Image Extensions

**Datum:** 02.06.26  
**Uhrzeit:** 15:55:14  
**Schritt:** Implementierung — TipTap Bild-Resize, Ausrichtung und Textfluss  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

TASK-200 und TASK-206 wurden gemeinsam umgesetzt, da sie denselben Code betreffen.

Der bisherige Standard-`Image`-Import aus `@tiptap/extension-image` wurde durch eine eigene `ResizableImage`-Extension ersetzt. Die neue Extension ergänzt die bestehenden Bild-Attribute (`src`, `alt`, `title`) um drei neue Felder:

- `width` — Bildbreite in Pixeln (über Resize-Griff setzbar)
- `float` — Textfluss (`none | left | right`)
- `align` — Ausrichtung (`left | center | right`)

Im Bearbeitungsmodus zeigt eine React-NodeView (`TiptapImageNodeView`) beim Anklicken eines Bildes:
- Eine Toolbar mit vier Modi: Inline links, Zentriert, Links mit Textfluss, Rechts mit Textfluss
- Einen Resize-Griff (rechts unten), der per Maus-Drag die Bildbreite ändert
- Einen blauen Auswahlrahmen

Im Read-Only-Modus (gespeichertes HTML, `dangerouslySetInnerHTML`) übernehmen CSS-Klassen die Darstellung: `.tiptap-img-float-left`, `.tiptap-img-float-right`, `.tiptap-img-center`.

Ein Clearfix auf `.rich-text-surface` und `.ProseMirror` verhindert, dass floatende Bilder aus ihrem Container herausragen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/tiptap-image-node.ts` | neu | Custom TipTap-Node mit width, float, align und `setImage`-Command |
| `apps/web/src/components/ui/TiptapImageNodeView.tsx` | neu | React-NodeView mit Resize-Griff und Ausrichtungs-Toolbar |
| `apps/web/src/styles.css` | geändert | CSS-Klassen für float/center Bilder + Clearfix |
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | Import auf ResizableImage umgestellt |
| `logs/2026-06-02-15-55-14-ms-46-tiptap-image-extensions.md` | neu | Dieses Log |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

- Float in einem `contenteditable`-Bereich kann je nach Browser zu Cursor-Eigenheiten beim Navigieren neben einem gefloateten Bild führen. Bekanntes Verhalten, kein Blocker.
- Freie Word-ähnliche Positionierung wurde bewusst nicht umgesetzt (vgl. TASK-206 Beschreibung).

## Offene Punkte / Folgeaufgaben

Keine. Beide Aufgaben vollständig umgesetzt.
