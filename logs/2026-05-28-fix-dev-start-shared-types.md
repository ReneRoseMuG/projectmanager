# Log: Dev-Start Shared Types

**Datum:** 28.05.26  
**Schritt:** Fix — Dev-Start Shared Types  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Startblocker wurde auf eine veraltete lokale Build-Ausgabe von `packages/shared-types` zurückgeführt. Die Shared-Types-Quellen enthielten die benötigten Typen und Konstanten bereits, aber `packages/shared-types/dist` war beim API-Build noch alt. Der Root-Dev-Start und die Root-Migration bauen die Shared Types jetzt vorab. Zusätzlich baut der direkte API-Build die Shared Types über einen `prebuild`-Schritt, damit auch `npm run dev -w apps/api` und `npm run db:migrate -w apps/api` nicht mehr gegen veraltete Typdefinitionen laufen. Die ausstehenden Migrationen wurden danach erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `package.json` | geändert | `dev` und `db:migrate` bauen Shared Types vor API/MCP-Startpfaden |
| `apps/api/package.json` | geändert | `prebuild` baut Shared Types vor dem API-TypeScript-Build |
| `logs/2026-05-28-fix-dev-start-shared-types.md` | neu | Schritt-Log für den Dev-Start-Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der erste Versuch mit `npm --prefix ../.. run build -w packages/shared-types` funktionierte im Workspace-Lifecycle nicht, weil npm dort keine Workspaces erkannte. Der API-`prebuild` nutzt deshalb einen expliziten Wechsel ins Repo-Root per `cd ../..`. Beim Dev-Smoke-Check blockierte ein PowerShell-Polling-Aufruf länger als erwartet; der dadurch gestartete Dev-Prozess wurde anschließend identifiziert, geprüft und nach erfolgreicher Verifikation wieder beendet.

## Offene Punkte / Folgeaufgaben

Keine.

## Testleitplanken und Verifikation

Testleitplanken wurden für den Runtime-Smoke-Check angewendet. Testebene: kein formaler Unit-, Integrations- oder E2E-Test, sondern Betriebscheck mit echter lokaler Dev-DB und echtem Dev-Server. Bewiesenes Verhalten: Nach aktualisiertem Shared-Types-Build laufen Migration und Dev-Start, `/api/health` liefert HTTP 200 und die Web-Root liefert HTTP 200. Verwendete Isolation: keine Testdaten-Isolation, weil die produktive lokale Dev-DB bewusst migriert wurde; keine Mocks.
