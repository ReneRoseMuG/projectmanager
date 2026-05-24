# Log: Objekt-Referenzen UI

**Datum:** 23.05.26  
**Schritt:** Feature — Objekt-Referenzen und ID kopieren  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Für Projekte, Meilensteine, Aufgaben, Tickets, Features und Use Cases wurde eine zentrale Objekt-Referenzlogik umgesetzt. Karten- und Listenansichten erhalten einen Copy-Button, der die Referenz wie `TASK-10` oder `FEAT-3` in die Zwischenablage kopiert und kurz ein Check-Icon zeigt. In den Detail-Hero-Bereichen wird der Copy-Button dauerhaft angezeigt. Die Präfixlogik liegt zentral, damit keine abweichenden Prefixe in einzelnen Komponenten entstehen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/lib/references.ts` | neu | Zentrale `objectReference()`-Hilfsfunktion |
| `apps/web/src/components/ui/CopyReferenceButton.tsx` | neu | Gemeinsamer Clipboard-Button mit Icon-Feedback |
| `apps/web/src/components/ui/ItemCard.tsx` | geändert | Optionaler Referenz-Copy-Button für Board-/Card-Ansichten |
| `apps/web/src/components/ui/ItemRow.tsx` | geändert | Optionaler Referenz-Copy-Button für Listenzeilen |
| `apps/web/src/components/ui/FormModal.tsx` | geändert | Optionaler Referenz-Copy-Button im Hero-Bereich |

## Probleme und Abweichungen

Backlog-Items, Events und andere nicht in der Präfix-Konvention genannte Objekte wurden bewusst nicht erweitert. Die Copy-Aktion zeigt kein Toast, sondern nur das Icon-Feedback wie beauftragt.

## Offene Punkte / Folgeaufgaben

Keine.
