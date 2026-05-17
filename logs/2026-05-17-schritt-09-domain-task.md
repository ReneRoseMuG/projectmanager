# Log: Domain Task

**Datum:** 17.05.26  
**Schritt:** 9 — Domain: Task  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Task-Domäne wurde weitgehend auf die neue Design-System-Hierarchie umgestellt. `TaskCard` basiert jetzt auf `ItemCard`, nutzt den Prioritäts-Accent über `accentColor`, icon-only Aktionen und Doppelklick/Click zum Öffnen; `TaskRow` nutzt `ItemRow`. `TaskForm` wurde auf `FormModal`, `Section`, `FormField`, Atome, `RadioList`, `RichTextEditor`, `TagPicker`, `FeatureRelationPanel` und `UseCaseRelationPanel` umgestellt und submitet einen erweiterten Payload mit `tagIds`, `featureIds` und `useCaseIds`. `TaskDetail` hat separate Tabs für Features und Use Cases erhalten. Die Projektseite nutzt `TaskListBoardView` auf Basis von `ListBoardView`; die alten Komponenten `TaskList`, `KanbanBoard` und `KanbanColumn` wurden entfernt. Die Playwright-Grundlage inklusive `playwright.config.ts`, `e2e`-Script und 11 Task-CRUD-Spezifikationen wurde angelegt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/tasks/TaskCard.tsx` | geändert | Auf `ItemCard`/`ItemRow` umgestellt |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Auf `FormModal` mit Tags, Features und Use Cases erweitert |
| `apps/web/src/components/tasks/TaskDetail.tsx` | geändert | Features- und Use-Cases-Tabs getrennt |
| `apps/web/src/components/tasks/TaskListBoardView.tsx` | neu | Task-Adapter für `ListBoardView` mit Statusspalten |
| `apps/web/src/components/tasks/TaskList.tsx` | gelöscht | Durch `TaskListBoardView` ersetzt |
| `apps/web/src/components/tasks/KanbanBoard.tsx` | gelöscht | Durch `TaskListBoardView` ersetzt |
| `apps/web/src/components/tasks/KanbanColumn.tsx` | gelöscht | Durch `TaskListBoardView` ersetzt |
| `apps/web/src/components/ui/RelationPanel.tsx` | geändert | Optionales Ausblenden des Speichern-Buttons ergänzt |
| `apps/web/src/components/features/FeatureRelationPanel.tsx` | geändert | `showSave` an `RelationPanel` weitergereicht |
| `apps/web/src/components/usecases/UseCaseRelationPanel.tsx` | geändert | `showSave` an `RelationPanel` weitergereicht |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Task-Ansicht und Task-Erstellung auf `TaskListBoardView`/Full-Payload umgestellt |
| `apps/web/e2e/task.spec.ts` | neu | Task-CRUD-E2E-Suite mit 11 Fällen |
| `apps/web/playwright.config.ts` | neu | Playwright-Konfiguration mit API- und Web-Servern |
| `apps/web/package.json` | geändert | `e2e`-Script und Playwright-DevDependency |
| `package-lock.json` | geändert | Playwright-Abhängigkeit ergänzt |
| `.gitignore` | geändert | Playwright-Testartefakte ignoriert |
| `logs/2026-05-17-schritt-09-domain-task.md` | neu | Schritt-Log für Schritt 9 |
| `logs/README.md` | geändert | Log-Index um Schritt 9 ergänzt |

## Probleme und Abweichungen

Der App-Code kompiliert und baut erfolgreich. Die neue Playwright-Suite ist auffindbar und ausführbar, aber noch nicht vollständig grün: Im letzten vollständigen Lauf bestanden 2 von 11 Tests. Die übrigen Fehler liegen aktuell in der neuen E2E-Suite bei Selektoren, Modal-Kontexten und responsive doppelt gerenderten Task-Elementen; diese Tests müssen gezielt stabilisiert werden. Während der E2E-Läufe erzeugte Test-Content-Dateien wurden wieder entfernt. Der Web-Build meldet weiterhin die bestehende Vite-Warnung zu großen Chunks.

## Offene Punkte / Folgeaufgaben

- Playwright-Suite `apps/web/e2e/task.spec.ts` stabilisieren, bis 11/11 Tests grün sind.
- Danach Schritt 9 erneut voll prüfen und den Status bei erfolgreichem E2E-Lauf auf abgeschlossen bringen.

## Test-Ergebnis

| Kommando | Ergebnis |
|---|---|
| `npm run typecheck -w apps/web` | ✅ Erfolgreich |
| `npm run build -w apps/web` | ✅ Erfolgreich, mit bestehender Vite-Warnung zu großen Chunks |
| `npx playwright test --list -c apps/web/playwright.config.ts` | ✅ 11 Tests gefunden |
| `npx playwright test -c apps/web/playwright.config.ts --project=chromium --reporter=list` | ⚠️ 2/11 bestanden, 9/11 fehlgeschlagen |
