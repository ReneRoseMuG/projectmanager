# Log: MS-14 Backend Versand und API

**Datum:** 27.05.26  
**Schritt:** 2 — Backend-Services, Push-Routen, Scheduler, Dump- und Test-Fixtures  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Für MS-14 wurden technische Repositories für gesendete Benachrichtigungen und Browser-Push-Subscriptions angelegt. Der E-Mail-Service ermittelt fällige Termine und aktive Nutzer mit `events:read`, versendet über SMTP und schreibt anschließend den Duplikatschutz. Der Push-Service speichert nur eigene Subscriptions, liefert den öffentlichen VAPID-Key aus, sendet Web-Push-Payloads und entfernt ungültige Subscriptions bei `410 Gone`. Ein Scheduler startet nur bei aktivierten Benachrichtigungen und führt E-Mail- und Push-Versand ohne parallele Überlappung aus. Dump-Registry, Test-Truncation und Fixture-Factories berücksichtigen die neuen Tabellen und `reminderMinutes`.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/notification.service.ts` | neu | Fällige E-Mail-Erinnerungen und Empfängerermittlung |
| `apps/api/src/services/push-notification.service.ts` | neu | Push-Subscription-Verwaltung und Push-Versand |
| `apps/api/src/routes/push.ts` | neu | Geschützte Push-API für VAPID-Key, Status, Subscribe und Unsubscribe |
| `apps/api/src/services/notification-scheduler.service.ts` | neu | Cron-Registrierung für beide Versandkanäle |
| `apps/api/src/services/dump.service.ts` | geändert | Neue Notification-Tabellen in Dump-Registry aufgenommen |

## Probleme und Abweichungen

Keine fachliche Abweichung vom Plan. Die Reader-Rolle erhält gezielt `notifications:write`, damit reine Leser nur ihre eigenen Push-Subscriptions verwalten können; die serverseitige User-Bindung bleibt die Sicherheitsgrenze.

## Offene Punkte / Folgeaufgaben

Die neuen Backend-Pfade werden im Testschritt mit Unit- und Integrationstests abgesichert.
