# Log: Owner-Join-Tabellen für Tickets

**Datum:** 18.05.26  
**Schritt:** Feature — Owner-Join-Tabellen für Tickets  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Tickets sind nun eigenständige Domänenobjekte ohne direkten Projekt-Fremdschlüssel und ohne Schweregrad-Feld. Projekt, Aufgabe, Feature und Use Case verknüpfen Tickets über eigene Join-Tabellen; vorhandene Projekt-Ticket-Daten werden in der Migration nach `project_tickets` übertragen. Backend-Routen und Services unterstützen Create, Link, Unlink und Delete-Blockaden für alle vier Owner-Typen. Frontend-Boards nutzen die vorhandene List-/Board-View mit Plus-Button zum Erstellen, Link-Button zum Verknüpfen und Delete-Button zum Entfernen der Zuordnung; Projekt-, Aufgaben-, Feature- und Use-Case-Details besitzen einen Tickets-Tab. Verknüpfte Tickets lassen sich global nicht still löschen, sondern liefern eine fachliche Konfliktmeldung.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | Direkten Ticket-Projektbezug und Severity entfernt, Owner-Join-Tabellen ergänzt |
| `apps/api/src/db/migrations/0012_ticket_owner_joins.sql` | neu | Migration für Join-Tabellen, Datenübernahme und Ticket-Tabellen-Rebuild |
| `apps/api/src/routes/tickets.ts` | geändert | Owner-Routen für Projekt, Aufgabe, Feature und Use Case ergänzt |
| `apps/api/src/services/tickets.service.ts` | geändert | Owner-unabhängige Ticket-Services, Link/Unlink und Delete-Blocker umgesetzt |
| `apps/api/src/services/projects.service.ts` | geändert | Projektlöschung entfernt Ticket-Relationen, nicht Tickets |
| `apps/api/src/services/seed-data.service.ts` | geändert | Seed-Daten und externe Referenzzählung auf Ticket-Join-Tabellen umgestellt |
| `packages/shared-types/src/index.ts` | geändert | Ticket-Typen ohne `projectId` und `severity` |
| `apps/web/src/api/tickets.ts` | geändert | Owner-basierte Ticket-API-Funktionen ergänzt |
| `apps/web/src/hooks/useTickets.ts` | geändert | Globales und owner-basiertes Ticket-Query/Mutation-Modell |
| `apps/web/src/components/tickets/OwnerTicketBoard.tsx` | neu | Wiederverwendbares Ticket-Board für Owner-Details |
| `apps/web/src/components/tickets/*.tsx` | geändert | Ticket-UI auf ListBoardView und ohne Severity angepasst |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Projekt-Tickets über OwnerTicketBoard angebunden |
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Feature-Tickets-Tab ergänzt |
| `apps/web/src/components/tasks/TaskDetail.tsx` | geändert | Aufgaben-Tickets-Tab ergänzt |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Use-Case-Formular auf Tabs mit Tickets-Tab erweitert |
| `apps/web/src/components/ui/FormModal.tsx` | geändert | Submit-Bubbling bei verschachtelten Modal-Formularen verhindert |
| `apps/web/src/hooks/errors.ts` | geändert | API-Fehlerkörper für fachliche Toast-Meldungen auswertbar gemacht |
| `apps/api/tests/integration/tickets.test.ts` | geändert | Umfangreiche Owner-, Link-, Delete- und Randfalltests ergänzt |
| `apps/web/e2e/tickets.spec.ts` | neu | Browsertests für Add, Link, Remove und Löschblockade ergänzt |

## Probleme und Abweichungen

Der vollständige Playwright-Lauf zeigt weiterhin 7 fehlschlagende bestehende E2E-Fälle in älteren Task-/Feature-/Freshness-Flows. Die neue Ticket-E2E-Suite selbst läuft vollständig grün; die bestehenden Fehlschläge wurden gemäß Testregel nicht nebenbei repariert. Beim Use-Case-Ticket-Flow wurde ein echtes Submit-Bubbling zwischen verschachtelten Modal-Formularen gefunden und über `FormModal` behoben.

## Offene Punkte / Folgeaufgaben

Die bestehenden fehlschlagenden Playwright-Fälle sollten in einem separaten Folgeauftrag geprüft und entweder an die aktuelle Task-/Feature-Owner-UI angepasst oder fachlich repariert werden.
