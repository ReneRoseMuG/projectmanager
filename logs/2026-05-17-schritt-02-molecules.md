# Log: Moleküle

**Datum:** 17.05.26  
**Schritt:** 2 — Moleküle: SegmentedControl, RadioList, SectionHeader, ProgressBar  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Molekül-Komponenten `SegmentedControl`, `RadioList`, `SectionHeader`, `ProgressBar` und `ColorPicker` wurden unter `apps/web/src/components/ui/` angelegt. `FeatureDetail` nutzt für die Statusauswahl nun `SegmentedControl`. `TaskDetail` und `ProjectForm` nutzen für Status- und Prioritätsauswahlen `RadioList`; die Farbklassen sind dabei statisch gemappt, damit Tailwind sie zuverlässig generiert. `ProjectCard` und `TaskDetail` nutzen für Fortschrittsanzeigen `ProgressBar`. `ProjectForm` nutzt für die Farbauswahl `ColorPicker`. Zusätzlich wurden mehrere inline `<h3>`-Überschriften in den betroffenen Bereichen auf `SectionHeader` umgestellt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/SegmentedControl.tsx` | neu | Generische Segment-Auswahl (28 Zeilen) |
| `apps/web/src/components/ui/RadioList.tsx` | neu | Generische Radio-Liste mit Check-Icon (52 Zeilen) |
| `apps/web/src/components/ui/SectionHeader.tsx` | neu | Einheitlicher Section-Header mit Actions-Slot (19 Zeilen) |
| `apps/web/src/components/ui/ProgressBar.tsx` | neu | Fortschrittsbalken mit optionalem Label (29 Zeilen) |
| `apps/web/src/components/ui/ColorPicker.tsx` | neu | Farbauswahl mit Swatches und Custom-Color (31 Zeilen) |
| `apps/web/src/components/features/FeatureDetail.tsx` | geändert | Inline-Statusauswahl durch `SegmentedControl`, FormCard-Header durch `SectionHeader` ersetzt |
| `apps/web/src/components/tasks/TaskDetail.tsx` | geändert | Status/Priorität auf `RadioList`, Fortschritt auf `ProgressBar`, Überschriften auf `SectionHeader` umgestellt |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Statusauswahl auf `RadioList`, Farbauswahl auf `ColorPicker`, Überschriften auf `SectionHeader` umgestellt |
| `apps/web/src/components/projects/ProjectCard.tsx` | geändert | Inline-Fortschrittsbalken durch `ProgressBar` ersetzt |
| `logs/2026-05-17-schritt-02-molecules.md` | neu | Schritt-Log für Schritt 2 |
| `logs/README.md` | geändert | Log-Index um Schritt 2 ergänzt |

## Probleme und Abweichungen

`RadioList` unterstützt weiterhin nur die im Auftrag genannten Farben `fern`, `tangerine`, `crimson` und `violet`. Für bisherige Statuswerte mit Steel- oder Mustard-Anmutung wurden die nächstliegenden erlaubten Farben verwendet. Es wurden keine neuen Tests angelegt, da Schritt 2 keine eigene Test-Suite vorgibt.

## Offene Punkte / Folgeaufgaben

Keine.

## Test-Ergebnis

| Kommando | Ergebnis |
|---|---|
| `npm run typecheck -w apps/web` | ✅ Erfolgreich |
| `npm run build -w apps/web` | ✅ Erfolgreich, mit bestehender Vite-Warnung zu großen Chunks |
