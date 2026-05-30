# Log: Dashboard Widget Zeilenhöhe

**Datum:** 25.05.26  
**Schritt:** Fix  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Dashboard-Widgets in derselben Grid-Zeile werden jetzt sichtbar gleich hoch gerendert. Dafür streckt das Dashboard-Grid seine Items auf die jeweilige Zeilenhöhe und jede Widget-Zelle erhält `h-full`. Die Widget-Shell selbst füllt diese Zellhöhe ebenfalls aus und nutzt eine Flex-Struktur, damit Header und Inhalt stabil innerhalb der Karte bleiben. Datenabruf, Widget-Reihenfolge, Dashboard-Konfiguration und Berechtigungen wurden nicht verändert.

Für die Teständerung wurden die Projekt-Manager-Testentwurfsleitplanken angewendet. Abgedeckte Testebene ist ein Web-Unit-Test mit bestehender Dashboard-Fixture in jsdom; es gibt keine DB- oder Dateisystemzugriffe.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/dashboard/DashboardGrid.tsx` | geändert | Grid-Zellen strecken und erhalten `h-full` |
| `apps/web/src/components/dashboard/DashboardWidgets.tsx` | geändert | Widget-Shell füllt die Zellhöhe als Flex-Container |
| `tests/unit/web/components/dashboard/DashboardGrid.test.tsx` | geändert | Layoutklasse für gestreckte Widget-Zellen abgesichert |
| `logs/2026-05-25-fix-dashboard-widget-zeilenhoehe.md` | neu | Schritt-Log für diesen Fix |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
