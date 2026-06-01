# Log: MS-33 Design-Richtlinien

**Datum:** 31.05.26  
**Uhrzeit:** 19:40:58  
**Schritt:** Feature — MS-33 Design-Richtlinien durchsetzen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die MS-33-Icon-Vereinheitlichung wurde auf die bestätigten Aufgaben und Tickets begrenzt umgesetzt. Use Cases verwenden nun in Liste und Formular das kanonische `Layers3`-Icon, Aufgaben und Subtasks `ListTodo`, Tickets den `Bug`-Fallback und Features `BookOpen`. Zusätzlich wurden die FormModal-Header-Icons auf 20px normiert, der Milestone-Feature-Link-Button auf die Standard-Icon-Button-Größe zurückgeführt und die kollabierte Sidebar auf 16px-Icons vereinheitlicht. Die Testentwurfsleitplanken wurden angewendet: Testebene ist Web-Unit/jsdom, geprüft werden echte React-Renderings mit bestehenden Hook-Mocks und ohne DB-/Dateisystemzugriff. Der fokussierte Web-Unit-Lauf und der Web-Typecheck sind grün.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/usecases/UseCaseListBoardView.tsx` | geändert | Use-Case-Empty-State auf `Layers3` umgestellt |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Use-Case-FormModal-Header auf `Layers3` mit 20px umgestellt |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Aufgaben-/Ticket-Icons kontextgerecht auf `ListTodo` und `Bug` umgestellt |
| `apps/web/src/components/tasks/SubtaskList.tsx` | geändert | Subtask-Empty-State auf `ListTodo` umgestellt |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | Headergröße, Feature-Link-Button und Empty-State-Icons korrigiert |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Feature-Empty-State auf `BookOpen` umgestellt |
| `apps/web/src/components/features/FeatureCard.tsx` | geändert | Use-Case-Zähler auf `Layers3` umgestellt |
| `apps/web/src/components/search/GlobalSearch.tsx` | geändert | Ticket-Fallback-Icon auf `Bug` umgestellt |
| `apps/web/src/components/ui/ParentContextField.tsx` | geändert | Aufgaben-Kontextbadge auf `ListTodo` umgestellt |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Kollabierte Navigation auf 16px-Icons vereinheitlicht |
| `apps/web/src/components/backlog/BacklogItemForm.tsx` | geändert | FormModal-Header-Icon auf 20px normiert |
| `tests/unit/web/components/**` | geändert / neu | Web-Unit-Abdeckung für MS-33-Icons und Größen ergänzt |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Beim ersten fokussierten Testlauf waren sechs neue Test-Assertions zu streng beziehungsweise auf falsche Lucide-Klassen oder Portal-Container gerichtet; die Tests wurden innerhalb des MS-33-Scopes auf die tatsächlichen DOM-Merkmale korrigiert. Produktcode-Fixes außerhalb des Plans waren nicht erforderlich.

## Offene Punkte / Folgeaufgaben

Keine.
