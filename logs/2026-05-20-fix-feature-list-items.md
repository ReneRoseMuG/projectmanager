# Log: Feature List Items

**Datum:** 20.05.26  
**Schritt:** Fix — Feature List Items  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Feature-Zeilen im Projekt-Feature-Panel wurden an das gemeinsame `ItemRow`-Muster angepasst, ohne eine neue List-Item-Komponente einzuführen. `ItemRow` unterstützt jetzt optionale Klassen für die rechten Slots, damit einzelne Domänen feste Breiten für Badge-, Meta- und Action-Bereiche setzen können. Die Feature-Zeile nutzt diese Slots für Status, Use-Case-Counter und Feature-Pfad, sodass die Badges im Listenlayout stabil ausgerichtet bleiben. Fehlende Runtime-Werte für `slug` oder `useCaseCount` werden defensiv abgefangen, damit kein sichtbares `undefined` ausgegeben wird. Der zugehörige UI-Test prüft die stabilen Slots und den Fallback für fehlende Feature-Metadaten.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ItemRow.tsx` | geändert | Optionale Slot-Klassen für Pills, Meta und Actions ergänzt |
| `apps/web/src/components/features/ProjectFeaturePanel.tsx` | geändert | Feature-Zeile mit festen rechten Slots und defensiven Metadaten-Fallbacks versehen |
| `apps/web/src/components/ui/__tests__/ProjectFeaturePanel.test.tsx` | geändert | Tests für Feature-Row-Slots und `undefined`-Fallback ergänzt |
| `logs/2026-05-20-fix-feature-list-items.md` | neu | Schritt-Log zum Feature-Listen-Fix |
| `logs/README.md` | geändert | Log-Index um den neuen Fix ergänzt |

## Probleme und Abweichungen

Ein erster gezielter Testlauf schlug wegen eines fehlenden `buildFeature`-Imports im neu ergänzten Test fehl. Der Import wurde ergänzt; der anschließende gezielte Testlauf war grün. Auf `localhost:5173` war kein Frontend-Server erreichbar, daher wurde keine Browser-Sichtprüfung durchgeführt.

## Offene Punkte / Folgeaufgaben

Keine.
