# Log: SFTP Env-Konfiguration

**Datum:** 22.05.26  
**Schritt:** Fix — SFTP Env-Konfiguration  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die lokale API-Umgebungsdatei wurde angelegt, weil `apps/api/.env` noch nicht existierte. Die Basiswerte wurden aus `apps/api/.env.example` übernommen, damit der lokale API-Start weiterhin die erwarteten Pflichtvariablen findet. Die SFTP-Sicherung wurde aktiviert und mit Host, Benutzer, Passwort, Port 22 und dem Remote-Pfad `/home/p-ev6w6q/html/backups` konfiguriert. Zusätzlich wurde die Schutzbestätigung für das Remote-Backup-Verzeichnis gesetzt, damit die SFTP-Readiness nicht an der Sicherheitsprüfung scheitert. Nach dem ersten Startversuch wurde außerdem das lokale `SESSION_SECRET` auf eine zulässige Länge gebracht, weil Fastify Session mindestens 32 Zeichen verlangt. Geheimwerte werden bewusst nicht im Log wiederholt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/.env` | lokal neu/geändert | Lokale, ignorierte API-Umgebung mit SFTP-Konfiguration und gültigem Session-Secret angelegt |
| `logs/2026-05-22-fix-sftp-env-konfiguration.md` | neu | Schritt-Log ohne Geheimwerte |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Der erste API-Startversuch brach mit `the secret must have length 32 or greater` ab, weil der aus `.env.example` übernommene Platzhalter für `SESSION_SECRET` nur 23 Zeichen lang war. Der lokale Wert wurde ohne Änderung an `.env.example` korrigiert. Eine redigierte Config-Prüfung über den gebauten API-Code bestätigte anschließend eine Secret-Länge von 35 und vollständig gesetzte SFTP-Readiness-Eingaben.

## Offene Punkte / Folgeaufgaben

Keine.
