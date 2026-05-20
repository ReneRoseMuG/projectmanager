# Log: Meilenstein View-State

**Datum:** 20.05.26  
**Schritt:** Fix — Meilenstein View-State  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Listen-/Kanban-Auswahl im Meilenstein-Tab des Projektformulars wird nun auf `ProjectForm`-Ebene gehalten. Dadurch bleibt die gewählte Listenansicht erhalten, wenn innerhalb des Projektformulars auf einen anderen Tab gewechselt und anschließend zum Meilenstein-Tab zurückgekehrt wird. `MilestoneListBoardView` unterstützt dafür optionale kontrollierte View-Props und behält als Fallback das bisherige interne State-Verhalten. Zusätzlich wurde ein Regressionstest ergänzt, der den beschriebenen Tabwechsel mit aktivierter Listenansicht absichert. Der gezielte Testlauf und der Web-Typecheck waren erfolgreich.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Meilenstein-View-State auf Formular-Ebene gespeichert und an die Liste übergeben |
| `apps/web/src/components/milestones/MilestoneListBoardView.tsx` | geändert | Optionale kontrollierte View-Props für Liste/Kanban ergänzt |
| `apps/web/src/components/projects/__tests__/ProjectForm.test.tsx` | geändert | Regressionstest für erhaltene Meilenstein-Listenansicht nach Tabwechsel ergänzt |
| `logs/2026-05-20-fix-meilenstein-view-state.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
