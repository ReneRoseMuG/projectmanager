# Log: Auth Bypass Admin

**Datum:** 21.05.26  
**Schritt:** Fix — Auth Bypass Admin  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Es wurde ein expliziter temporärer Admin-Bypass über `AUTH_BYPASS_ADMIN=true` ergänzt. Wenn das Flag aktiv ist, liefern `/api/auth/me` und der globale Auth-Guard ohne Session den konfigurierten Standardadmin aus der Datenbank. Der Bypass setzt `requiresPasswordSetup` bewusst auf `false`, damit der First-Login-Passwortflow die temporäre Umgehung nicht blockiert. Das normale Login bleibt unverändert, wenn das Flag nicht gesetzt ist. Das lokale Startscript setzt das Flag, damit der Start per Batch direkt in die App führt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/config.ts` | geändert | Env-Flag `AUTH_BYPASS_ADMIN` ergänzt |
| `apps/api/src/services/auth.service.ts` | geändert | Standardadmin als Bypass-User auflösbar gemacht |
| `apps/api/src/plugins/auth.ts` | geändert | Globaler Auth-Guard nutzt Bypass ohne Session |
| `apps/api/src/routes/auth.ts` | geändert | `/api/auth/me` liefert bei aktivem Bypass den Standardadmin |
| `Projekt Manager starten.bat` | geändert | Temporären Admin-Bypass für lokalen Start aktiviert |
| `tests/integration/api/auth.test.ts` | geändert | Integrationstest für aktivierten und deaktivierten Bypass ergänzt |
| `tests/fixtures/api/db.ts` | geändert | Test-Migration an bestehendes flaches Drizzle-Migrationsformat angepasst |

## Probleme und Abweichungen

Beim gezielten Auth-Test fiel auf, dass die API-Testfixture nach dem Drizzle-Update noch den neuen Drizzle-Migrator direkt nutzte und deshalb das vorhandene flache Migrationsformat ablehnte. Die Fixture wurde analog zum App-Startpfad auf den Legacy-Migrationsreader umgestellt. Keine SQL-Migrationsdateien wurden verändert.

## Offene Punkte / Folgeaufgaben

Der Bypass ist absichtlich temporär und sollte wieder entfernt oder im Startscript deaktiviert werden, sobald das normale Login wieder genutzt werden soll.
