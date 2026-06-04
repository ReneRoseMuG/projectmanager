# Log: Lokaler Upload-Pfad

**Datum:** 04.06.26  
**Uhrzeit:** 16:40:58  
**Schritt:** Fix — Lokaler Upload-Pfad  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Attachment-Konfiguration wurde auf einen einzigen lokalen Upload-Pfad reduziert. `config.uploadDir` wertet jetzt ausschließlich `UPLOAD_DIR` aus und fällt bei leerem oder fehlendem Wert auf `./uploads` unterhalb von `apps/api` zurück. Die alte Variable `ATTACHMENT_BASE_PATH` wurde aus der versionierten Beispielkonfiguration und aus der API-Testkonfiguration entfernt. Die lokale `.env` wurde ebenfalls auf `UPLOAD_DIR=./uploads` umgestellt, damit die vorhandenen MS-9-Dateien unter `apps/api/uploads` wieder gefunden werden. Für MS-9 wurden die beiden betroffenen Storage-Dateien im lokalen Zielordner geprüft; beide existieren mit den zur Datenbank passenden Dateigrößen.

Testleitplanken: Der Testentwurfs-Skill war lokal nicht vorhanden; angewendet wurden daher die Leitplanken aus `agents.md`. Betroffene Testebene war API-Integration plus Typecheck. Bewiesen wurde, dass die geänderte Konfiguration typisiert bleibt und die bestehende Attachment-API mit isolierten Testdaten unter `tests/.runtime` weiter funktioniert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/config.ts` | geändert | Upload-Pfad auf `UPLOAD_DIR`-only umgestellt |
| `apps/api/.env.example` | geändert | Alte `ATTACHMENT_BASE_PATH`-Konfiguration entfernt |
| `apps/api/vitest.config.ts` | geändert | Testumgebung auf `UPLOAD_DIR`-only bereinigt |
| `apps/api/.env` | lokal geändert | Netzwerkpfad entfernt und lokaler Upload-Ordner gesetzt |
| `logs/2026-06-04-16-40-58-fix-lokaler-upload-pfad.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Der laut `agents.md` verpflichtende Planungs-Skill `skills/projekt-manager-planungsleitplanken` war lokal nicht vorhanden. Auch der Testentwurfs-Skill `skills/projekt-manager-test-entwurfsleitplanken` war lokal nicht vorhanden; die Testentscheidung wurde deshalb direkt nach `agents.md` dokumentiert. Ein zusätzlicher direkter `tsx`-Konfigurationscheck wurde durch einen lokalen esbuild-Spawn-Fehler blockiert. Die regulären Prüfungen `npm run typecheck -w apps/api` und `npm run test -w apps/api -- tests/integration/api/attachments.test.ts` liefen erfolgreich.

## Offene Punkte / Folgeaufgaben

Keine.
