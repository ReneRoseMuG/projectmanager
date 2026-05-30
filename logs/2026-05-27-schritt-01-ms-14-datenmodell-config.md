# Log: MS-14 Datenmodell und Config

**Datum:** 27.05.26  
**Schritt:** 1 — Datenmodell, Shared Types, Config und Migration  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Event-Domäne wurde um `reminderMinutes` erweitert, damit Termine einen konfigurierbaren Erinnerungsvorlauf speichern. Zusätzlich wurden die technischen Tabellen `sent_notifications` und `push_subscriptions` in Schema und Migration ergänzt. Die App-Konfiguration liest nun die globalen Notification-, SMTP- und Web-Push-/VAPID-Werte aus der Umgebung. Die Shared Types enthalten den neuen Event-Wert, Push-DTOs und die neue Permission-Ressource `notifications`. Die Migration wurde lokal erfolgreich ausgeführt; der Drizzle-Generator war wegen fehlender Snapshots im bestehenden Migrationsbestand blockiert, daher wurde die SQL-Migration kontrolliert manuell angelegt und `_journal.json` ergänzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Event-DTOs, Push-DTOs und Auth-Resource `notifications` ergänzt |
| `apps/api/src/db/schema.ts` | geändert | `events.reminder_minutes`, `sent_notifications`, `push_subscriptions` ergänzt |
| `apps/api/src/db/migrations/0030_ms_14_notifications.sql` | neu | Migration für MS-14-Benachrichtigungstabellen und Event-Vorlauf |
| `apps/api/src/config.ts` | geändert | Notification-, SMTP- und VAPID-Konfiguration ergänzt |
| `apps/api/.env.example` | geändert | Neue Umgebungsvariablen dokumentiert |

## Probleme und Abweichungen

`npm run db:generate -w apps/api` ist mit der installierten Drizzle-CLI nicht kompatibel. Auch `drizzle-kit generate` war durch fehlende Snapshots im bestehenden Meta-Format blockiert. Die Migration wurde deshalb manuell im vorhandenen Legacy-Format angelegt. Ein versehentlicher `drizzle-kit up`-Konvertierungsversuch wurde auf die generierten Ordner und gelöschten alten SQL-Dateien begrenzt zurückgenommen.

## Offene Punkte / Folgeaufgaben

Backend-Versand, Frontend-Integration und fachliche Tests werden in den nächsten Schritten abgeschlossen.
