# Log: Tests UI-Board-Overhaul

**Datum:** 21.05.26  
**Schritt:** 4 — Tests UI-Board-Overhaul  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Für `ActionMenu` wurde ein neuer Unit-Test mit den erwarteten Interaktionsfällen ergänzt. Bestehende Unit-Tests für ListBoardView, Backlog, Use Cases, Features, Projekte, Tasks, ProjectFeaturePanel und FilterChips wurden auf das neue ActionMenu- und Toolbar-Verhalten umgestellt. Die Browser-Tests verwenden nun einen Helper, der alte direkte Buttons und neue ActionMenu-Einträge bedienen kann. Dadurch bleiben die E2E-Flows für Bearbeiten, Löschen und Entfernen trotz UI-Änderung stabil. Web-Typecheck, Web-Unit-Tests, Web-E2E und Web-Lint wurden erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/unit/web/components/ui/ActionMenu.test.tsx` | neu | Unit-Test für ActionMenu-Interaktionen |
| `tests/unit/web/components/ui/*.test.tsx` | geändert | Board/ListView-Erwartungen an ActionMenu, Spalten-Plus und FilterChip-Höhe angepasst |
| `tests/browser/web/domain-test-utils.ts` | geändert | `clickItemAction` für direkte Buttons und ActionMenu ergänzt |
| `tests/browser/web/*.spec.ts` | geändert | Betroffene E2E-Flows auf den neuen Helper umgestellt |

## Probleme und Abweichungen

Der erste Web-Unit-Lauf zeigte zwei reine Testselektor-Probleme: Accessible Names bei `FilterChips` enthalten keinen Leerraum zwischen Label und Zahl, und es gibt durch Katalog-Fallbacks zwei Buttons mit dem Label „Offen hinzufügen". Beide Testannahmen wurden eng korrigiert. Der erste E2E-Aufruf wurde nur durch das Tool-Timeout nach 124 Sekunden abgeschnitten; nach Beenden des hängenden Playwright-Testservers lief der erneute E2E-Lauf mit längerem Timeout erfolgreich durch.

## Offene Punkte / Folgeaufgaben

Keine.
