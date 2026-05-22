# Log: Board-Toolbar Statusfilter

**Datum:** 22.05.26  
**Schritt:** Fix — Board-/List-Toolbar Statusfilter  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die gemeinsame `ListBoardView` unterscheidet nun zwischen Statusfiltern in der Toolbar und zusätzlichen Seitenfiltern. Status-Toggles werden über `toolbarFilters` wieder in derselben Zeile wie Suchfeld, View-Toggle und Aktionsbutton gerendert. Kontextfilter wie Projekt- oder Meilensteinfilter bleiben über `filters` als eigene Zeile unterhalb der Toolbar erhalten. Die betroffenen Adapter für Projekte, Features, Backlog, Aufgaben und Tickets wurden entsprechend umgestellt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Separaten `toolbarFilters`-Slot ergänzt und Toolbar-Layout korrigiert |
| `apps/web/src/components/projects/ProjectListBoardView.tsx` | geändert | Statusfilter in den Toolbar-Slot verschoben |
| `apps/web/src/components/features/FeatureListBoardView.tsx` | geändert | Statusfilter in den Toolbar-Slot verschoben |
| `apps/web/src/components/backlog/BacklogListBoardView.tsx` | geändert | Statusfilter in den Toolbar-Slot verschoben |
| `apps/web/src/components/tasks/TaskListBoardView.tsx` | geändert | Statusfilter und Kontextfilter getrennt |
| `apps/web/src/components/tickets/TicketListBoardView.tsx` | geändert | Statusfilter und Kontextfilter getrennt |
| `tests/unit/web/components/ui/ListBoardView.test.tsx` | geändert | Toolbar- und Seitenfilter-Struktur abgesichert |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Die Änderung bleibt auf die bestehende Basiskomponente und ihre Adapter begrenzt.

## Offene Punkte / Folgeaufgaben

Keine.
