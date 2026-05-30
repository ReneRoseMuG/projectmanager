# Log: Einheitliche Badge-Darstellung

**Datum:** 23.05.26  
**Schritt:** Fix — Einheitliche Badge-Darstellung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Status-, Prioritäts-, Tag- und Parent-Darstellungen wurden auf eine gemeinsame Badge-Geometrie vereinheitlicht. `StatusPill` rendert Statuswerte nun über `Badge` im `filled`-Modus, sodass Status und Priorität dieselbe Höhe und Grundform haben. Die verbliebene `Pill`-Komponente wurde als Kompatibilitätslabel ebenfalls auf dieselbe Mindesthöhe, denselben Radius, dieselben Abstände und dieselbe Grundtypografie gebracht. Die visuelle Designrichtlinie wurde im Badge-/Pill-Abschnitt angepasst, damit die einheitliche Regel dokumentiert ist. API, Rollen, Berechtigungen, Datenmodell, Migrationen und Query-State wurden nicht verändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/StatusPill.tsx` | geändert | Statuswerte verwenden jetzt `Badge filled` statt separater Pill-Geometrie |
| `apps/web/src/components/ui/Pill.tsx` | geändert | Kompatibilitätslabel auf Badge-Geometrie vereinheitlicht |
| `docs/design-richtlinien-visuell.md` | geändert | Einheitsregel für Status, Priorität, Tags und Parent dokumentiert |
| `logs/2026-05-23-fix-einheitliche-badge-darstellung.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index um den neuen Fix ergänzt |

## Probleme und Abweichungen

Keine. Der Web-Build war erfolgreich; Vite meldete nur die bestehende Chunkgrößen-Warnung.

## Offene Punkte / Folgeaufgaben

Keine.
