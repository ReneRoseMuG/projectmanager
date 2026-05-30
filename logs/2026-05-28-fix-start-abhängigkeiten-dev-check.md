# Log: Start-Abhängigkeiten und Dev-Check

**Datum:** 28.05.26  
**Schritt:** Fix — Start-Abhängigkeiten und Dev-Check  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die fehlende Web-Abhängigkeit wurde über `npm install` aus dem bestehenden Lockfile nachinstalliert. Dadurch ist `date-holidays` wieder in `node_modules` vorhanden und `npm ls date-holidays` läuft erfolgreich. Anschließend wurden `npm run db:migrate` und `npm run dev` seriell erneut ausgeführt. Der Web-Dev-Server startete im Smoke-Check bis zur Vite-Bereitschaft ohne den vorherigen `date-holidays`-Auflösungsfehler. Die Gesamt-Betriebsbereitschaft ist weiterhin nicht erreicht, weil der API-Build vor Migration und API-Start mit TypeScript-Fehlern abbricht.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `node_modules/` | lokal aktualisiert | Fehlende installierte Pakete aus dem vorhandenen Lockfile ergänzt |
| `logs/2026-05-28-fix-start-abhängigkeiten-dev-check.md` | neu | Schritt-Log für Install- und Dev-Check |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

`npm run db:migrate` wird weiterhin durch TypeScript-Fehler im API-Build blockiert. Betroffen sind unter anderem `contentImages` als Auth-Resource, `dayPlan` als Kommentar-/Dashboard-Typ und der fehlende Export `ContentImageUploadResponse` aus `@taskmanager/shared-types`. Dadurch wurden die ausstehenden Migrationen `0032_content_images` und `0033_day_plan_notes_comments` nicht angewendet. Der Dev-Start beendet sich nach dem API-Fehler wieder; API, Web und MCP waren nach dem Startversuch nicht erreichbar.

## Offene Punkte / Folgeaufgaben

API-TypeScript-Fehler beheben und danach `npm run db:migrate` sowie `npm run dev` erneut ausführen. Danach die Betriebsbereitschaft über `/api/health`, Web-Root und bei Bedarf MCP-Endpoint erneut prüfen.
