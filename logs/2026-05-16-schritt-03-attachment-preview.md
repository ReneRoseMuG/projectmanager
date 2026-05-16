# Log: AttachmentPreview

**Datum:** 16.05.26  
**Schritt:** 3 — AttachmentList und AttachmentPreview  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Empty-State der Dateiliste wurde auf den Studie-2-Stil mit `rounded-2xl`, stärkerer Dashed-Border und ruhigerer Textfarbe umgestellt. Das Grid der Dateiliste nutzt nun den geforderten engeren Abstand und bleibt ab mittlerer Breite zweispaltig. Die Datei-Karten zeigen oben eine dreispaltige Row mit Format-Thumb, Dateiname, Größen-/Datums-Metazeile und Aktionsbuttons. Die Thumb-Farbe wird deterministisch aus der Dateiendung gewählt, inklusive Fallback auf Steel. Die bestehende Bild-, PDF- und Fallback-Vorschau unterhalb der Row blieb funktional erhalten. `npm run lint -w apps/web` wurde nach dem Schritt erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/attachments/AttachmentList.tsx` | geändert | Empty-State und Grid-Abstände an Studie 2 angepasst |
| `apps/web/src/components/attachments/AttachmentPreview.tsx` | geändert | Format-Thumbs, Metazeile und kompakte Aktionsbuttons ergänzt |

## Probleme und Abweichungen

`Designstudie-2/Projekt.html` ist lokal nicht verfügbar, daher konnte kein Browservergleich mit dem Projekt-Mockup stattfinden. Die bestehende Preview-Logik wurde bewusst nicht entfernt, weil echte PDF-/Bild-Vorschau laut Auftrag out-of-scope für Änderungen ist.

## Offene Punkte / Folgeaufgaben

Visuellen Abgleich nachholen, sobald die Referenzdatei vorhanden ist.
