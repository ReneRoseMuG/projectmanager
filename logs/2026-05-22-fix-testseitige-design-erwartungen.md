# Log: Testseitige Design-Erwartungen

**Datum:** 22.05.26  
**Schritt:** Fix — Testseitige Design-Erwartungen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Web-Unit-Tests wurden an die neue Design-Vereinheitlichung angepasst. Veraltete Erwartungen auf `rounded-2xl`, `rounded-xl`, `border-2 border-ink`, `text-slate-500` und weitere alte Designklassen wurden entfernt. Karten-Selektoren prüfen jetzt `ItemCard` über `article.p-5`; Zeilen-Selektoren prüfen `ItemRow` über `border-l-[4px]`, damit der gemeinsame Radius `rounded-lg` nicht Card- und Row-Varianten vermischt. Die `ViewToggle`-Erwartungen prüfen den neuen aktiven Zustand mit `border-steel-700`, `bg-steel-700` und `text-white`. Produktionscode wurde in diesem Schritt nicht geändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/unit/web/pages/LoginPage.test.tsx` | geändert | Untertitel-Farberwartung auf Steel-Token angepasst |
| `tests/unit/web/components/projects/ProjectForm.test.tsx` | geändert | ViewToggle-Erwartungen auf neuen aktiven Zustand angepasst |
| `tests/unit/web/components/ui/BacklogListBoardView.test.tsx` | geändert | Card-/Row-Selektoren von Radiusklassen auf Komponentenmerkmale umgestellt |
| `tests/unit/web/components/ui/DetailModal.test.tsx` | geändert | Negative Radius-Erwartungen auf neue Radius-Skala angepasst |
| `tests/unit/web/components/ui/FeatureListBoardView.test.tsx` | geändert | Card-/Row-Selektoren von Radiusklassen auf Komponentenmerkmale umgestellt |
| `tests/unit/web/components/ui/FeatureProjectPanel.test.tsx` | geändert | Row-Selektor von Radiusklasse auf Komponentenmerkmal umgestellt |
| `tests/unit/web/components/ui/FormModal.test.tsx` | geändert | Negative Radius-Erwartungen auf neue Radius-Skala angepasst |
| `tests/unit/web/components/ui/ListBoardView.test.tsx` | geändert | ItemCard- und ViewToggle-Erwartungen aktualisiert |
| `tests/unit/web/components/ui/MilestoneListBoardView.test.tsx` | geändert | Card-/Row-Selektoren von Radiusklassen auf Komponentenmerkmale umgestellt |
| `tests/unit/web/components/ui/ProjectFeaturePanel.test.tsx` | geändert | Card-/Row-Selektoren von Radiusklassen auf Komponentenmerkmale umgestellt |
| `tests/unit/web/components/ui/ProjectListBoardView.test.tsx` | geändert | Card-/Row-Selektoren von Radiusklassen auf Komponentenmerkmale umgestellt |
| `tests/unit/web/components/ui/Section.test.tsx` | geändert | Section-Radius-Erwartung auf `rounded-lg` angepasst |
| `tests/unit/web/components/ui/TaskListBoardView.test.tsx` | geändert | Card-/Row-Selektoren von Radiusklassen auf Komponentenmerkmale umgestellt |
| `tests/unit/web/components/ui/TicketListBoardView.test.tsx` | geändert | Card-/Row-Selektoren von Radiusklassen auf Komponentenmerkmale umgestellt |
| `tests/unit/web/components/ui/UseCaseListBoardView.test.tsx` | geändert | Card-/Row-Selektoren von Radiusklassen auf Komponentenmerkmale umgestellt |
| `logs/2026-05-22-fix-testseitige-design-erwartungen.md` | neu | Schritt-Log für die testseitigen Anpassungen |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der vollständige Web-Unit-Lauf bleibt rot: `npm run test -w apps/web` meldet 389 grüne und 4 rote Tests. Die verbleibenden roten Tests liegen in `LoginPage.test.tsx` und `SetupPasswordPage.test.tsx`; sie schlagen fehl, weil die sichtbaren Labels nicht mit den jeweiligen Inputs verknüpft sind. Das ist ein Produktionscode-/Accessibility-Befund und wurde in diesem testseitigen Folgeauftrag nicht geändert.

## Offene Punkte / Folgeaufgaben

- Produktionsseitig die Label/Input-Verknüpfung in Login- und Setup-Passwort-Formularen korrigieren.
- Danach `npm run test -w apps/web` erneut ausführen.
