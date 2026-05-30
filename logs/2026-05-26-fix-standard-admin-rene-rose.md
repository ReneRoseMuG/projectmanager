# Log: Standard-Admin Rene Rose

**Datum:** 26.05.26  
**Schritt:** Fix — Standard-Admin Rene Rose  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der lokale Standard-Admin wurde auf `Rene Rose <schroedingerskater@web.de>` umgestellt. Dafür wurden die lokalen Admin-Defaults in `apps/api/.env` ergänzt, damit zukünftige Auth-Seeds dieselbe Admin-Mail und denselben Namen verwenden. In der lokalen SQLite-Datenbank wurde der vorhandene Standard-Admin-Datensatz auf die neue Identität aktualisiert, aktiv gehalten und mit der Admin-Rolle verbunden. Das Passwort wurde als bcrypt-Hash mit 12 Salt-Rounds gespeichert; Klartext-Passwort und Hash werden nicht im Log dokumentiert. `admin_setup_done` wurde auf `true` gesetzt, damit der Admin direkt den normalen Login nutzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/.env` | geändert | Lokale Standard-Admin-Konfiguration ergänzt |
| `apps/api/data/taskmanager.sqlite` | geändert | Standard-Admin-Datensatz und Passwort-Hash aktualisiert |
| `logs/2026-05-26-fix-standard-admin-rene-rose.md` | neu | Schritt-Log für den lokalen Admin-Fix |

## Probleme und Abweichungen

Der vorhandene Admin-Datensatz wurde aktualisiert statt physisch gelöscht und neu angelegt, damit bestehende Benutzer-Referenzen und die Benutzer-ID erhalten bleiben. Die alte E-Mail `admin@local` ist danach nicht mehr als Benutzer vorhanden.

## Offene Punkte / Folgeaufgaben

Keine.
