# Log: Kalender Dashboard Widgets

**Datum:** 24.05.26  
**Schritt:** 2 — Kalender- und Nächste-Termine-Widgets implementieren  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Dashboard-Widgets `calendar` und `upcomingEvents` wurden in `DashboardWidgets.tsx` ergänzt. Beide Widgets umgehen den generischen Dashboard-Widget-Data-Endpunkt und nutzen stattdessen die vorhandenen Kalender-Hooks. Das Kalender-Widget liest Termine und Aufgaben nur bei vorhandenen `events:read`- bzw. `tasks:read`-Berechtigungen und rendert die Monatsansicht im kompakten Modus ohne Klick- oder Drag-Handler. Das Nächste-Termine-Widget liest Termine nur mit `events:read` und übergibt keinen Öffnen-Handler.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/dashboard/DashboardWidgets.tsx` | geändert | Read-only Kalender- und Nächste-Termine-Widgets ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Die Startseite enthält ihren alten Kalenderbereich noch bis zur geplanten Bereinigung in Schritt 4.
