# Log: Dump Standardadmin

**Datum:** 21.05.26  
**Schritt:** Fix — Dump-Backup: Standardadmin lokal halten  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Dump-Service exportiert die `users`-Tabelle weiterhin, schließt aber den konfigurierten Standardadmin aus. Nicht-Admin-Benutzer werden im Dump mit `roleCode` statt lokaler `role_id` serialisiert, damit Rollen beim Import über ihren stabilen Schlüssel gemappt werden. `app_settings.admin_setup_done` und `USER`-Settings des Standardadmins werden aus neuen Dumps ausgeschlossen; Referenzen auf den Standardadmin in Audit-Spalten und Journal-Einträgen werden im Dump auf `null` gesetzt. Beim Import werden der lokale Standardadmin, sein Setup-Status und seine lokalen User-Settings vor dem Tabellen-Restore gesichert und danach wiederhergestellt. Bestehende rohe User-Dumps mit `role_id` werden weiterhin akzeptiert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/dump.service.ts` | geändert | Dump-Normalisierung, Standardadmin-Schutz, `roleCode`-Mapping und Restore-Verifikation ergänzt |
| `tests/integration/api/dumps-local.test.ts` | geändert | Export-, Import-, Legacy- und Fehlerfalltests für den Standardadmin-Schutz ergänzt |
| `logs/2026-05-21-fix-dump-standardadmin.md` | neu | Schritt-Log für diesen Fix |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
