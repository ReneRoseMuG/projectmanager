# Log: Meilenstein Übersicht Tabs

**Datum:** 25.05.26  
**Schritt:** Fix — Meilenstein Übersicht Tabs  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Tab-Reihenfolge in der Meilenstein-Detailansicht wurde angepasst, sodass `Features` direkt rechts neben `Tickets` steht. Der Feature-Tab nutzt nun die gemeinsame List-/Board-Oberfläche, damit er sich visuell an Aufgaben und Tickets anlehnt. Die Übersicht im Meilenstein-Dashboard heißt jetzt `Übersicht`. Die automatisch formulierten Dashboard-Untertitel wurden physisch aus dem Render-Pfad entfernt; es wird kein Text versteckt, gemutet oder als Platzhalter weitergeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | Tab-Reihenfolge angepasst und Feature-Tab auf gemeinsame Feature-Panel-Oberfläche umgestellt |
| `apps/web/src/components/features/ProjectFeaturePanel.tsx` | geändert | Sekundäraktion und optionale Entfernen-Aktion für verknüpfte Feature-Listen ergänzt |
| `apps/web/src/components/dashboard/DashboardView.tsx` | geändert | Übersichtstitel angepasst und Dashboard-Untertitel entfernt |

## Probleme und Abweichungen

Keine. Bestehende uncommitted Änderungen im Arbeitsbaum wurden nicht zurückgesetzt.

## Offene Punkte / Folgeaufgaben

Keine.
