# Log: TKT-32 Kommentar Realtime

**Datum:** 28.05.26  
**Uhrzeit:** 17:14:43  
**Schritt:** Fix — TKT-32 Kommentar-Realtime-Invalidierung  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Realtime-Scope-Erkennung wurde so angepasst, dass verschachtelte Kommentar-Routen wie `POST /api/projects/:id/comments` als `comments` statt als Parent-Domäne veröffentlicht werden. Damit können offene Kommentar-Queries im Web-Client über den bestehenden Realtime-Sync invalidiert werden, wenn Kommentare extern über API oder MCP angelegt werden. Zusätzlich wurde ein API-Integrationstest ergänzt, der den Scope `comments` für eine Projekt-Kommentar-Mutation nachweist. Ein Browser-Test wurde in der bestehenden Realtime-Suite ergänzt, der das offene Projektdetail mit extern angelegtem Kommentar ohne Formular-Neuöffnung absichern soll.

Bei den Tests wurden die Projekt-Manager-Testentwurfsleitplanken angewendet. Testebenen: API-Integration mit echter Fastify-App und isolierter Temp-SQLite sowie Browser/E2E mit echter UI und API-Testdaten. Bewiesen werden soll, dass ein externer Kommentar-Write ein korrektes Realtime-Invalidierungsereignis erzeugt und im offenen Projektdetail sichtbar wird.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/plugins/realtime.ts` | geändert | Kommentar-Segmente werden vor Parent-Domänen als Realtime-Scope erkannt |
| `tests/integration/api/realtime.test.ts` | geändert | Integrationstest für verschachtelte Kommentar-Mutation mit `comments`-Scope ergänzt |
| `tests/browser/web/realtime.spec.ts` | geändert | Browser-Test für extern angelegte Projekt-Kommentare im offenen Detailformular ergänzt |

## Probleme und Abweichungen

Der API-Integrationstest ist grün: `npm run test -w apps/api -- tests/integration/api/realtime.test.ts` mit 5 bestandenen Tests. `npm run typecheck -w apps/api`, `npm run typecheck -w apps/web` und `git diff --check` sind grün.

Der Browser-Lauf `npm run e2e -w apps/web -- tests/browser/web/realtime.spec.ts` ist mit 3 fehlgeschlagenen Tests beendet. Alle Fehler entstehen bereits im Login-Helfer bei `getByLabel("E-Mail")`; der Snapshot zeigt stattdessen den Ein-Klick-Login „Als Rene anmelden“. Der neue Kommentar-Test erreicht dadurch den fachlichen Prüfpunkt nicht. Gemäß Testregel wurde nach dem fehlgeschlagenen Testlauf kein zusätzlicher Test- oder Produktionscode-Fix vorgenommen.

## Offene Punkte / Folgeaufgaben

Der Playwright-Login-Helfer oder die E2E-Auth-Konfiguration muss in einem separaten Folgeauftrag an den aktuellen Login-Screen angepasst werden, damit der neue Browser-Nachweis tatsächlich ausgeführt werden kann.
