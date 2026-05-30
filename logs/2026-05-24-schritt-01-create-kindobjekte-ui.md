# Log: Create-Kindobjekte UI

**Datum:** 24.05.26  
**Schritt:** 1 — Create-Mode Persistenz für Kindobjekte  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Milestone-, Backlog- und Wiki-Create-Formulare wurden um vorgemerkte Kindobjekte erweitert. Meilensteine sammeln im Create-Modus Kommentare, Notizen und Dateien und geben diese nach dem Hauptspeichern an die Detailseite oder das Projektkarten-Menü zurück. Backlog-Items und Wiki-Seiten sammeln Kommentare und legen sie nach dem Hauptobjekt per bestehender Kommentar-API an. Projektkarten- und Projektformular-Modals für Aufgaben und Tickets verarbeiten nun die vollständigen Form-Payloads und legen Kommentare, Notizen, Dateien, Tags, Sub-Objekte und Relationen nach dem Hauptobjekt an.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | Pending-Kommentare, -Notizen und -Dateien im Create-Modus ergänzt |
| `apps/web/src/pages/MilestoneDetailPage.tsx` | geändert | Post-Create-Anlage von Milestone-Kommentaren, -Notizen und -Dateien ergänzt |
| `apps/web/src/pages/ProjectsPage.tsx` | geändert | Projektkarten-Modals speichern Milestone-, Task- und Ticket-Kindobjekte nach dem Hauptobjekt |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Meilenstein-Kartenmodals im Projektformular speichern Task-/Ticket-Kindobjekte nach dem Hauptobjekt |
| `apps/web/src/components/backlog/BacklogItemForm.tsx` | geändert | Pending-Kommentare im Backlog-Create ergänzt |
| `apps/web/src/pages/BacklogItemDetailPage.tsx` | geändert | Post-Create-Anlage von Backlog-Kommentaren ergänzt |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Pending-Kommentare im Wiki-Create ergänzt |
| `apps/web/src/pages/WikiPage.tsx` | geändert | Post-Create-Anlage von Wiki-Kommentaren vor Detailnavigation ergänzt |

## Probleme und Abweichungen

Die E2E-Abnahme zeigt, dass die Meilenstein-Kartenmenüs aus der Meilensteinliste für Aufgabe und Ticket Kommentare nach dem Speichern noch nicht sichtbar verlinken. Dieser Flow liegt außerhalb der bereits angepassten `ProjectsPage`-/`ProjectForm`-Modals und bleibt als Blocker offen.

## Offene Punkte / Folgeaufgaben

- Meilensteinlisten-Menüs für Aufgabe und Ticket ebenfalls auf vollständige `TaskFormInput`-/`TicketFormInput`-Post-Create-Persistenz umstellen.
- Erwartete Rücksprungrouten in den neuen Milestone- und Use-Case-Browsertests an die aktuelle Navigation anpassen.
