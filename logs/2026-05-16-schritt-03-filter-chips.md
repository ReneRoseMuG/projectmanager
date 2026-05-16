# Log: Filter-Chips

**Datum:** 16.05.26  
**Schritt:** 3 — Filter-Chips und Suche auf Projekte/Features  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die neue UI-Komponente `FilterChips` stellt Statusfilter mit Zählern und einem Alle-Chip bereit. Die neue UI-Komponente `SearchInput` ergänzt ein kontrolliertes Suchfeld mit Icon und begrenzter Breite. Auf der Projektseite wird nun clientseitig nach Status, Name und Beschreibung gefiltert. Auf der Featureseite wird analog nach Status, Titel, Slug und Beschreibung gefiltert. Nach der Änderung wurde der Web-Build erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/FilterChips.tsx` | neu | Wiederverwendbare Filterchip-Leiste |
| `apps/web/src/components/ui/SearchInput.tsx` | neu | Kontrolliertes Suchfeld mit Icon |
| `apps/web/src/pages/ProjectsPage.tsx` | geändert | Statusfilter und Suche ergänzt |
| `apps/web/src/pages/FeaturesPage.tsx` | geändert | Statusfilter und Suche ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
