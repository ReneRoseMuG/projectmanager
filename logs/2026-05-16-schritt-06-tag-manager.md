# Log: TagManager

**Datum:** 16.05.26  
**Schritt:** 6 — TagManager  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Eine neue `/settings/tags`-Seite rendert den neuen TagManager. Der TagManager zeigt Magenta-Header, Add-Bar, Farbpalette, Suchfeld, Sortierung, Tabellenzeilen, Inline-Edit und Aktionen pro Tag. Tags können über die bestehenden Tag-API-Funktionen erstellt, bearbeitet und gelöscht werden. Die Sidebar enthält nun einen Einstellungen-Eintrag für Tags.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/tags/TagManager.tsx` | neu | Zentrale Tag-Verwaltung mit Add-Bar, Liste und Inline-Edit |
| `apps/web/src/pages/SettingsTagsPage.tsx` | neu | Page-Wrapper für `/settings/tags` |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Einstellungen-Navigation für Tags ergänzt |
| `apps/web/src/App.tsx` | geändert | Route `/settings/tags` ergänzt |

## Probleme und Abweichungen

Tag-Verwendungszahlen sind aktuell als 0 dargestellt, weil kein `useTagUsage`-Hook und keine Usage-API existieren. Der Merge-Button bleibt wie beauftragt ein Folgeauftrag-Stub.

## Offene Punkte / Folgeaufgaben

Eine echte Usage-Auswertung für Tags benötigt eine API- oder Hook-Erweiterung.
