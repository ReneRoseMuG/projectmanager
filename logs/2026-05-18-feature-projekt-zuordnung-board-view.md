# Log: Feature-Projekt-Zuordnung Board View

**Datum:** 18.05.26  
**Schritt:** Feature — Feature-Projekt-Zuordnung Board View  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der Projekte-Tab im Feature-Detail verwendet nun eine Board/List-Oberfläche auf Basis von `ListBoardView` statt der bisherigen RelationPanel-Auswahl. Der Plus-Button öffnet ein Modal „Projekt hinzufügen“, in dem ein noch nicht verknüpftes Projekt ausgewählt wird; beim Absenden wird die vorhandene `addProjectToFeature`-Mutation genutzt und damit ein Eintrag in der Join-Tabelle erzeugt. Verknüpfte Projekte erscheinen als Karten und Listenzeilen mit Status, Tags und Aktualisierungsdatum. Jede Karte und jede Zeile bietet eine Aktion „Entfernen“, die die vorhandene `removeProjectFromFeature`-Mutation nutzt und die Relation wieder löst. Der bestehende E2E-Test für den alten Speichern-Flow wurde auf Hinzufügen, Reload-Prüfung und Entfernen angepasst. Ein neuer Komponententest sichert Board/List-Darstellung, Plus-Flow, Entfernen und die Abwesenheit des alten Checkbox-/Speichern-Flows ab.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/features/FeatureProjectPanel.tsx` | neu | Feature-Projekt-Board/List-Adapter mit Add-Modal und Entfernen-Aktionen |
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Projekte-Tab vom RelationPanel auf `FeatureProjectPanel` umgestellt |
| `apps/web/src/components/ui/__tests__/FeatureProjectPanel.test.tsx` | neu | UI-Tests für Board/List, Plus-Flow und Entfernen |
| `apps/web/e2e/feature.spec.ts` | geändert | E2E-Projektverknüpfung auf neuen Add/Remove-Flow aktualisiert |

## Probleme und Abweichungen

Die gezielte UI-Testdatei und ESLint für die geänderten Dateien laufen erfolgreich. Die globale Web-Typprüfung ist weiterhin blockiert durch bereits vorhandene Task-Typinkonsistenzen außerhalb dieser Änderung, insbesondere `TaskPositionInput` vs. `TaskBoardPositionInput` sowie fehlende `projectId`-Properties an `Task`/`TaskDetail`. Deshalb wird der Schritt nicht als vollständig kompiliert markiert.

## Offene Punkte / Folgeaufgaben

Die bestehenden Task-Shared-Type-Inkonsistenzen müssen in einem separaten Auftrag bereinigt werden, damit `npm run typecheck -w apps/web` wieder vollständig grün laufen kann.
