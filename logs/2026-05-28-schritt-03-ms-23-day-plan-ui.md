# Log: MS-23 DayPlan UI

**Datum:** 28.05.26  
**Schritt:** 3 — DashboardPicker, noteList-Widget und DayPlanPage  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der DashboardPicker ist jetzt dauerhaft sichtbar, speichert Auswahl und Detailzustand im `localStorage` und bietet mit Schreibrecht Standard-Stern, Bearbeiten und neue Ansicht. Das `noteList`-Widget rendert DayPlan-Notizen read-only mit Vorschau und Leerzustand. `/day-plan` wurde zur Seite „Persönliche Planung“ ohne Datumsnavigation, Status-Toggle oder Textarea umgebaut. Die Seite lädt intern den heutigen Plan und bietet fünf Tabs in der Reihenfolge Übersicht, Aufgaben, Notizen, Kommentare, Journal.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/dashboard/DashboardPicker.tsx` | ersetzt | Dauerhafte Ansichtsauswahl mit Aktionen und Persistenz |
| `apps/web/src/components/dashboard/DashboardView.tsx` | geändert | Picker immer oberhalb des Grids, Builder-Integration angepasst |
| `apps/web/src/components/dashboard/DashboardWidgets.tsx` | geändert | `noteList` und DayPlan-Eventfilter ergänzt |
| `apps/web/src/components/dashboard/widgetRegistry.tsx` | geändert | `noteList` und Kontextlabel ergänzt |
| `apps/web/src/pages/DayPlanPage.tsx` | ersetzt | Persönliche Planung mit fünf Tabs umgesetzt |
| `apps/web/src/components/notes/*.tsx` | geändert | Notizliste kann Create/Delete-Aktionen rollenabhängig ausblenden |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Label auf „Persönliche Planung“ umgestellt |
| `apps/web/src/components/calendar/WeekCalendar.tsx` | geändert | DayPlan-Kontextlabel umgestellt |
| `apps/web/src/components/journal/JournalPanel.tsx` | geändert | Journal-Label umgestellt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
