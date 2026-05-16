# Log: Feature- und UseCase-Form-Modals

**Datum:** 16.05.26  
**Schritt:** 6 — FeatureForm-Modal und UseCaseForm-Modal  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

`FeatureForm` und `UseCaseForm` wurden auf dieselbe Studie-2-Formstruktur wie die Inline-Details umgestellt. Beide Modals nutzen weiterhin `size="xl"` und behalten ihre bestehenden Submit- und Close-Flows. Die Felder sind nun in Sub-Cards für Stammdaten, Status & Sortierung, Kurzbeschreibung und Inhalt gegliedert. Status wird als Segmented-Control dargestellt, Pflichtfelder tragen Crimson-Sterne, Slug-Felder haben ein Link-Icon und neue Form-Chrome-Klassen. Der Footer trennt Abbrechen und Speichern klar unterhalb der Form-Cards. `npm run lint -w apps/web` wurde nach dem Schritt erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Modal-Form-Cards, Segmented-Status und Footer-Actions ergänzt |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Modal-Form-Cards, Segmented-Status und Footer-Actions ergänzt |

## Probleme und Abweichungen

`Designstudie-2/Feature.html` ist lokal nicht verfügbar, daher konnte kein Browservergleich mit dem Feature-Mockup stattfinden.

## Offene Punkte / Folgeaufgaben

Visuellen Abgleich nachholen, sobald die Referenzdatei vorhanden ist.
