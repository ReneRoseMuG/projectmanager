# Log: Vollbackup Beschleunigung

**Datum:** 27.05.26  
**Schritt:** Fix — Vollbackup Beschleunigung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Vollsicherung wurde so angepasst, dass der Dateibestand für `uploads` und `content` im Vollbackup-Pfad nicht mehr vorab vollständig für das Manifest gelesen und danach noch einmal für das ZIP über `archive.directory` gelesen wird. Stattdessen werden die Dateien für das Vollbackup einmal eingelesen, dabei gehasht und direkt als ZIP-Einträge angehängt; das Manifest wird danach aus diesen Einträgen erzeugt. Die ZIP-Kompression wurde von Level 6 auf Level 1 reduziert, weil die aktuelle Backup-Größe nahezu der Rohdatenmenge entspricht und hohe Kompression kaum Nutzen bringt. Zusätzlich sendet die Archivphase nun echte Fortschrittsereignisse pro Datei. Die UI wartet nach erfolgreicher Vollsicherung nicht mehr auf die Remote-Statusliste, sondern aktualisiert diese im Hintergrund.

Testleitplanken angewendet: Integrationstest mit echter Temp-DB, echten Temp-Dateien und Mock-SFTP; Web-Unit-Test mit Hook-Doubles für die UI-Wartewirkung. Geprüft wird beobachtbares Verhalten: importierbares ZIP, SFTP-Upload, Archiv-Fortschritt und UI-Freigabe trotz nicht aufgelöster Remote-Statusabfrage.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/dump.service.ts` | geändert | Vollbackup-Archivierung liest Dateiinhalte nur einmal, senkt ZIP-Kompression und meldet Archivfortschritt |
| `apps/web/src/pages/SettingsBackupPage.tsx` | geändert | Remote-Status nach Vollsicherung wird im Hintergrund aktualisiert |
| `tests/integration/api/dumps-local.test.ts` | geändert | Vollbackup-SFTP-Test prüft Archiv-Fortschritt mit echten Dateien |
| `tests/unit/web/pages/SettingsBackupPage.test.tsx` | geändert | UI-Test prüft, dass die Vollsicherung nicht auf die Remote-Liste wartet |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der Web-Build meldet weiterhin die bekannte Vite-Warnung zu großen Chunks. Das Backup selbst, die gezielten Tests, Typechecks und Builds sind erfolgreich.

## Offene Punkte / Folgeaufgaben

Falls die gemessene Restwartezeit weiterhin zu lang ist, sollte als separater Schritt ein echter Hintergrund-SFTP-Upload geplant werden. Dieser Schritt ändert die Bedeutung von „Sicherung abgeschlossen“ und wurde deshalb bewusst nicht in diesen Fix aufgenommen.
