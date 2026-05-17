# Log: Import-Tab Position

**Datum:** 16.05.26  
**Schritt:** Fix — Import-Tab Position  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Import-Tab in der Projektdetailseite wurde an das Ende der Tab-Leiste verschoben. Damit steht **Import** jetzt ganz rechts nach **Dateien**. Die Import-Komponente, die API-Anbindung und die Importlogik wurden nicht verändert, weil der Auftrag nur die Position des Tabs betraf.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Reihenfolge der Projektdetail-Tabs angepasst |

## Probleme und Abweichungen

Der Web-Build ist erfolgreich. Die bestehende Vite-Warnung zu Chunks über 500 kB bleibt unverändert und liegt außerhalb dieses Fixes.

## Offene Punkte / Folgeaufgaben

Ein echter Folderbrowser wäre ein eigener Folgeauftrag, weil der aktuelle Import einen serverseitig lesbaren Ordnerpfad erwartet und Browser keinen absoluten lokalen Ordnerpfad an die Web-App weitergeben.
