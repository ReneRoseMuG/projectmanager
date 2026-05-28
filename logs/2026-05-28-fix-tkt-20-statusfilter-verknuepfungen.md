# Log: TKT-20 Statusfilter Verknüpfungen

**Datum:** 28.05.26  
**Schritt:** Fix — TKT-20 Aufgaben und Tickets verknüpfen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Verknüpfungskandidaten für Aufgaben und Tickets berücksichtigen jetzt die geschlossenen Einträge des `workStatus`-Katalogs. Geschlossene Aufgaben und Tickets werden in den Kandidatenlisten für Projekt- und Milestone-Verknüpfungen nicht mehr zurückgegeben. Direkte API-Link-Aufrufe blockieren geschlossene Aufgaben und Tickets zusätzlich serverseitig, damit alte UI-Daten oder externe Tools die Regel nicht umgehen können. Ticket-Relationen berücksichtigen dieselbe Statusregel: geschlossene Quell- oder Ziel-Tickets werden für neue Relationen ausgeschlossen. Bestehende Verknüpfungen und Listenanzeigen wurden bewusst nicht entfernt oder gefiltert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/tasks.service.ts` | geändert | Task-Link-Kandidaten und direkte Task-Owner-Links schließen geschlossene Status aus |
| `apps/api/src/services/tickets.service.ts` | geändert | Ticket-Link-Kandidaten, Owner-Links und Ticket-Relationen schließen geschlossene Status aus |
| `tests/integration/api/tasks.test.ts` | geändert | Integrationstests für Projekt- und Milestone-Task-Link-Kandidaten mit geschlossenen Gegenbeispielen |
| `tests/integration/api/tickets.test.ts` | geändert | Integrationstests für Ticket-Link-Kandidaten und Ticket-Relationen mit geschlossenen Gegenbeispielen |
| `tests/integration/api/milestones.test.ts` | geändert | Bestehender Milestone-Relationstest an neue Link-Regel angepasst |
| `logs/2026-05-28-fix-tkt-20-statusfilter-verknuepfungen.md` | neu | Schritt-Log für TKT-20 |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Testleitplanken

Der Testentwurfs-Skill wurde angewendet. Testebene: Integration. Bewiesenes Verhalten: echte Projekte, Meilensteine, Aufgaben und Tickets werden über echte Fastify-Routen und eine isolierte Testdatenbank angelegt; offene Kandidaten bleiben verknüpfbar, geschlossene Kandidaten fehlen und direkte Link-POSTs liefern `400`. Es wurden keine Mocks verwendet. Die Tests nutzen die bestehende API-Testisolation mit temporärer SQLite-Testdatenbank und kontrollierten Testdaten.

## Probleme und Abweichungen

Der fokussierte Testlauf `npm run test -w apps/api -- tests/integration/api/tasks.test.ts tests/integration/api/tickets.test.ts tests/integration/api/milestones.test.ts` war grün mit 71 bestandenen Tests.

Der vollständige API-Testlauf `npm run test -w apps/api` bleibt außerhalb dieses Fixes rot: 419 Tests bestanden, 8 Tests schlugen fehl. Die Fehler liegen in `tests/integration/api/auth.test.ts` und `tests/integration/api/notifications.test.ts`; alle gemeldeten Fehler sind `401 Unauthorized` statt erwarteter Auth-/Bypass-/Event-Antworten. Diese Fehler wurden gemäß Testregel dokumentiert und nicht im Rahmen von TKT-20 behoben.

## Offene Punkte / Folgeaufgaben

Die bestehenden Auth-/Notification-Testfehler sollten in einem separaten Auftrag untersucht werden.
