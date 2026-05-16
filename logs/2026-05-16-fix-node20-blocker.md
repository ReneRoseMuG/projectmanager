# Log: Node 20 Blocker

**Datum:** 16.05.26  
**Schritt:** Fix — Node-Version-Blocker lösen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Vorher war systemweit Node `v24.12.0` aktiv. Der offizielle Node-20-MSI-Installer brach mit Exit-Code `1603` ab, deshalb wurde Node `v20.20.2` fachlich sauber als offizielle ZIP-Distribution von `nodejs.org` user-lokal unter `%LOCALAPPDATA%\CodexTools\node\node-v20.20.2-win-x64` bereitgestellt. Der Download wurde gegen die offizielle SHA256-Summe geprüft. Für alle Projektkommandos wurde diese Node-20-Distribution im Prozess-`PATH` vorangestellt; `node --version` ergab dabei `v20.20.2`, `npm --version` ergab `10.8.2`. `better-sqlite3@9.6.0` wurde mit dem passenden Prebuilt-Binary `node-v115-win32-x64` installiert und erfolgreich gegen eine In-Memory-DB geprüft.

Die DB-Migration wurde erfolgreich ausgeführt. Die SQLite-Datei liegt unter `apps/api/data/taskmanager.sqlite` und enthält die erwarteten Tabellen. Die API wurde gestartet und per Smoke-Test geprüft: `GET /api/projects` antwortete mit HTTP `200`, `POST /api/projects` antwortete mit HTTP `201` und vollständigem Projektobjekt. Das Frontend wurde gestartet; `http://localhost:5173/` antwortete mit HTTP `200`.

Beim POST-Smoke-Test fiel auf, dass Fastify generische Response-Schemas ohne Properties als `{}` serialisierte. Diese eng begrenzte Serializer-Korrektur war nötig, damit der geforderte Smoke-Test fachlich erfolgreich ist; Business-Logik, Schema und DB-Treiber wurden nicht geändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `.nvmrc` | neu | Dokumentiert Node-Version `20` |
| `package.json` | geändert | Ergänzt `engines.node` mit `>=20 <22` |
| `package-lock.json` | geändert | Neuinstallation unter Node 20 / npm 10 |
| `apps/api/src/utils/route-schemas.ts` | geändert | Wiederverwendbare Response-Schemas mit Properties-Erhalt |
| `apps/api/src/routes/projects.ts` | geändert | Verwendet korrigierte Response-Schemas |
| `apps/api/src/routes/tasks.ts` | geändert | Verwendet korrigierte Response-Schemas |
| `apps/api/src/routes/subtasks.ts` | geändert | Verwendet korrigierte Response-Schemas |
| `apps/api/src/routes/comments.ts` | geändert | Verwendet korrigierte Response-Schemas |
| `apps/api/src/routes/tags.ts` | geändert | Verwendet korrigierte Response-Schemas |
| `apps/api/src/routes/notes.ts` | geändert | Verwendet korrigierte Response-Schemas |
| `apps/api/src/routes/attachments.ts` | geändert | Verwendet korrigierte Response-Schemas |
| `apps/api/src/routes/events.ts` | geändert | Verwendet korrigierte Response-Schemas |
| `apps/web/src/components/ui/RichTextEditor.tsx` | geändert | TipTap-Typimport für Node-20-Installationsstand korrigiert |
| `logs/README.md` | geändert | Log-Index ergänzt |
| `logs/2026-05-16-fix-node20-blocker.md` | neu | Dieser Schritt-Log |

## Probleme und Abweichungen

Der globale MSI-Downgrade auf Node 20 war nicht möglich, weil `msiexec` mit Exit-Code `1603` abbrach. Statt die vorhandene systemweite Node-24-Installation zu beschädigen, wurde Node 20 als verifizierte user-lokale Distribution bereitgestellt und für die Projektkommandos aktiv verwendet.

Der erste `npm install` unter Node 20 lief länger als der Tool-Timeout und hinterließ zunächst unvollständige Bin-Links. Ein erneuter `npm install --foreground-scripts` und anschließend `npm rebuild better-sqlite3 -w apps/api` installierten das passende Prebuilt-Binary erfolgreich.

Die Browser-Konsole konnte nicht über eine Browser-Automation geprüft werden, weil keine Browser-Integration als nutzbares Tool verfügbar war. Geprüft wurden der laufende Vite-Server per HTTP `200` und die erfolgreiche API-Verbindung per direktem API-Smoke-Test.

## Offene Punkte / Folgeaufgaben

Für normale neue Terminals muss Node 20 entweder über einen Versionsmanager anhand `.nvmrc` aktiviert oder die user-lokale Node-20-Distribution im `PATH` vorangestellt werden. Die aktuell laufenden API- und Web-Server wurden mit Node `v20.20.2` gestartet.
