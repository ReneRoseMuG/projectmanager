# Log: Feature-Detail-Form

**Datum:** 16.05.26  
**Schritt:** 2 — FeatureDetail-Form  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Feature-Formular wurde in vier Form-Cards für Stammdaten, Status & Sortierung, Kurzbeschreibung und Inhalt zerlegt. Titel und Slug sind nun nebeneinander angeordnet, Pflichtfelder tragen einen Crimson-Stern, und der Slug nutzt eine Link-Icon-Hülle. Das frühere Status-Select wurde durch Segmented-Buttons mit den Studie-2-Tones ersetzt, während der bestehende `FeatureStatus`-State unverändert weiterverwendet wird. Die Footer-Actions zeigen den letzten Speicherzeitpunkt, einen Verwerfen-Button zum Zurücksetzen auf den aktuellen Feature-Stand und den bestehenden Speichern-Submit. Das Formular hat nun die `id="feature-detail-form"`, damit der Hero-Speichern-Button aus Schritt 1 das Formular sauber auslöst. `npm run lint -w apps/web` wurde nach dem Schritt erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/features/FeatureDetail.tsx` | geändert | Form-Cards, Segmented-Status, Feld-Chrome und Footer-Actions ergänzt |

## Probleme und Abweichungen

`Designstudie-2/Feature.html` ist lokal nicht verfügbar, daher konnte kein Browservergleich mit dem Feature-Mockup stattfinden. Die Löschaktion liegt jetzt im Feature-Hero der Seite; das Inline-Formular selbst enthält nur Verwerfen und Speichern, damit keine doppelte Löschaktion im selben View entsteht.

## Offene Punkte / Folgeaufgaben

Visuellen Abgleich nachholen, sobald die Referenzdatei vorhanden ist.
