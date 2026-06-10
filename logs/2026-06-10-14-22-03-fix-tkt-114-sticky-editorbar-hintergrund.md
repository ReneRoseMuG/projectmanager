# Log: TKT-114 Sticky-Editorbar transparent

**Datum:** 10.06.26  
**Uhrzeit:** 14:22:03  
**Schritt:** Fix — TKT-114 „Sticky Editorbar z.B. im Use Case ist transparent"  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die sticky positionierte Editor-Toolbar des Rich-Text-Felds hatte keinen eigenen
Hintergrund. Beim Scrollen schoben sich Inhalte sichtbar „durch" die Leiste.
Der sticky-Wrapper bekommt jetzt einen deckenden Hintergrund (`bg-white`, passend
zum Editor-Container) und eine untere Trennlinie (`border-b border-line`). Im
Read-only-Zustand bleibt die Leiste wie bisher unsichtbar (`invisible`), die neuen
Klassen wirken sich dort nicht aus.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | Sticky-Toolbar-Wrapper: `bg-white border-b border-line` ergänzt |

## Probleme und Abweichungen

Keine. Betrifft alle Editor-Felder (Use Case, Feature, Ticket, Wiki etc.), da
zentral in `RichTextInlineField` gelöst.

## Offene Punkte / Folgeaufgaben

Keine.
