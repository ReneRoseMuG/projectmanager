# Log: Feature-Projekt-Relation UI

**Datum:** 17.05.26  
**Schritt:** Feature — Feature-Projekt-Relation UI  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Use-Case-Liste auf der Feature-Detailseite öffnet Einträge jetzt per Doppelklick und weiterhin per Enter für Tastaturbedienung. Die Pflege der Relation zwischen Features und Projekten wurde featureseitig ergänzt: Feature-Formulare und die Feature-Detailseite haben einen Tab `Projekte`, über den bestehende Projekte hinzugefügt oder entfernt werden können. Der Projekt-Tab `Features` zeigt keine Checkbox-Auswahl mehr und hat keinen `Features speichern`-Button mehr. Stattdessen werden verknüpfte Features als Board oder Liste angezeigt. Feature-Bearbeitung im Projektkontext erfolgt über ein Overlay-Formular; Speichern oder Abbrechen schließt das Overlay.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/usecases/UseCaseList.tsx` | geändert | Doppelklick-/Enter-Handling für UC-Karten und Tabellenzeilen ergänzt |
| `apps/web/src/hooks/useDocLinks.ts` | geändert | Hook für Feature-zu-Projekt-Relation über bestehende Project-Feature-Endpunkte ergänzt |
| `apps/web/src/components/features/FeatureProjectLinksPanel.tsx` | neu | Projektverknüpfungen eines Features anzeigen, hinzufügen und entfernen |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Tab `Projekte` für bestehende Features ergänzt |
| `apps/web/src/components/features/ProjectFeaturePanel.tsx` | neu | Projekt-Features als Board oder Liste anzeigen |
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Tab `Projekte` eingebunden |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Checkbox-/Speichern-Flow durch Board/List plus Feature-Overlay ersetzt |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Es wurden keine neuen Backend-Endpunkte angelegt. Die Feature-zu-Projekt-Sicht wird im Frontend über die bestehenden `projects/:id/features`-Endpunkte abgeleitet. Der Vite-Build meldet weiterhin nur die bekannte Chunk-Size-Warnung.

## Offene Punkte / Folgeaufgaben

Keine.
