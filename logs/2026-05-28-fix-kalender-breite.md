# Log: Kalender-Breite

**Datum:** 28.05.26  
**Schritt:** Fix — Kalender-Breite  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Kalenderseite wurde analog zur Tagesplan-Seite auf die verfügbare Inhaltsbreite erweitert. Dafür wurde im Inhaltswrapper der Kalenderseite die zentrierte Maximalbreite entfernt. Kalenderlogik, Dashboard-Widget-Auswahl, Datenabfragen und Berechtigungsprüfung bleiben unverändert. Der Eingriff ist bewusst auf die Layout-Klassen der bestehenden Seite begrenzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/CalendarPage.tsx` | geändert | Maximalbreite und Zentrierung des Kalender-Inhalts entfernt |
| `logs/2026-05-28-fix-kalender-breite.md` | neu | Schritt-Log zum Fix |
| `logs/README.md` | geändert | Log-Index um diesen Fix ergänzt |

## Probleme und Abweichungen

Keine funktionalen Abweichungen. Der Web-Build meldet weiterhin eine Vite-Warnung zu großen Chunks; der Build ist erfolgreich und die Warnung ist nicht durch diesen Fix verursacht.

## Offene Punkte / Folgeaufgaben

Keine.
