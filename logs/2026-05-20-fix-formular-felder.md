# Log: Formularfelder

**Datum:** 20.05.26  
**Schritt:** Fix — Formularfelder und Details-Tab  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Details- beziehungsweise Stammdaten-Tab in den bestehenden Formularen gibt nun keinen Counter mehr aus, weil dieser Tab keine fachliche Sammlung repräsentiert. Die Zählerlogik der übrigen Relation-Tabs bleibt unverändert, sodass Meilensteine, Features, Aufgaben, Tickets und andere Sammlungen weiterhin ihre Werte anzeigen. Die gleiche Korrektur wurde für die Ticket-Detailansicht übernommen, damit dort kein `Details 0` erscheint. Das zentrale `RichTextInlineField` erhält im editierbaren Lesemodus einen sichtbaren Hintergrund, Border und dezente Feldwirkung. Der aktive Editorzustand nutzt denselben Feldcharakter mit klarem Fokusrahmen. Die Änderung ist zentral umgesetzt, damit alle bestehenden Beschreibungs- und Textbereiche konsistent erkennbar sind.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Details-Tab von der Counter-Logik ausgenommen |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Details-Tab von der Counter-Logik ausgenommen |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Details-Tab von der Counter-Logik ausgenommen |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | Stammdaten-Tab von der Counter-Logik ausgenommen |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Stammdaten-Tab von der Counter-Logik ausgenommen |
| `apps/web/src/components/tickets/TicketDetail.tsx` | geändert | Details-Tab ohne Counter in der Ticket-Detailansicht |
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | Editierbare Rich-Text-Flächen mit sichtbarem Feldhintergrund und Rahmen versehen |
| `apps/web/src/components/projects/__tests__/ProjectForm.test.tsx` | geändert | Regressionstest für Details-Tab ohne Counter ergänzt |
| `apps/web/src/components/features/__tests__/FeatureForm.test.tsx` | geändert | Regressionstest für Details-Tab ohne Counter ergänzt |
| `apps/web/src/components/tasks/__tests__/TaskForm.test.tsx` | geändert | Regressionstest für Details-Tab ohne Counter ergänzt |
| `apps/web/src/components/milestones/__tests__/MilestoneForm.test.tsx` | geändert | Regressionstest für Stammdaten-Tab ohne Counter ergänzt |
| `apps/web/src/components/usecases/__tests__/UseCaseForm.test.tsx` | geändert | Regressionstest für Stammdaten-Tab ohne Counter ergänzt |
| `apps/web/src/components/ui/__tests__/rich-text-inline-field.test.tsx` | geändert | Regressionstest für erkennbaren Textfeld-Stil ergänzt |
| `logs/2026-05-20-fix-formular-felder.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index um diesen Fix ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
