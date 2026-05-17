# Log: Project-Form Kürzel-Layout

**Datum:** 17.05.26  
**Schritt:** Fix — Project-Form Kürzel-Layout  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Im Formular für neue und bestehende Projekte wurde die sichtbare Pflichtfeld-Kennzeichnung am Feld `Projektname` entfernt. Die Validierung des Projektnamens bleibt unverändert bestehen. Zusätzlich wurden Projektname- und Kürzel-Feld mit `min-w-0` und `w-full` stabil an die Grid-Spalten gebunden. Dadurch kann das Kürzel-Feld nicht mehr rechts aus dem Container herauslaufen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Pflichtfeld-Stern entfernt und Feldbreiten stabilisiert |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
