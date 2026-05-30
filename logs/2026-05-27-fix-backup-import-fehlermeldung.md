# Log: Backup-Import-Fehlermeldung

**Datum:** 27.05.26  
**Schritt:** Fix — Backup-Import-Fehlermeldung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Backup-Seite wertet Fehler aus API-Antworten jetzt über die vorhandene asynchrone Fehlerhilfe aus. Dadurch wird bei einem fehlgeschlagenen Remote-Backup-Import nicht mehr nur die generische Ky-Meldung zum HTTP-Status angezeigt, sondern die fachliche `message` aus dem Backend-Fehlerformat. Der Importablauf, die SFTP-Kommunikation, die Dump-Validierung und die Backend-Routen wurden nicht verändert. Ergänzend wurde ein Web-Unit-Test hinzugefügt, der einen 400-Fehler aus `applyRemoteDump` mit API-Payload simuliert und die sichtbare Fehlermeldung prüft.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/SettingsBackupPage.tsx` | geändert | Backup-Seite nutzt `errorMessageAsync` für API-Fehler aus den Aktionspfaden |
| `tests/unit/web/pages/SettingsBackupPage.test.tsx` | geändert | Unit-Test für sichtbare Backend-Fehlermeldung beim Remote-Import ergänzt |
| `logs/2026-05-27-fix-backup-import-fehlermeldung.md` | neu | Schritt-Log für den Fix |

## Testleitplanken und Testebenen

Angewendet wurden die Repo-Testentwurfsleitplanken. Testebene: Web-Unit-Test mit jsdom. Beobachtbares Verhalten: Nach Klick auf einen Remote-Import mit bestätigtem Dialog und API-Fehler wird die Backend-Fehlermeldung sichtbar, während die generische HTTP-Statusmeldung nicht angezeigt wird. Echte Daten/Isolation: isolierte React-Renderumgebung mit kontrollierten Hook- und API-Doubles; keine produktive DB, keine echten Backups und kein Dateisystemzugriff. Mock-Entscheidung: API- und Status-Hooks werden gemockt, weil die UI-Fehlerauswertung der Seite getestet wird.

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
