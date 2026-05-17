# Log: Board/ListView Testsuite

**Datum:** 17.05.26  
**Schritt:** Feature — Board/ListView Test Suite  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Für die fünf domänenspezifischen `ListBoardView`-Wrapper wurden dedizierte Testdateien angelegt. Eine gemeinsame Factory-Datei erzeugt vollständig befüllte Testdaten für `Project`, `Task`, `Feature`, `UseCase`, `BacklogItem` und `Tag` inklusive Status-Sets für Project, Task und Feature. Die Tests prüfen Statusspalten für Project, Task und Feature, CardGrid-Boards für Backlog und UseCase, den kartenbasierten Feature-Listenmodus, ItemRow-Listenmodi, Toolbar-Controls, EmptyStates und die geforderten Randfälle. Zusätzlich wurde die Web-Vitest-Konfiguration um `globals` und ein Jest-DOM-Setup ergänzt sowie ein `test`-Script im Web-Workspace angelegt. Der vorgeschriebene Testlauf `npm run test -w apps/web` wurde erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/__tests__/factories.ts` | neu | Testdaten-Factories für alle Domänenobjekte |
| `apps/web/src/components/ui/__tests__/ProjectListBoardView.test.tsx` | neu | Tests für Project-Board, Liste, Toolbar, Controls und Routing |
| `apps/web/src/components/ui/__tests__/TaskListBoardView.test.tsx` | neu | Tests für Task-Kanban, Liste, Toolbar, Controls und Task-Randfälle |
| `apps/web/src/components/ui/__tests__/FeatureListBoardView.test.tsx` | neu | Tests für Feature-Statusspalten und kartenbasierten Listenmodus |
| `apps/web/src/components/ui/__tests__/BacklogListBoardView.test.tsx` | neu | Tests für Backlog-CardGrid, Liste, Controls und Randfälle |
| `apps/web/src/components/ui/__tests__/UseCaseListBoardView.test.tsx` | neu | Tests für UseCase-CardGrid, Liste und Open-Callback |
| `apps/web/src/test/setup.ts` | neu | Import von `@testing-library/jest-dom/vitest` für Vitest |
| `apps/web/vite.config.ts` | geändert | Vitest um `globals` und `setupFiles` ergänzt |
| `apps/web/package.json` | geändert | Web-Testscript `vitest run` ergänzt |
| `logs/2026-05-17-feature-listboardview-testsuite.md` | neu | Abschluss-Log für die Testsuite |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine. Der Testlauf meldet lediglich React-Router-Future-Flag-Warnungen aus `MemoryRouter`; diese sind nicht testrot und erfordern keine Produktionsänderung.

Testlauf:

- `npm run test -w apps/web`
- Ergebnis: 10 Testdateien ausgeführt, 10 grün, 0 rot; 73 Tests ausgeführt, 73 grün, 0 rot.

## Offene Punkte / Folgeaufgaben

Keine.
