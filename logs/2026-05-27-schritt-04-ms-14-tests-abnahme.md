# Log: MS-14 Tests und Abnahme

**Datum:** 27.05.26  
**Schritt:** 4 — Tests und Abnahme  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Testabdeckung für MS-14 wurde ergänzt und der vorgeschriebene Abschlusslauf seriell ausgeführt. Die API-Tests prüfen Event-Erstellung und -Update mit `reminderMinutes`, die Push-Routen, den gemeinsamen Versandpfad, Duplikatvermeidung und das Entfernen ungültiger Push-Subscriptions. Die Web-Tests decken Formular-Payload, Push-Hook und Einstellungen-UI ab. Zusätzlich wurde ein Browser-Test für den Kalender-Deep-Link `/calendar?eventId=<id>` ergänzt. Der API- und Web-Testlauf wurden vollständig ausgeführt; der Browser/E2E-Lauf blockierte vor verwertbarer Reporter-Ausgabe durch ein Timeout.

## Testleitplanken

Angewendet wurden die Planungs- und Testentwurfsleitplanken. Betroffene Testebenen sind Unit, Integration und Browser/E2E. Bewiesen werden sollte beobachtbar: Termine speichern den Erinnerungsvorlauf, berechtigte aktive Nutzer werden je Kanal genau einmal erinnert, Push-Subscriptions sind nutzergebunden, ungültige Push-Endpunkte werden entfernt und der Push-Klick öffnet den Termin im Kalender. API-Integrationstests nutzen echte Fastify-Apps und isolierte Testdatenbanken; externe SMTP- und Web-Push-Sender werden gemockt. Web-Tests laufen in JSDOM mit gemockten API- und Browser-Push-Schnittstellen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/integration/api/notifications.test.ts` | neu | Integrationstests für E-Mail-/Push-Versand, Push-Routen und Berechtigungen |
| `tests/integration/api/events.test.ts` | geändert | Event-Tests um `reminderMinutes` ergänzt |
| `tests/unit/web/components/calendar/EventForm.test.tsx` | geändert | Formular-Payload prüft Erinnerungsvorlauf |
| `tests/unit/web/hooks/usePushNotifications.test.tsx` | neu | Hook-Tests für Aktivieren und Deaktivieren von Browser-Push |
| `tests/unit/web/components/settings/PushNotificationsPanel.test.tsx` | neu | UI-Tests für Push-Einstellungen und Berechtigungszustände |
| `tests/browser/web/calendar.spec.ts` | geändert | Browser-Test für `/calendar?eventId=<id>` ergänzt |

## Testlauf-Ergebnisse

| Kommando | Status | Grün | Rot | Übersprungen | Blockiert |
|---|---:|---:|---:|---:|---:|
| `npm run test -w apps/api` | fehlgeschlagen | 394 | 9 | 0 | 0 |
| `npm run test -w apps/web` | fehlgeschlagen | 521 | 2 | 0 | 0 |
| `npm run e2e -w apps/web` | blockiert | 0 | 0 | 0 | 1 Kommando |

## Probleme und Abweichungen

Der erste API-Teststart lief in ein Tool-Timeout mit `EPIPE`; derselbe Befehl wurde danach mit größerem Zeitfenster erneut ausgeführt und lieferte das verwertbare Ergebnis. Im API-Lauf sind drei bestehende Dump-Roundtrip-Tests, drei bestehende Auth-Tests und drei neue Notification-Integrationstests rot. Die neuen Notification-Tests scheitern beim Anlegen von Events mit `401 Unauthorized`. Im Web-Lauf sind zwei bestehende Sidebar-Tests rot, weil der erwartete Placeholder `Navigation durchsuchen` nicht gefunden wird. Der Browser/E2E-Lauf erreichte nach 304 Sekunden ein Timeout ohne Reporter-Ausgabe; es blieben keine neu gestarteten Node-Prozesse hängen.

## Offene Punkte / Folgeaufgaben

Die roten Auth-, Dump- und Notification-Integrationstests müssen in einem separaten Folgeauftrag eingeordnet und behoben werden. Der Browser/E2E-Timeout muss separat untersucht werden, idealerweise mit Reporter- oder Debug-Ausgabe, damit klar wird, ob Serverstart, Playwright-Runner oder ein Test selbst hängt. Danach müssen die drei Abschlusskommandos erneut seriell laufen.
