# Log: Projektgrenzen für Aufgaben- und Ticket-Verknüpfungen

**Datum:** 22.05.26  
**Schritt:** Feature — Projektgrenzen für Aufgaben- und Ticket-Verknüpfungen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Umsetzung läuft auf dem Arbeitsbranch `pm-projektgrenzen-relationen`, der von `work` abgezweigt wurde. Für Aufgaben- und Ticket-Verknüpfungen wurde eine gemeinsame Projektkontext-Prüfung ergänzt, die direkte Owner-Zuordnungen, Aufgaben-Elternbezüge sowie Ticket-Relationen berücksichtigt und projektfremde neue Verknüpfungen mit `BAD_REQUEST` ablehnt. Zusätzlich wurden Kandidaten-Endpunkte für Aufgaben, Tickets und Ticket-Relationen ergänzt, damit das Web nur noch zulässige bestehende Ziele anbietet, ohne die globalen `/api/tasks`- und `/api/tickets`-Listen zu verändern. Die Verknüpfungsdialoge und Formularflüsse im Web wurden auf diese Kandidaten umgestellt; kontextlose neue Formulare blenden bestehende Links aus, lassen aber neue Drafts weiter zu. Für Feature-Erstellung mit Projektkontext wird die Projekt-Feature-Zuordnung vor nachgelagerten Aufgaben- und Ticket-Links gespeichert, damit die Backend-Prüfung einen belastbaren Projektkontext hat. Es wurde keine DB-Migration angelegt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Gemeinsame Owner-Typen für Aufgaben und Tickets ergänzt |
| `apps/api/src/services/project-context.service.ts` | neu | Projektkontext-Ermittlung und Grenzprüfung für Links |
| `apps/api/src/services/tasks.service.ts` | geändert | Kandidatenliste ergänzt und `linkOwnerTask` gegen Projektgrenzen abgesichert |
| `apps/api/src/services/tickets.service.ts` | geändert | Kandidatenlisten ergänzt und Ticket-Links sowie Ticket-Relationen abgesichert |
| `apps/api/src/routes/tasks.ts` | geändert | Geschützten Kandidaten-Endpunkt für Aufgaben-Links ergänzt |
| `apps/api/src/routes/tickets.ts` | geändert | Geschützte Kandidaten-Endpunkte für Ticket-Links und Ticket-Relationen ergänzt |
| `apps/web/src/api/tasks.ts` | geändert | API-Funktion für Aufgaben-Link-Kandidaten ergänzt |
| `apps/web/src/api/tickets.ts` | geändert | API-Funktionen für Ticket-Link- und Relation-Kandidaten ergänzt |
| `apps/web/src/queries/queryKeys.ts` | geändert | Query-Keys für Kandidatenlisten ergänzt |
| `apps/web/src/components/tasks/TaskLinkDialog.tsx` | geändert | Bestehende Aufgaben über Kandidaten-Endpunkt geladen |
| `apps/web/src/components/tickets/TicketLinkDialog.tsx` | geändert | Bestehende Tickets über Kandidaten-Endpunkt geladen |
| `apps/web/src/components/tasks/OwnerTaskBoard.tsx` | geändert | Owner-Kontext an Aufgaben-Verknüpfungsdialog übergeben |
| `apps/web/src/components/tickets/OwnerTicketBoard.tsx` | geändert | Owner-Kontext an Ticket-Verknüpfungsdialog übergeben |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Projektformular auf kontextabhängige Link-Auswahl umgestellt |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Feature-Create mit optionalem Projektkontext und Kandidatenlisten ergänzt |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Use-Case-Kontext für Aufgaben- und Ticket-Auswahl verwendet |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Aufgabenformular mit Kontextlogik für bestehende Links ergänzt |
| `apps/web/src/components/tickets/TicketForm.tsx` | geändert | Ticketformular mit Kontextlogik und Relation-Kandidaten ergänzt |
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Projekt-Feature-Link vor abhängigen Pending-Links gespeichert |
| `apps/web/src/pages/TaskDetailPage.tsx` | geändert | Aufgaben-Detailseite mit Kontext für Ticket-Erstellung ergänzt |
| `apps/web/src/pages/TicketDetailPage.tsx` | geändert | Ticket-Detailseite mit Kontext für Aufgaben- und Ticket-Erstellung ergänzt |
| `tests/fixtures/web/components/test/ownerFormTestUtils.tsx` | geändert | Testhelfer für kontextabhängige Link-Buttons erweitert |
| `tests/integration/api/auth.test.ts` | geändert | Auth-Abdeckung für neue Kandidaten-Endpunkte ergänzt |
| `tests/integration/api/tasks.test.ts` | geändert | Aufgaben-Kandidaten und Projektgrenzen getestet |
| `tests/integration/api/tickets.test.ts` | geändert | Ticket-Kandidaten, Relation-Kandidaten und Projektgrenzen getestet |
| `tests/unit/web/components/projects/ProjectForm.test.tsx` | geändert | Projektformular-Tests auf Kandidatenverhalten angepasst |
| `tests/unit/web/components/features/FeatureForm.test.tsx` | geändert | Featureformular-Tests für Projektkontext und kontextlose Links angepasst |
| `tests/unit/web/components/tasks/TaskForm.test.tsx` | geändert | Aufgabenformular-Tests für kontextabhängige Links angepasst |
| `tests/unit/web/components/tickets/TicketForm.test.tsx` | geändert | Ticketformular-Tests für Link- und Relation-Kandidaten angepasst |
| `tests/unit/web/components/relations/LinkDialogs.test.tsx` | neu | Dialogtests für Kandidaten-Endpunkte ergänzt |
| `logs/2026-05-22-feature-projektgrenzen-relationen.md` | neu | Schritt-Log für diese Änderung |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Die Implementierung ist fachlich umgesetzt, aber die offiziellen Testläufe sind noch nicht grün. `npm run test -w apps/api` ist mit 338 bestandenen und 11 fehlgeschlagenen Tests beendet worden. Betroffen sind bestehende Tests, die bisher projektübergreifende Aufgaben-/Ticket-Verknüpfungen als gültig erwartet haben, sowie ein unabhängiger Content-Service-Test mit abweichendem erwarteten Dateinamen. `npm run test -w apps/web` ist mit 348 bestandenen und 1 fehlgeschlagenem Test beendet worden; der betroffene Test ist `tests/unit/web/components/features/FeatureForm.test.tsx` und findet beim erneuten Öffnen des Formulars ein erwartetes Eingabefeld nicht. `npm run e2e -w apps/web` wurde gestartet, konnte aber keine Tests ausführen, weil `http://127.0.0.1:5174` bereits belegt war. Nach den fehlgeschlagenen Testläufen wurden gemäß Arbeitsanweisung keine spontanen Zusatzfixes mehr vorgenommen.

## Offene Punkte / Folgeaufgaben

Die Altdaten- und Alt-Test-Erwartungen für projektübergreifende bestehende Verknüpfungen müssen in einem Folgeauftrag bereinigt oder bewusst als Kompatibilitätsfall entschieden werden. Der rote FeatureForm-Unit-Test muss separat untersucht werden. Der blockierte E2E-Lauf sollte nach Freigabe des Ports oder mit angepasster Testumgebung erneut ausgeführt werden. Verifiziert wurden zusätzlich erfolgreich `npm run build -w packages/shared-types`, `npm run typecheck -w apps/api` und `npm run typecheck -w apps/web`.
