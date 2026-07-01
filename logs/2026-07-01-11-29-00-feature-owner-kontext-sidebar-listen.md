# Log: Owner-Kontext in Sidebar-Listen

**Datum:** 01.07.26  
**Uhrzeit:** 11:29:00  
**Schritt:** Feature — Owner-Kontext in Sidebar-Listen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Sidebar- und Listen-Darstellungen zeigen jetzt denselben Parent-/Owner-Kontext wie die bestehenden Board-Karten. Aufgaben und Tickets reichen ihren vorhandenen `visibleParent` an `ClosedItemRow` weiter. Meilensteine erhalten über das API-DTO einen direkten Projekt-Parent und zeigen diesen in Karte, Listenzeile und geschlossener Sidebar. Globale Notizen erhalten ihre Owner-Kontexte aus den bestehenden Join-Tabellen und zeigen diese in Note-Karten und Note-Listenzeilen. `dayPlan` wurde als anzeigbarer Parent-Typ ergänzt; Unlink-Logik bleibt unverändert auf die bestehenden verlinkbaren Typen begrenzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | `visibleParent` für Meilensteine, `parentContexts` für Notizen und `dayPlan` als Parent-Typ ergänzt |
| `apps/api/src/services/milestones.service.ts` | geändert | Projekt-Parent-Kontext in Milestone-DTOs gemappt |
| `apps/api/src/services/notes.service.ts` | geändert | Owner-Kontexte für globale Notizen und Notizdetails gemappt |
| `apps/web/src/components/ui/ParentBadge.tsx` | geändert | Mehrfach-Badge-Ausgabe und `dayPlan`-Label ergänzt |
| `apps/web/src/components/ui/ClosedItemRow.tsx` | geändert | Optionaler Parent-/Owner-Badge-Bereich für kompakte Sidebar-Zeilen |
| `apps/web/src/components/milestones/MilestoneCard.tsx` | geändert | Projekt-Parent in Meilenstein-Karten und -Rows angezeigt |
| `apps/web/src/components/milestones/MilestoneListBoardView.tsx` | geändert | Projekt-Parent an geschlossene Meilenstein-Zeile weitergereicht |
| `apps/web/src/components/tasks/TaskListBoardView.tsx` | geändert | Aufgaben-Parent an geschlossene Sidebar-Zeile weitergereicht |
| `apps/web/src/components/tickets/TicketListBoardView.tsx` | geändert | Ticket-Parent an geschlossene Sidebar-Zeile weitergereicht |
| `apps/web/src/components/notes/NoteCard.tsx` | geändert | Owner-Kontext in Notiz-Karten angezeigt |
| `apps/web/src/components/notes/NoteListViewItem.tsx` | geändert | Owner-Kontext in Notiz-Listenzeilen angezeigt |
| `apps/web/src/components/ui/ParentContextField.tsx` | geändert | `dayPlan` als anzeigbarer Kontext ergänzt |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | `dayPlan` aus Task-Unlink-Ownern herausgenarrowt |
| `tests/...` | geändert | Gezielte Unit- und Integrationstests für Parent-/Owner-Kontext ergänzt |

## Probleme und Abweichungen

Graphify konnte nicht genutzt werden, weil `graphify query` lokal mit `uv trampoline failed to canonicalize script path` abbrach; die Analyse lief daher direkt über Repo-Dateien. Ein breiter UI-Testlauf mit `ClosedItemRow`, Task-, Ticket-, Milestone- und Note-Tests schlug weiterhin in bestehenden/benachbarten `ListBoardView`-Erwartungen fehl: Statusspalten-/Card-Anzahlen und ein EmptyState-Verhalten weichen von den Testannahmen ab. Die gezielt betroffenen geschlossenen Task-/Ticket-Sidebar-Fälle, Notes-UI-Fälle, API-Integrationstests sowie Builds sind grün.

Testleitplanken: Unit-Komponententests mit jsdom ohne DB/FS; Integrationstests mit echter Test-App und isolierter Testdatenbank. Bewiesen wurde die sichtbare Parent-/Owner-Ausgabe in UI und API-DTOs; Permission-Verhalten wurde nicht geändert.

## Offene Punkte / Folgeaufgaben

Die bestehenden `ListBoardView`-bezogenen UI-Testannahmen sollten separat geprüft werden: erwartete Statusspalten-/Card-Zahlen und EmptyState bei leeren Aufgabenlisten passen aktuell nicht zum gerenderten Verhalten.
