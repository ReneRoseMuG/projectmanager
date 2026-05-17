# Log: Domain Use Case & Backlog

**Datum:** 17.05.26  
**Schritt:** 12 — Domain: Use Case & Backlog  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Use Cases und Backlog wurden auf die gemeinsamen Design-System-Bausteine migriert. Use Cases verwenden nun `UseCaseCard` auf Basis von `ItemCard` und `ItemRow`; die alte `UseCaseList` wurde durch `UseCaseListBoardView` auf Basis von `ListBoardView` ersetzt. `UseCaseForm` nutzt `FormModal`, `Section`, `FormField`, `Input`, `Select`, `SegmentedControl` und `RichTextEditor`. Backlog-Items werden über `BacklogListBoardView` dargestellt, mit `ItemRow` in der Listenansicht und `ItemCard` in der Board/Grid-Ansicht. `BacklogItemForm` wurde auf `FormModal` und `RichTextEditor` umgestellt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/usecases/UseCaseCard.tsx` | neu | Use-Case-Karte und -Zeile auf `ItemCard`/`ItemRow` |
| `apps/web/src/components/usecases/UseCaseListBoardView.tsx` | neu | Use-Case-Adapter für `ListBoardView` ohne Status-Gruppierung |
| `apps/web/src/components/usecases/UseCaseList.tsx` | gelöscht | Durch `UseCaseListBoardView` ersetzt |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Formular auf `FormModal`, Feature-Auswahl und RTF umgestellt |
| `apps/web/src/components/backlog/BacklogListBoardView.tsx` | neu | Backlog-Adapter für `ListBoardView` mit `ItemRow`/`ItemCard` |
| `apps/web/src/components/backlog/BacklogList.tsx` | gelöscht | Durch `BacklogListBoardView` ersetzt |
| `apps/web/src/components/backlog/BacklogItemForm.tsx` | geändert | Formular auf `FormModal`, SegmentedControls und RTF umgestellt |
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Use-Case-Tab auf `UseCaseListBoardView` umgestellt |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Backlog-Tab auf `BacklogListBoardView` umgestellt |
| `logs/2026-05-17-schritt-12-domain-uc-backlog.md` | neu | Schritt-Log für Schritt 12 |
| `logs/README.md` | geändert | Log-Index um Schritt 12 ergänzt |

## Probleme und Abweichungen

Die Feature-Auswahl im Use-Case-Formular ist sichtbar, kann aber den Feature-Kontext noch nicht umhängen, weil die bestehende API Use Cases über die Route `features/:featureId/use-cases` anlegt und `UseCaseInput` kein `featureId` enthält. Der Aufgaben-Relationstab im Use-Case-Detail ist nicht als funktionsloser Platzhalter umgesetzt, da es aktuell keinen API-/Hook-Vertrag zum Laden und Speichern von Tasks pro Use Case gibt. Kommentarstränge für Backlog-Items folgen im dafür vorgesehenen Schritt 14.

## Offene Punkte / Folgeaufgaben

Falls Use Cases zwischen Features verschoben oder Aufgaben direkt im Use-Case-Detail verknüpft werden sollen, braucht das einen separaten API-Vertrag. Die roten E2E-Flows bleiben wie vereinbart für die nachgelagerte Klärung offen.

## Test-Ergebnis

| Kommando | Ergebnis |
|---|---|
| `npm run typecheck -w apps/web` | ✅ Erfolgreich |
