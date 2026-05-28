# Log: Backup User Vollrestore

**Datum:** 27.05.26  
**Schritt:** Feature — Backup User Vollrestore  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der Dump-Export wurde auf Vollrestore umgestellt: `users` enthält künftig auch den Standardadmin, und `app_settings`, `settings_values` sowie User-Referenzen werden nicht mehr für lokale Admin-Sonderfälle bereinigt. Der Import stellt User/Auth-Daten aus dem Dump wieder her und mappt bestehende `roleCode`-Dumps weiterhin auf die importierten Rollen. Für alte Dumps ohne Standardadmin wurde ein enger Fallback ergänzt, der den aktuellen lokalen Admin mit seiner bestehenden ID einsetzt, wenn dadurch alte Admin-Referenzen wieder gültig werden. Die Foreign-Key-Fehlermeldung benennt fehlende `users.id`-Referenzen jetzt verständlicher. Der Testentwurfs-Skill wurde angewendet: Testebene Integration, echte Temp-SQLite-DB, echte ZIP-Dumps und echte Temp-Dateiverzeichnisse, keine Mocks für die Importlogik.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/dump.service.ts` | geändert | Dump-Format 11, User-Vollrestore, Legacy-Admin-Fallback und User-FK-Fehlermeldung ergänzt |
| `tests/integration/api/dumps-local.test.ts` | geändert | Dump-Integrationstests auf vollständigen User-Restore, Legacy-Fallback und fehlenden Nicht-Admin-User erweitert |
| `logs/2026-05-27-feature-backup-user-vollrestore.md` | neu | Schritt-Log für diese Änderung |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der gezielte Dump-Testlauf `npx vitest run ../../tests/integration/api/dumps-local.test.ts` ist grün mit 25 bestandenen Tests. `npm run build -w apps/api` ist grün. Der vollständige Lauf `npm run test -w apps/api` bleibt rot mit 407 bestandenen und 6 fehlgeschlagenen Tests. Die verbleibenden Fehler liegen in `auth.test.ts` und `notifications.test.ts` und liefern jeweils `401 Unauthorized` statt erwarteter Erfolgsstatus; sie hängen sichtbar an der lokalen Auth-/`ADMIN_EMAIL`-Testumgebung und nicht an den geänderten Dump-Tests. Gemäß Testregel wurden diese fremden Fehler dokumentiert und nicht im Rahmen dieses Auftrags behoben.

## Offene Punkte / Folgeaufgaben

Die Auth-/Notification-Testdrift sollte separat geprüft werden, insbesondere der Unterschied zwischen lokaler `ADMIN_EMAIL`-Konfiguration und den Testdaten mit `admin@local`.
