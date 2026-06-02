# Log: Meilenstein Create Verknüpfungen

**Datum:** 02.06.26  
**Uhrzeit:** 09:51:19  
**Schritt:** Fix — Meilenstein-Create Aufgaben- und Ticket-Verknüpfungen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Kandidatenabruf für Aufgaben- und Ticket-Verknüpfungen wurde für den Create-Kontext eines neuen Meilensteins eingegrenzt. Wenn kein bestehender Owner vorhanden ist, aber ein Projekt als Kontext übergeben wird, nutzt die API jetzt direkt die sichtbaren offenen Aufgaben beziehungsweise Tickets dieses Projekts. Damit muss die Kandidatenliste nicht mehr den gesamten globalen Bestand laden und pro Eintrag den Projektkontext nachermitteln. Zusätzlich wurden Integrationstests ergänzt, die genau diesen Projekt-Create-Kontext für Aufgaben und Tickets absichern. Der Testentwurfs-Skill wurde angewendet; betroffen ist die Integrationsebene mit echter Test-App und Testdatenbank, ohne Mocks.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/tasks.service.ts` | geändert | Projekt-Create-Kontext für Task-Link-Kandidaten direkt über Projektaufgaben aufgelöst |
| `apps/api/src/services/tickets.service.ts` | geändert | Projekt-Create-Kontext für Ticket-Link-Kandidaten direkt über Projekttickets aufgelöst |
| `tests/integration/api/tasks.test.ts` | geändert | Integrationstest für `contextOwnerType=project` bei Task-Link-Kandidaten ergänzt |
| `tests/integration/api/tickets.test.ts` | geändert | Integrationstest für `contextOwnerType=project` bei Ticket-Link-Kandidaten ergänzt |
| `logs/2026-06-02-09-51-19-fix-meilenstein-create-verknuepfungen.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index um diesen Fix ergänzt |

## Probleme und Abweichungen

Der gezielte Integrationstestlauf konnte lokal nicht ausgeführt werden, weil die Testdatenbankverbindung blockiert war: MySQL verweigerte den Zugriff für `root` ohne Passwort (`ER_ACCESS_DENIED_ERROR`). Der API-Build wurde stattdessen erfolgreich ausgeführt. Es wurden keine eigenständigen Testinfrastruktur-Fixes vorgenommen.

## Offene Punkte / Folgeaufgaben

Die ergänzten Integrationstests sollten in einer Umgebung mit korrekt konfigurierter MySQL-Testdatenbank ausgeführt werden.
