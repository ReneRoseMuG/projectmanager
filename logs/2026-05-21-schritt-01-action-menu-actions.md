# Log: ActionMenu & Kartenaktionen

**Datum:** 21.05.26  
**Schritt:** 1 — ActionMenu & Kartenaktionen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Für Board- und Listenoberflächen wurde eine neue gemeinsame `ActionMenu`-Komponente erstellt. Sie bündelt sekundäre Aktionen hinter einem Drei-Punkt-Button, unterstützt ARIA-Attribute, schließt per Outside-Klick und Escape und verhindert Event-Bubbling in Karten und Zeilen. `ItemCard`, `PlanningItemCard`, `TaskCard`, `TicketCard`, `UseCaseCard`, `BacklogListBoardView` und `ProjectFeaturePanel` verwenden nun das Menü für Bearbeiten-/Löschen-Aktionen in den betroffenen Board/ListView-Flächen. Relation-, Settings-, Tag-, Notes- und Attachment-Aktionen außerhalb dieses UI-Schnitts blieben unverändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ActionMenu.tsx` | neu | Gemeinsames Drei-Punkt-Menü für Karten-/Row-Aktionen |
| `apps/web/src/components/ui/ItemCard.tsx` | geändert | Direkte Edit/Delete-Buttons durch ActionMenu ersetzt |
| `apps/web/src/components/ui/PlanningItemCard.tsx` | geändert | Row-Aktionen auf ActionMenu umgestellt |
| `apps/web/src/components/tasks/TaskCard.tsx` | geändert | Task-Row-Aktionen auf ActionMenu umgestellt |
| `apps/web/src/components/tickets/TicketCard.tsx` | geändert | Ticket-Row-Aktionen auf ActionMenu umgestellt |
| `apps/web/src/components/backlog/BacklogListBoardView.tsx` | geändert | Backlog-Row-Aktionen auf ActionMenu umgestellt |
| `apps/web/src/components/usecases/UseCaseCard.tsx` | geändert | Use-Case-Row-Aktion auf ActionMenu umgestellt |
| `apps/web/src/components/features/ProjectFeaturePanel.tsx` | geändert | Feature-Row-Aktion im Projekt-Feature-Panel auf ActionMenu umgestellt |

## Probleme und Abweichungen

Die geplante Snippet-Vorlage wurde bewusst nicht 1:1 übernommen: Der ungenutzte `LucideIcon`-Import wurde weggelassen, zusätzlich wurden ARIA-Attribute und Escape-Schließen ergänzt.

## Offene Punkte / Folgeaufgaben

Keine.
