# Log: Slug- & Icon-Bereinigung

**Datum:** 21.05.26  
**Schritt:** 3 — Slug- & Icon-Bereinigung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Große farbige Header-Icons wurden aus Projekt-/Meilenstein-, Feature- und Use-Case-Karten entfernt. `PlanningItemCard` rendert den Titelbereich nun ohne Avatar, und die Row-Variante verzichtet ebenfalls auf den Avatar als Statusindikator. Sichtbare Slug-Pfade wurden aus Feature- und Use-Case-Karten, RelationPanels und dem ProjectFeaturePanel entfernt. Suchlogik, Formular-Slugfelder, API-Payloads und Detailseiten-Hero-Bereiche blieben unverändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/PlanningItemCard.tsx` | geändert | Avatar aus Karten- und Row-Darstellung entfernt |
| `apps/web/src/components/features/FeatureCard.tsx` | geändert | Großes Icon-Badge und Slug-Anzeige entfernt |
| `apps/web/src/components/usecases/UseCaseCard.tsx` | geändert | Use-Case-Badge und Slug-Anzeigen entfernt |
| `apps/web/src/components/features/FeatureRelationPanel.tsx` | geändert | Feature-Slug-Anzeige entfernt |
| `apps/web/src/components/usecases/UseCaseRelationPanel.tsx` | geändert | Use-Case-Slug-Anzeige entfernt |
| `apps/web/src/components/features/ProjectFeaturePanel.tsx` | geändert | Feature-Pfad aus Board/ListView-Darstellung entfernt |

## Probleme und Abweichungen

`PlanningAvatar` wurde nicht als ungenutzter interner Helper stehen gelassen, damit keine toten Exporte oder Lint-Probleme entstehen. Das `icon`-Prop bleibt an der bestehenden Karten-Schnittstelle erhalten.

## Offene Punkte / Folgeaufgaben

Keine.
