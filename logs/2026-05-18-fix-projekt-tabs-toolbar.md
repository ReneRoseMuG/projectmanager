# Log: Projekt-Tabs Toolbar

**Datum:** 18.05.26  
**Schritt:** Fix — Projekt-Tabs Toolbar  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Projekt-Tabs wurden in ihrer Toolbar-Struktur vereinheitlicht. Das Projekt-Feature-Panel nutzt jetzt die gemeinsame `ListBoardView` mit Suchfeld links, einheitlichem View-Toggle und Plus-Button rechts; die eigene Status-Infobox mit Erklärungssatz wurde entfernt. Die Aufgabenliste besitzt nun dieselben Status-Filter-Chips wie Backlog. Die Notizenliste zeigt ebenfalls ein Suchfeld links und einen iconbasierten Plus-Button rechts statt eines links stehenden Textbuttons.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/features/ProjectFeaturePanel.tsx` | geändert | Auf gemeinsame `ListBoardView`-Toolbar umgestellt |
| `apps/web/src/components/tasks/TaskListBoardView.tsx` | geändert | Status-Filter-Chips für Aufgaben ergänzt |
| `apps/web/src/components/notes/NoteList.tsx` | geändert | Notizen-Toolbar mit Suche links und Plus rechts vereinheitlicht |
| `apps/web/src/components/ui/__tests__/ProjectFeaturePanel.test.tsx` | geändert | Tests an neue Feature-Panel-Struktur angepasst |
| `logs/2026-05-18-fix-projekt-tabs-toolbar.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
