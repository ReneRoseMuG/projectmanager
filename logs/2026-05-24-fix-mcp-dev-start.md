# Log: MCP Dev Start

**Datum:** 24.05.26  
**Schritt:** Fix — MCP Dev Start  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Start-Wrapper für `npm run dev` wurde so angepasst, dass die geplanten API-, Web-, MCP- und Tunnel-Kommandos nicht mehr über `npx concurrently` mit `shell: true` und separater Argumentliste gestartet werden. Stattdessen startet `start-project-manager.ts` die bereits erzeugten Kommandos selbst als Shell-Command-Strings, prefixiert stdout/stderr mit dem jeweiligen Prozessnamen und beendet andere laufende Prozesse, wenn ein Kommando fehlschlägt. Dadurch werden die npm-Kommandos unter Windows nicht mehr in einzelne Tokens wie `run` und `dev` zerlegt. Gleichzeitig wird der Node-24-Warnpfad `DEP0190` vermieden; durch den Verzicht auf `concurrently` im Wrapper tritt auch die dort beobachtete `DEP0060`-Warnung nicht mehr in diesem Startpfad auf.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/mcp-server/src/start-project-manager.ts` | geändert | Startet geplante Kommandos direkt, prefixiert Ausgaben und beendet andere Prozesse bei Fehlern |
| `logs/2026-05-24-fix-mcp-dev-start.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index um den Fix ergänzt |

## Probleme und Abweichungen

Ein erster Ansatz mit direktem `npx.cmd` ohne Shell war unter Windows/Node 24 nicht lauffähig. Ein zweiter Ansatz über die programmatic API von `concurrently` hätte zwar die Argumentzerlegung behoben, ließ aber die `DEP0060`-Warnung bestehen. Deshalb wurde der Fix innerhalb des vorhandenen Start-Wrappers umgesetzt, ohne eine neue Paketabhängigkeit einzuführen.

Verifikation: `npm run build -w apps/mcp-server` lief erfolgreich. Zusätzlich wurde der gebaute Wrapper mit absichtlich reduziertem `PATH` ausgeführt; die beiden Kindprozesse schlugen erwartungsgemäß wegen fehlendem `npm` fehl, wurden aber korrekt mit `[API]` und `[WEB]` prefixiert und der Wrapper gab Exitcode 1 zurück, ohne `DEP0190` oder `DEP0060` auszugeben.

## Offene Punkte / Folgeaufgaben

Keine.
