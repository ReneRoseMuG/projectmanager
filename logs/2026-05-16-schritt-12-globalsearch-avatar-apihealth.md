# Log: GlobalSearch, Avatar und API-Health

**Datum:** 16.05.26  
**Schritt:** 12 — GlobalSearch-Palette + TopBar-Anbindung + Avatar-Menu + API-Badge-Popover  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die TopBar öffnet nun per Suchfeld-Klick, `Ctrl K` und `open-global-search`-Event eine GlobalSearch-Palette. Die Palette durchsucht clientseitig Projekte, Aufgaben, Features, Projektnotizen, Wiki-Root-Seiten und Projektdateien über die bestehenden APIs. Der API-Badge ist klickbar und zeigt Status, Endpoint, Latenz und Refetch-Aktion im Popover. Das Avatar-Menü enthält Profil-/Settings-Einträge, Tags-Link, Theme- und Density-Auswahl sowie Help- und Logout-Stubs.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/search/GlobalSearch.tsx` | neu | Command-Palette mit Client-Suche |
| `apps/web/src/components/layout/AvatarMenu.tsx` | neu | Avatar-Popover |
| `apps/web/src/components/layout/ApiHealthPopover.tsx` | neu | API-Status-Popover |
| `apps/web/src/components/layout/TopBar.tsx` | geändert | Suche, API-Badge und Avatar-Menü verbunden |
| `apps/web/src/hooks/useHealthCheck.ts` | geändert | `refetch` für Popover ergänzt |

## Probleme und Abweichungen

Die Suche nutzt bestehende APIs und keinen neuen Index. Task-Resultate öffnen deshalb die Projektseite des Tasks; Notiz- und Datei-Resultate öffnen aktuell die Projektübersicht, weil es keine globalen Deep-Link-Routen für einzelne Notizen oder Dateien gibt.

## Offene Punkte / Folgeaufgaben

Ein serverseitiger Suchindex und Deep-Link-Routen für Notizen/Dateien bleiben Folgeaufgaben.
