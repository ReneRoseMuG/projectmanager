# Log: Features Projektfilter Position

**Datum:** 26.05.26  
**Schritt:** Fix — Features Projektfilter Position  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Features-Seite wurde an die Filterstruktur der Meilenstein-Seite angeglichen. In der Meilenstein-Vorlage liegt der Projektfilter in `MilestonesPage.tsx` als `filters={<ProjectMilestoneFilterBar ... />}` und wird in `MilestoneListBoardView.tsx` getrennt von den Status-Chips gerendert. Entsprechend nutzt die Features-Seite jetzt ebenfalls `ProjectMilestoneFilterBar` für den Projektfilter. Die Status-Chips bleiben in `toolbarFilters`, während der Projektfilter über `filters` in der separaten Filterzeile von `ListBoardView` landet. Zusätzlich werden Projekt-Lade- und Fehlerzustände wie bei der Meilenstein-Seite berücksichtigt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/FeaturesPage.tsx` | geändert | Projektfilter auf `ProjectMilestoneFilterBar` und `filters`-Position umgestellt |
| `apps/web/src/components/features/FeatureListBoardView.tsx` | geändert | `toolbarFilters` und `filters` getrennt an `ListBoardView` weitergereicht |
| `logs/2026-05-26-fix-features-projektfilter-position.md` | neu | Schritt-Log für die Positionskorrektur |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine. `npm run build -w apps/web` läuft erfolgreich durch; Vite meldet nur die bekannte Chunkgrößen-Warnung.

## Offene Punkte / Folgeaufgaben

Keine.
