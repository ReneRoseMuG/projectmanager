# Log: Copy Link Hero Icon

**Datum:** 23.05.26  
**Schritt:** Fix — Copy Link Hero Icon  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Hero-Variante des `CopyReferenceButton` wurde gezielt angepasst. Das Copy-Link-Icon verwendet im Detailpage-Hero nun `text-white` statt `text-white/80`, damit es dauerhaft weiß angezeigt wird. Die bestehende Button-Größe, Rundung, Hover-Fläche und Focus-Darstellung bleiben unverändert. Der Eingriff bleibt auf die zentrale UI-Komponente beschränkt, damit alle Detail-Hero-Nutzungen konsistent profitieren.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/CopyReferenceButton.tsx` | geändert | Hero-Icon-Farbe von halbtransparentem Weiß auf Weiß umgestellt |
| `logs/2026-05-23-fix-copy-link-hero-icon.md` | neu | Schritt-Log für den lokalen UI-Fix |
| `logs/README.md` | geändert | Log-Index um den neuen Fix ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
