# Log: Dashboard Editor Toggle

**Datum:** 24.05.26  
**Schritt:** 7 — Dashboard-Editor als Toggle statt permanenter Toolbar  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Dashboard-Bearbeitungsleiste wurde in `DashboardView` durch eine kompakte Kopfzeile mit dauerhaft sichtbarem Dashboard-Picker und einem kleinen Toggle-Button ersetzt. Der Toggle ist nur für Nutzer mit `dashboards:write` sichtbar. Erst nach dem Öffnen erscheinen die Aktionen „Neues Dashboard" und „Bearbeiten" in einem kompakten Panel. Der bestehende `DashboardBuilder`-Dialog und seine Create-, Update-, Delete- und Default-Funktionen bleiben unverändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/dashboard/DashboardView.tsx` | geändert | Permanente Toolbar durch Editor-Toggle und Panel ersetzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Die Toggle-Bedienung wird im Web-Testschritt abgesichert.
