# Log: Backup Pfad Root

**Datum:** 20.05.26  
**Schritt:** Fix — Backup Pfad Root  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Backend-Konfiguration normalisiert den lokalen Backup-Pfad jetzt defensiv auf den Repository-Root. `BACKUP_WORK_DIR` bleibt weiterhin konfigurierbar, aber ein alter Override auf `apps/api/backups` wird automatisch auf `backups/` im Repo-Root umgebogen. Damit zeigt die Sicherungsseite auch dann den freigegebenen Root-Backup-Ordner an, wenn in der Laufzeitumgebung noch ein Legacy-Wert vorhanden ist. Für diese Normalisierung wurde ein gezielter Config-Test ergänzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/config.ts` | geändert | Backup-Pfad-Auflösung mit Legacy-Normalisierung ergänzt |
| `apps/api/src/config.test.ts` | neu | Tests für Root-Auflösung und Legacy-Pfad-Normalisierung |
| `logs/2026-05-20-fix-backup-pfad-root.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
