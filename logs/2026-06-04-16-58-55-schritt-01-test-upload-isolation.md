# Log: Test-Upload-Isolation

**Datum:** 04.06.26  
**Uhrzeit:** 16:58:55  
**Schritt:** 1 — Test-Upload-Isolation prüfen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Auftrag wurde als kleiner lokaler Fix mit anschließendem vollständigem Testlauf eingeordnet. Die repo-eigenen Planungs- und Testleitplanken wurden angewendet; die Skill-Dateien lagen nicht direkt unter `skills/`, sondern unter `skills/.Codex-sync/`. Geprüft wurden die Test- und Runner-Pfade für `UPLOAD_DIR`, `uploadDir`, `uploads`, Runtime-Verzeichnisse und direkte Hinweise auf `apps/api/uploads`. Die vorhandene Runtime-Safety blockiert im Testmodus `apps/api/uploads`, `apps/api/previews` und `apps/api/content` und erlaubt nur `os.tmpdir()` oder `tests/.runtime`. API-Vitest und Playwright setzen `UPLOAD_DIR` auf `tests/.runtime/.../uploads`; einzelne Integrationstests verwenden eigene Temp-Verzeichnisse. Daher war keine Änderung an Produktcode oder Testcode erforderlich.

Testleitplanken: Betroffene Testebenen sind Unit, Integration und Browser/E2E. Bewiesen werden soll, dass Dateisystemtests keine produktiven Upload-Pfade verwenden und dass die vollständige Testsuite anschließend beobachtbar ausgeführt wird. Echte Daten bleiben in Temp-DBs, `tests/.runtime` oder Temp-Roots; es wurden keine neuen Mocks eingeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `logs/2026-06-04-16-58-55-schritt-01-test-upload-isolation.md` | neu | Schritt-Log zur Upload-Isolationsprüfung |
| `logs/README.md` | geändert | Log-Index um den neuen Eintrag ergänzt |

## Probleme und Abweichungen

Die in `agents.md` genannten Repo-Skills waren nicht direkt unter `skills/projekt-manager-*` vorhanden, sondern im Sync-Unterordner `skills/.Codex-sync/`. Die Leitplanken konnten dort gelesen werden; dadurch entstand kein Umsetzungsblocker. Es wurde keine Codeänderung vorgenommen, weil kein Testpfad auf den produktiven Upload-Ordner zeigte.

## Offene Punkte / Folgeaufgaben

Der vollständige Testlauf mit API-, Web- und Browser/E2E-Tests steht als nächster Teilauftrag aus.
