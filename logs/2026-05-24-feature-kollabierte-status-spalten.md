# Log: Kollabierte Status-Spalten

**Datum:** 24.05.26  
**Schritt:** Feature — TASK-39 Kollabierte Status-Spalten  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die gemeinsame `ListBoardView` stellt leere bekannte Status-Spalten im Board jetzt kollabiert dar und wechselt dafür im gruppierten Board-Layout von Grid auf Flexbox. Kollabierte Board-Spalten bleiben als schmale `w-12`-Drop-Ziele sichtbar, zeigen den Status vertikal und behalten den Status-Add-Button. Leere bekannte List-Gruppen werden als kompakte `h-12`-Zeile gerendert. Droppable-Sections behalten ihre DnD-Registrierung, `data-status-column` und das bestehende Ring-Highlight bei Drag-Over. Unbekannte Status-Gruppen kollabieren nicht.

Für die Testabdeckung wurden die Testentwurfsleitplanken angewendet. Unit-Tests prüfen den kollabierten Board- und List-Zustand, den Add-Button, DnD-Droppable-Markierung und unbekannte Statusgruppen. Der Browser/E2E-Test prüft echte DnD-Interaktion auf eine kollabierte Zielspalte sowie den Create-Einstieg aus einer kollabierten List-Gruppe mit echten Testdaten.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Flex-Board-Layout und kollabierte Status-Sections ergänzt |
| `tests/unit/web/components/ui/ListBoardView.test.tsx` | geändert | Unit-Abdeckung für kollabierte Board-/List-Gruppen ergänzt |
| `tests/unit/web/components/ui/FeatureListBoardView.test.tsx` | geändert | Layout-Erwartung von Grid auf neuen Board-Marker umgestellt |
| `tests/unit/web/components/ui/ProjectListBoardView.test.tsx` | geändert | Layout-Erwartung von Grid auf neuen Board-Marker umgestellt |
| `tests/unit/web/components/ui/TaskListBoardView.test.tsx` | geändert | Layout- und Empty-Column-Erwartungen an Collapse-Verhalten angepasst |
| `tests/unit/web/components/ui/TicketListBoardView.test.tsx` | geändert | Layout-Erwartung von Grid auf neuen Board-Marker umgestellt |
| `tests/browser/web/task-dnd.spec.ts` | geändert | E2E-Abdeckung für Drop auf kollabierte Spalte und List-Create ergänzt |

## Probleme und Abweichungen

`npm run test -w apps/web` ist fehlgeschlagen: 405 Tests grün, 5 rot. Die roten Fälle betreffen bestehende Design-/Klassen-Erwartungen außerhalb des TASK-39-Scopes: `StatusPill.test.tsx`, `ProjectForm.test.tsx` sowie drei bestehende Erwartungen in `ListBoardView.test.tsx` zu ViewToggle, Spaltenbutton-Größe und ActionMenu-Größe. Gemäß Testregel wurden diese Fehler im laufenden Testauftrag nicht eigenständig behoben.

Der erste `npm run e2e -w apps/web`-Lauf lief in ein Tool-Timeout; der dadurch übrig gebliebene Playwright-Testserver wurde beendet. Der wiederholte E2E-Lauf mit längerem Timeout war erfolgreich.

## Offene Punkte / Folgeaufgaben

Die fünf roten Web-Unit-Erwartungen sollten in einem separaten Folgeauftrag gegen den aktuellen UI-Stand eingeordnet und entweder angepasst oder im Produktionscode behoben werden. Die TASK-39-E2E-Abnahme ist grün: `npm run e2e -w apps/web` meldete 59/59 bestanden.
