# Log: Startnavigation und Tagesplan-Breite

**Datum:** 28.05.26  
**Schritt:** Fix — Startnavigation und Tagesplan-Breite  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Navigationspunkte „Kalender“ und „Tagesplan“ wurden in der bestehenden Sidebar-Konfiguration aus der Gruppe „Information“ in die Gruppe „Start“ verschoben. Die vorhandenen Permission-Regeln der einzelnen Navigationseinträge bleiben unverändert, sodass sich nur die Gruppierung ändert. Auf der Tagesplan-Seite wurde der zentrierte Maximalbreiten-Wrapper entfernt, damit die Seite die verfügbare Inhaltsbreite nutzt und auf breiten Viewports links und rechts weniger ungenutzter Raum entsteht. API, Datenmodell, Routen und Berechtigungen wurden nicht geändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Kalender und Tagesplan in die Navigationsgruppe „Start“ verschoben |
| `apps/web/src/pages/DayPlanPage.tsx` | geändert | Maximalbreite und Zentrierung des Tagesplan-Inhalts entfernt |
| `logs/2026-05-28-fix-startnavigation-tagesplan-breite.md` | neu | Schritt-Log zum Fix |
| `logs/README.md` | geändert | Log-Index um diesen Fix ergänzt |

## Probleme und Abweichungen

Keine funktionalen Abweichungen. Der Web-Build meldet weiterhin eine Vite-Warnung zu großen Chunks; der Build ist erfolgreich und die Warnung ist nicht durch diesen Fix verursacht. Eine zusätzliche Browser-Prüfung konnte nicht durchgeführt werden, weil die Browser-Steuerung in dieser Sitzung nicht verfügbar war.

## Offene Punkte / Folgeaufgaben

Keine.
