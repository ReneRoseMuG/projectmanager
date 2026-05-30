# Log: Dashboard Route Entfernen

**Datum:** 24.05.26  
**Schritt:** 5 — Dashboard-Seite entfernen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die separate Route `/dashboard` wurde aus dem React-Router entfernt. Der Sidebar-Navigationseintrag „Dashboard" wurde entfernt, sodass die Startseite die zentrale Dashboard-Übersicht übernimmt. Die redundante `DashboardPage.tsx` wurde gelöscht. Die eigentlichen Dashboard-Komponenten bleiben unverändert verfügbar und werden weiterhin von Startseite sowie Detailansichten genutzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/App.tsx` | geändert | `/dashboard`-Route und Import entfernt |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Dashboard-Navigationseintrag entfernt |
| `apps/web/src/pages/DashboardPage.tsx` | gelöscht | Redundante globale Dashboard-Seite entfernt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Tests mit direktem Bezug zu `/dashboard` oder `DashboardPage` müssen angepasst oder entfernt werden.
