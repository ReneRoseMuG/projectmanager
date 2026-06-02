# Log: Parent Context Sidebar

**Datum:** 02.06.26  
**Uhrzeit:** 10:04:30  
**Schritt:** Fix — Parent-Kontext in Formular-Sidebar  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das `ParentContextField` wurde von einer Badge-Zeile im Hauptinhalt zu einem Sidebar-Panel umgestellt. Es zeigt nun das Gruppenlabel „Übergeordnetes Element“ und listet die Parent-Kontexte im Stil der Sidebar-Einstellungen. Die sichtbare Referenz verwendet nur noch den Shortcode des Parent-Typs und den Titel des Elements; die numerische ID wird nicht mehr im Label angezeigt. Die Verwendung wurde in Ticket-, Aufgaben-, Feature-, Use-Case- und Backlog-Item-Formularen an die erste Position der jeweiligen `FormSidebar` verschoben. Bestehende bearbeitbare Parent-Auswahlfelder, etwa im Feature-Formular, bleiben unverändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ParentContextField.tsx` | geändert | Parent-Kontext als SidebarPanel mit Shortcode-und-Titel-Badge umgesetzt |
| `apps/web/src/components/ui/SidebarPanel.tsx` | geändert | Optionales `data-testid` für Panel-Wurzel ergänzt |
| `apps/web/src/components/tickets/TicketForm.tsx` | geändert | Parent-Kontext aus Hauptinhalt in Sidebar an erste Position verschoben |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Parent-Kontext aus Hauptinhalt in Sidebar an erste Position verschoben |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Parent-Kontext aus Hauptinhalt in Sidebar an erste Position verschoben |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Parent-Kontext aus Hauptinhalt in Sidebar an erste Position verschoben |
| `apps/web/src/components/backlog/BacklogItemForm.tsx` | geändert | Parent-Kontext aus Hauptinhalt in Sidebar an erste Position verschoben |
| `logs/2026-06-02-10-04-30-fix-parent-context-sidebar.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index um diesen Fix ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
