# Log: Backup Altbackup User Remap

**Datum:** 27.05.26  
**Schritt:** Fix — Backup Altbackup User Remap  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Legacy-Fallback für alte Dumps ohne Admin-User wurde erweitert. Wenn ein Altbackup keine Admin-User-Zeile enthält und nach dem Restore User-Fremdschlüssel fehlen, werden diese fehlenden User-Referenzen auf den lokalen Admin remappt. Damit wird der konkrete Fall `day_plans.user_id=2` in einem alten Dump auf den vorhandenen lokalen Admin umgebogen, statt den Import mit einem Foreign-Key-Fehler abzubrechen. Dumps, die bereits einen Admin-User enthalten, behalten den strikten Fehlerpfad für fehlende Nicht-Admin-User. Der bestehende Integrationstest wurde auf diesen Altbackup-Fall angepasst.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/dump.service.ts` | geändert | Legacy-Fallback remappt fehlende User-Referenzen auf lokalen Admin und aktualisiert Verifikationssummen |
| `tests/integration/api/dumps-local.test.ts` | geändert | Altbackup-Test deckt fehlendes `users.id=2` bei `day_plans.user_id=2` ab |
| `logs/2026-05-27-fix-backup-altbackup-user-remap.md` | neu | Schritt-Log für diesen Nachfix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Der vollständige API-Testlauf wurde für diesen Nachfix nicht erneut ausgeführt; der vorherige vollständige Lauf war weiterhin durch bekannte Auth-/Notification-401er außerhalb des Dump-Bereichs rot.

## Offene Punkte / Folgeaufgaben

Die separate Auth-/Notification-Testdrift bleibt offen.
