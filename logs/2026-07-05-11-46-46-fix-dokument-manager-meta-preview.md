# Log: Dokument-Manager Meta und Preview

**Datum:** 05.07.26  
**Uhrzeit:** 11:46:46  
**Schritt:** Fix — Dokument-Manager Meta und Preview  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Dokumentliste zeigt Dateititel jetzt ohne die letzte Dateiendung an. Die Metadaten pro Zeile wurden auf Datei-Typ-Pill und Dateigröße reduziert, sodass das bisher doppelte Typ-Label entfällt. Für Pill, Größe und Aktionen wurden feste Breiten gesetzt, damit die Angaben in den Dokumentzeilen ein einheitliches Raster bilden. Die Hover-Vorschau wird nun anhand der letzten Mausposition links oberhalb des Mauszeigers positioniert und weicht bei Platzmangel links unter den Mauszeiger aus. Zusätzlich werden Breite und Höhe der Vorschau an den sichtbaren Viewport geklemmt, damit das Popup nicht aus dem Bild springt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | Dateititel ohne Endung, Metaspalte nur mit Typ-Pill und Größe sowie feste Row-Spalten |
| `apps/web/src/components/attachments/DocumentHoverPreview.tsx` | geändert | Hover-Preview relativ zur Mausposition mit Viewport-Klemmung |
| `logs/2026-07-05-11-46-46-fix-dokument-manager-meta-preview.md` | neu | Schritt-Log |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Die referenzierte Skill-Datei `projekt-manager-planungsleitplanken/references/ui-guidelines.md` war lokal nicht vorhanden; deshalb wurde der verbindliche `docs/design-leitfaden.md` gezielt für Row-, Badge- und Hover-Regeln genutzt. Der vollständige Web-Lint `npm run lint -w apps/web` schlägt weiterhin in unberührten Bestandsdateien fehl (`FeatureForm.tsx`, `MilestoneForm.tsx`, `ProjectForm.tsx`, `TagManager.tsx`, `TaskForm.tsx`, `CommentBodyModal.tsx`, `UseCaseForm.tsx`, `richTextExport.ts`). Der gezielte Lint der geänderten Dateien war grün.

## Offene Punkte / Folgeaufgaben

Die bestehenden globalen Web-Lint-Fehler sollten separat bereinigt werden, falls der vollständige Lint wieder als Abnahmekriterium dienen soll.

## Testleitplanken und Verifikation

Der Testentwurfs-Skill wurde angewendet. Testebene: Frontend-Typecheck und statischer Lint ohne echte DB, ohne echte Dateien und ohne Mocks. Bewiesenes Verhalten: Die geänderten TSX-Komponenten sind typkorrekt und verletzen keine ESLint-Regeln in den betroffenen Dateien.

- `npm run typecheck -w apps/web` — grün
- `npx eslint src/pages/DocumentsPage.tsx src/components/attachments/DocumentHoverPreview.tsx` in `apps/web` — grün
- `npm run lint -w apps/web` — blockiert durch vorhandene Fehler in unberührten Dateien
