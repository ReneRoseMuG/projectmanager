# Log: Formular-Höhen

**Datum:** 21.05.26  
**Schritt:** 7 — Formular-Höhen vereinheitlichen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

`DatePicker` und `Select` wurden auf `h-11 w-full` angehoben und damit an `Input` angeglichen. Das Checkbox-Label im Katalog-Manager nutzt ebenfalls `h-11`, damit die Formularzeile aus Key, Label, Sortierung, Checkbox und Button vertikal konsistenter wirkt. Für die Höhenklassen wurden gezielte Unit-Tests ergänzt.

## Geänderte / angelegte Dateien

| Datei                                                 | Art      | Kurzbeschreibung                        |
| ----------------------------------------------------- | -------- | --------------------------------------- |
| `apps/web/src/components/ui/DatePicker.tsx`           | geändert | `h-11 w-full` ergänzt                   |
| `apps/web/src/components/ui/Select.tsx`               | geändert | `h-11 w-full` ergänzt                   |
| `apps/web/src/components/settings/CatalogManager.tsx` | geändert | Checkbox-Label auf `h-11` gesetzt       |
| `tests/unit/web/components/ui/atoms.test.tsx`         | geändert | DatePicker- und Select-Höhe abgesichert |

## Probleme und Abweichungen

Die Formular-Höhen sind umgesetzt und Unit-/Build-Verifikation ist grün. Die vollständige Playwright-Abnahme bleibt wegen unveränderter Kalender-Specs rot.

## Offene Punkte / Folgeaufgaben

Kalender-E2E separat prüfen.
