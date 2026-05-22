# Log: Task DnD Board und Liste

**Datum:** 22.05.26  
**Schritt:** Feature — Task DnD Board und Liste  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die generische `ListBoardView` unterstützt jetzt Drag & Drop für statusgruppierte Board- und Listenansichten, sofern `onItemStatusChange` übergeben wird. Bekannte Statusbereiche werden als Drop-Zonen gerendert, Items werden über Wrapper in `ListBoardView` draggable gemacht, und `ItemCard`, `ItemRow` sowie Domain-Karten bleiben unverändert. Der Listenmodus rendert bekannte Status-Panels auch dann, wenn ein Status keine sichtbaren Einträge enthält. Für Tasks leitet `TaskListBoardView` den vorhandenen Status-Callback an die generische DnD-Schicht weiter, und `OwnerTaskBoard` nutzt eine neue `updateTaskStatus`-Mutation. `useTasks` aktualisiert Owner-Task-Listen optimistisch und rollt den Cache bei API-Fehlern zurück.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | DnD-Kontext, Droppable-Statusbereiche, Draggable-Wrapper und leere Listen-Panels ergänzt |
| `apps/web/src/components/tasks/TaskListBoardView.tsx` | geändert | `onStatusChange` als `onItemStatusChange` weitergereicht |
| `apps/web/src/components/tasks/OwnerTaskBoard.tsx` | geändert | Statusänderungen nutzen `updateTaskStatus` |
| `apps/web/src/hooks/useTasks.ts` | geändert | Optimistische `updateTaskStatus`-Mutation mit Rollback ergänzt |
| `tests/unit/web/components/ui/ListBoardView.dnd.test.tsx` | neu | DnD-Branching und leere Listen-Panels getestet |
| `tests/unit/web/components/ui/TaskListBoardView.test.tsx` | geändert | DnD-Aktivierung und leere Task-Statusspalten angepasst |
| `tests/integration/web/hooks/queryMutations.integration.test.tsx` | geändert | Optimistisches Status-Update und Rollback getestet |
| `docs/tasks/codex-auftrag-board-drag-and-drop.md` | geändert | Scope auf Board- und Listen-DnD aktualisiert |

## Probleme und Abweichungen

`npm run test -w apps/web` ist fehlgeschlagen. Sieben bestehende Domain-ListBoard-Tests erwarten bei leeren Listen noch den globalen EmptyState, während der neue geplante Zustand leere Status-Panels rendert: `BacklogListBoardView.test.tsx`, `FeatureListBoardView.test.tsx`, `FeatureProjectPanel.test.tsx`, `ProjectFeaturePanel.test.tsx`, `ProjectListBoardView.test.tsx`, `TicketListBoardView.test.tsx` und `UseCaseListBoardView.test.tsx`. Gemäß Repo-Regel wurden nach dem fehlgeschlagenen Testlauf keine weiteren Test-Fixes vorgenommen. `npm run build -w apps/web` war erfolgreich; Vite meldete nur die bekannte Chunk-Size-Warnung.

## Offene Punkte / Folgeaufgaben

Die sieben genannten Alt-Tests müssen in einem separaten Folgeauftrag an die neue Abnahme angepasst werden: bei statusgruppierten leeren Listen werden Status-Panels mit Zähler `0` erwartet, nicht mehr der globale EmptyState.
