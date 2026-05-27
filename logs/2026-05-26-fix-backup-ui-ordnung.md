# Log: Backup UI Ordnung

**Datum:** 26.05.26  
**Schritt:** Fix — Backup UI Ordnung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Backup-Adminseite wurde in klar getrennte Bereiche für Vollsicherung und SFTP-Sync aufgeteilt. Die gemischte obere Aktionsleiste wurde entfernt; `Sichern` steht nun im Bereich `Vollsicherung`, während `Sync` und `Sync importieren` im Bereich `SFTP-Sync` stehen. Die überflüssigen Aktionen `Neueste importieren` und `Aktualisieren` wurden entfernt. Der gezielte Import einzelner Remote-Vollsicherungen bleibt in der Tabelle `Remote-Vollsicherungen` erhalten. Ergebnis- und Prüfungsanzeigen wurden jeweils dem passenden Bereich zugeordnet, damit Sicherung und Sync nicht mehr vermischt wirken.

Für die Teständerung wurden die Testentwurfsleitplanken angewendet. Testebene: Unit/jsdom. Abgedeckt wird das beobachtbare Rendering der getrennten Bereiche, der verbleibenden Kernaktionen und der entfernten überflüssigen Aktionen; Datenhooks bleiben als Hook-Doubles isoliert, ohne echte API-, Datenbank- oder Dateisystemzugriffe.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/SettingsBackupPage.tsx` | geändert | Backup-Seite in Vollsicherung, SFTP-Sync und Remote-Vollsicherungen gegliedert |
| `tests/unit/web/pages/SettingsBackupPage.test.tsx` | geändert | Rendering der getrennten Bereiche und entfernten Buttons abgesichert |
| `logs/2026-05-26-fix-backup-ui-ordnung.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der vollständige Web-Lintlauf scheitert weiterhin an einem bestehenden, nicht berührten Fehler in `apps/web/src/hooks/useStatusCascadeWorkflow.tsx` (`_statusSortOrder` ist unbenutzt). Die geänderte Seite und der geänderte Test wurden gezielt per ESLint geprüft. Die Browser-Plugin-Steuerung war in dieser Sitzung nicht als ausführbares Werkzeug verfügbar; der lokale Dev-Server auf `http://localhost:5173/admin/backup` antwortete mit HTTP 200, eine visuelle Browser-Screenshot-Prüfung über das Plugin war jedoch blockiert.

## Offene Punkte / Folgeaufgaben

Der bestehende Lint-Fehler in `apps/web/src/hooks/useStatusCascadeWorkflow.tsx` sollte separat bereinigt werden.
