# Log: Domain Feature

**Datum:** 17.05.26  
**Schritt:** 10 — Domain: Feature  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Feature-Domäne wurde auf die neue Design-System-Basis migriert. `FeatureCard` verwendet jetzt `ItemCard` mit Accent-Bar, Icon-Header, Status-Pill, icon-only Aktionen und Doppelklick-Navigation zur Feature-Detailseite. Die Feature-Übersicht nutzt `FeatureListBoardView` auf Basis von `ListBoardView` mit Statusspalten für Entwurf, Aktiv, Erledigt und Archiviert. `FeatureForm` wurde auf `FormModal`, `Section`, `FormField`, `Input`, `SegmentedControl` und `RichTextEditor` umgestellt. Die alte `FeatureList` wurde entfernt. Die geforderte Feature-E2E-Datei wurde angelegt, die Fälle bleiben wegen der vom Nutzer gewünschten späteren E2E-Klärung vorerst geskippt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/features/FeatureCard.tsx` | geändert | Feature-Karte auf `ItemCard` umgestellt |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Formular auf `FormModal` und RTF-Editoren umgestellt |
| `apps/web/src/components/features/FeatureListBoardView.tsx` | neu | Feature-Adapter für `ListBoardView` mit Statusspalten |
| `apps/web/src/components/features/FeatureList.tsx` | gelöscht | Durch `FeatureListBoardView` ersetzt |
| `apps/web/src/pages/FeaturesPage.tsx` | geändert | Übersicht auf `FeatureListBoardView` umgestellt |
| `apps/web/e2e/feature.spec.ts` | neu | Feature-CRUD-E2E-Suite als geskipptes Gerüst |
| `logs/2026-05-17-schritt-10-domain-feature.md` | neu | Schritt-Log für Schritt 10 |
| `logs/README.md` | geändert | Log-Index um Schritt 10 ergänzt |

## Probleme und Abweichungen

Die Feature-Detailseite hat bereits Projekte und Use Cases als Tabs; Kommentare, Dateien und Aufgaben werden im späteren Rollout/Cleanup nicht als neue funktionslose Platzhalter verdrahtet. Die E2E-Fälle sind bewusst `skip`, weil rote E2E-Flows laut Nutzer danach geklärt werden sollen.

## Offene Punkte / Folgeaufgaben

Feature-E2E-Flows nach Abschluss des Gesamtauftrags aktivieren und stabilisieren.

## Test-Ergebnis

| Kommando | Ergebnis |
|---|---|
| `npm run typecheck -w apps/web` | ✅ Erfolgreich |
