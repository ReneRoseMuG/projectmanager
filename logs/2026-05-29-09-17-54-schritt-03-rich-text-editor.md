# Log: Rich-Text-Editor

**Datum:** 29.05.26  
**Uhrzeit:** 09:17:54  
**Schritt:** 3 — Rich-Text-Editor und Wiki-Highlight  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

`RichTextInlineField` hält den editierbaren Tiptap-Editor nun dauerhaft gemountet. Die Toolbar bleibt sichtbar und wird über den Fokuszustand gedimmt, wodurch der frühere Layout-Shift durch Mount/Unmount entfällt. Die Full-Toolbar wurde um H4, horizontale Trennlinie und Spalten-Block erweitert. Ein neuer Tiptap-Column-Node und passende CSS-Regeln speichern und rendern responsive Spalten. Die Highlight-Aktion setzt und entfernt Markierungen nur noch auf der aktuellen Textselektion und stellt die Auswahl nach dem Command wieder her.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | Always-mounted Editor, neue Toolbar-Aktionen, selektionsgenaues Highlight |
| `apps/web/src/components/ui/tiptap-column-node.ts` | neu | Tiptap-Nodes für Spaltenblöcke |
| `apps/web/src/styles.css` | geändert | H4-, HR- und Spalten-Styling für Rich-Text-Inhalte |
| `tests/unit/web/components/ui/rich-text-inline-field.test.tsx` | geändert | Tests auf always-mounted Editor und neue Toolbar erweitert |

## Probleme und Abweichungen

Der erste gezielte Web-Testlauf enthielt irrtümlich die nicht unterstützte Vitest-Option `--runInBand`; der Lauf wurde danach mit dem repoüblichen Vitest-Aufruf wiederholt. Bestehende Rich-Text-Tests mussten angepasst werden, weil die alte Leseansicht als editierbarer Zwischenzustand bewusst entfällt.

## Offene Punkte / Folgeaufgaben

Keine.
