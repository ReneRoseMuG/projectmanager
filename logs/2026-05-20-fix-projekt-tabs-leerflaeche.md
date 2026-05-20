# Log: Projekt-Tabs Leerfläche

**Datum:** 20.05.26  
**Schritt:** Fix — Projekt-Tabs Leerfläche  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die große undefinierte Fläche zwischen Projekt-Tab-Bar und aktivem Tab-Inhalt wurde im gemeinsamen `FormModal` behoben. Ursache war, dass der Formular-Body als CSS-Grid mit freier Höhe seine Auto-Zeilen gestreckt hat. Dadurch bekam die `TabBar` je nach aktivem Tab eine überhöhte weiße Grid-Zeile. Der Body richtet seine Grid-Zeilen jetzt mit `content-start` am oberen Rand aus. `ProjectForm`, `TabBar` und die fachlichen Tab-Inhalte blieben unverändert, weil die Ursache im gemeinsamen Layout-Container lag.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/FormModal.tsx` | geändert | Formular-Body richtet Grid-Zeilen oben aus, damit die Tab-Bar nicht gestreckt wird |
| `logs/2026-05-20-fix-projekt-tabs-leerflaeche.md` | neu | Schritt-Log zum Layout-Fix |
| `logs/README.md` | geändert | Log-Index um den neuen Fix ergänzt |

## Probleme und Abweichungen

Die Browser-Plugin-Verbindung war in dieser Sitzung nicht verfügbar, weil das benötigte Ausführungstool nicht geladen werden konnte. Die visuelle Prüfung wurde deshalb lokal mit Playwright gegen `http://localhost:5173/projects/1` durchgeführt.

## Offene Punkte / Folgeaufgaben

Keine.
