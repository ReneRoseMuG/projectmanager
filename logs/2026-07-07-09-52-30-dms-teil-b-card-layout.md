# Log: Dokument-Manager Teil B — Zweizeiliges Card-Layout

**Datum:** 07.07.26  
**Uhrzeit:** 09:52:30  
**Schritt:** B — Feature (Dokument-Karte)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Dokumentliste nutzt jetzt eine eigene `DocumentCard` statt der geteilten `ItemRow`. Layout wie beauftragt: zwei Spalten — links breit mit zwei gestapelten Zeilen (oben Dateiname, darunter alle zugewiesenen Sammlungen mit Ordner-Icon und Kategorien in Katalogfarbe), rechts schmal mit Typ-Badge, Dateigröße und den Aktions-Icons (Download, Löschen).

`ItemRow` bildet dieses Layout strukturell nicht ab (4-Spalten-Grid, geteilt über viele Domänen) und wurde bewusst nicht umgebaut. Die Zuordnungszeile ist einzeilig mit `overflow-hidden`; passt im Extremfall nicht alles hinein, wird rechts abgeschnitten, die vollständige Liste bleibt per `title`-Tooltip erreichbar. Gemäß Freigabe (Variante a) erscheinen Labels/Tags nicht mehr in der Liste, sondern nur noch im Detail-Panel. Die Meta-/Titel-Helfer (`documentTitle`, Badge/Größe) wurden aus der Seite in die Karte verschoben.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/attachments/DocumentCard.tsx` | neu | Zweizeilige Karte + verschobene Meta-/Titel-Helfer |
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | Liste nutzt `DocumentCard`, Delete-Handler extrahiert, tote Imports/Helfer entfernt |
| `tests/unit/web/components/attachments/DocumentCard.test.tsx` | neu | 5 Component-Tests (Zuordnungen, Platzhalter, Öffnen, Löschen, Rechte) |

## Probleme und Abweichungen

Kürzung erfolgt per CSS-Clipping + Tooltip, ohne dynamischen „+N"-Zähler — bewusste Vereinfachung ohne DOM-Messung. Typecheck `apps/web` grün; gezielter Testlauf (Card + Breite): 10/10 grün.

## Offene Punkte / Folgeaufgaben

Teil C (Multiselect, Bulk-Zuweisung, Bulk-Download) folgt — erweitert die Karte um eine Auswahl-Checkbox.
