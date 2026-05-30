# Log: Katalog Colorpicker

**Datum:** 22.05.26  
**Schritt:** Fix — Katalog Colorpicker  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

In der Katalogverwaltung wurden die Farbsets aus der Anlegen- und Bearbeiten-Zeile entfernt. Der vorhandene `ColorPicker` bleibt als Eingabe erhalten, bekommt in diesem Kontext aber explizit keine Swatches mehr. Damit bleibt die Farbauswahl über den nativen Colorpicker möglich, ohne zusätzliche Preset-Kreise anzuzeigen. Andere Stellen, die den gemeinsamen Picker mit eigenen Farbsets verwenden, wurden bewusst nicht verändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/settings/CatalogManager.tsx` | geändert | Katalog-ColorPicker ohne Swatches gerendert |
| `logs/2026-05-22-fix-katalog-colorpicker.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
