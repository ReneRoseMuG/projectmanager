# Log: Project-Detail-Hero

**Datum:** 17.05.26  
**Schritt:** Fix — Project-Detail-Hero nach Mockup  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Projekt-Detailseite wurde an `Designstudie-2/Projekt.html` angeglichen. Der einfache Seitenkopf wurde durch einen großen Steelblue/Violet-Hero mit Breadcrumbs, Projektname, Beschreibung, Statistiken und Header-Actions ersetzt. Die Projekt-Tabs sitzen nun in einer eigenen Tool-Row und zeigen Counter für Aufgaben, Features, Backlog, Notizen, Dateien und Import. Die tababhängige Primäraktion bleibt mit den bestehenden Datenflüssen verbunden und der bestehende Import-Tab wurde nicht zurückgedreht.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Projekt-Hero, Statistikzeile, Tab-Counter und Tool-Row ergänzt |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Der Root-Lint schlägt aktuell in bereits offenen API-Import-Dateien fehl (`apps/api/src/services/wiki-import.service.ts`: ungenutzter Import und Hook-Namensregel). Der Web-Lint und der Web-Build für diesen UI-Fix laufen grün. Das Projekt-Mockup enthält eine Release-Statistik; da das aktuelle Projektmodell kein Release-/Due-Date-Feld besitzt, zeigt die App stattdessen `Aktualisiert` mit `project.updatedAt`.

## Offene Punkte / Folgeaufgaben

Die API-Lintfehler im Wiki-Import-Code müssen separat bereinigt werden, damit `npm run lint` rootweit wieder grün läuft.
