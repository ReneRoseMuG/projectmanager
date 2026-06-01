# Log: Web-Testdrift

**Datum:** 31.05.26  
**Uhrzeit:** 15:56:10  
**Schritt:** Fix — Web-Testdrift  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die roten Web-Tests wurden an den aktuellen Ist-Zustand der UI-Komponenten angepasst. Die Formular-Tests erwarten bei `CatalogSelect` jetzt die tatsächlich gerenderten Select-Felder statt alter Status-Buttons. Die Sidebar-Tests prüfen die aktuelle feste Breite und den Collapse-Zustand statt einer nicht mehr vorhandenen Resize-Funktion. Weitere UI-Primitive wurden an aktuelle Klassen für ActionMenu, Section, Select und WikiTree angepasst, ohne Produktionscode zu ändern.

Testleitplanken: Der Testentwurfs-Skill wurde angewendet. Betroffen ist die Web-Unit-/Integrationsebene mit bestehenden jsdom-Fixtures und vorhandenen Unit-Mocks. Geprüft wird beobachtbares UI-Verhalten wie Wertverdrahtung, Submit-Payloads, Collapse-Zustand, Menüinteraktion und aktive Wiki-Navigation.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/unit/web/components/backlog/BacklogItemForm.test.tsx` | geändert | Status-Erwartung auf aktuellen Select umgestellt |
| `tests/unit/web/components/features/FeatureForm.test.tsx` | geändert | Status-Erwartung auf aktuellen Select umgestellt |
| `tests/unit/web/components/usecases/UseCaseForm.test.tsx` | geändert | Status-Erwartung auf aktuellen Select umgestellt |
| `tests/unit/web/components/projects/ProjectForm.test.tsx` | geändert | Status-Select und aktuelles Details-Layout geprüft |
| `tests/unit/web/components/milestones/MilestoneForm.test.tsx` | geändert | Status-Erwartung auf aktuellen Select umgestellt |
| `tests/unit/web/components/tasks/TaskForm.test.tsx` | geändert | Status-/Prioritäts-Selects und aktuelles Fixture geprüft |
| `tests/unit/web/components/tickets/TicketForm.test.tsx` | geändert | Status-, Typ- und Prioritäts-Selects geprüft |
| `tests/unit/web/components/ui/ActionMenu.test.tsx` | geändert | Aktuelle Trigger-Größe geprüft |
| `tests/unit/web/components/ui/ListBoardView.test.tsx` | geändert | Aktuelle ActionMenu-Trigger-Größe geprüft |
| `tests/unit/web/components/ui/atoms.test.tsx` | geändert | Aktuelle Select-Höhe geprüft |
| `tests/unit/web/components/ui/FormSidebar.test.tsx` | geändert | Resize-Erwartungen entfernt, feste Breite geprüft |
| `tests/unit/web/components/ui/Section.test.tsx` | geändert | Aktuelles Section-Padding geprüft |
| `tests/unit/web/components/wiki/WikiTree.test.tsx` | geändert | Aktive Navigation über aktuelle Row-Klassen geprüft |
| `logs/2026-05-31-15-56-10-fix-web-testdrift.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine. `npm run test -w apps/web` läuft mit 592 grünen Tests in 93 Dateien. `npm run lint` und `npm run build` laufen erfolgreich; der Build meldet nur die bekannte Vite-Chunk-Size-Warnung.

## Offene Punkte / Folgeaufgaben

Keine für die behobenen Web-Testdrift-Fälle.
