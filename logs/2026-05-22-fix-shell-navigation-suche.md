# Log: Shell Navigation Suche

**Datum:** 22.05.26  
**Schritt:** Fix — Shell Navigation Suche  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die globale Desktop-Suchzeile wurde aus der sichtbaren Topbar herausgelöst und in die Sidebar direkt unter den Projekt-Manager-Header verschoben. Der KI-Agent-Button sitzt nun ebenfalls in der Sidebar unterhalb des Suchfelds. Suche und KI-Agent werden über einen zentralen Overlay-Host geöffnet, damit Shortcut, Sidebar und mobile Topbar denselben Dialogpfad nutzen. Der Serverstatus wurde im Einstellungsbereich direkt unter dem Navigationseintrag Administration ergänzt und nutzt weiterhin den vorhandenen Health-Check. Die Topbar bleibt nur noch für die mobile Navigation sichtbar, sodass die separate Desktop-Zeile entfällt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Suchfeld, KI-Agent-Button und Serverstatus in die Navigation aufgenommen |
| `apps/web/src/components/layout/TopBar.tsx` | geändert | Desktop-Inhalte entfernt und Topbar auf mobile Navigation reduziert |
| `apps/web/src/components/layout/ShellOverlays.tsx` | neu | Zentraler Host für globale Suche und KI-Agent-Panel |
| `apps/web/src/components/search/GlobalSearch.tsx` | geändert | Initialen Suchbegriff aus externem Suchstart unterstützt |
| `apps/web/src/App.tsx` | geändert | Zentralen Overlay-Host im App-Shell eingebunden |

## Probleme und Abweichungen

Der Browser-Pluginweg war in dieser Sitzung nicht als steuerbares Browser-Tool verfügbar; die lokale Sichtprüfung wurde deshalb durch `npm run typecheck -w apps/web` und `npm run build -w apps/web` ersetzt. Beide Kommandos waren erfolgreich. Der Build meldet nur eine Chunk-Größenwarnung von Vite.

## Offene Punkte / Folgeaufgaben

Keine.
